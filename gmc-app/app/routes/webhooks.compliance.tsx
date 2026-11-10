// Mandatory privacy compliance webhooks for public apps:
// https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
// Subscribed in shopify.app.toml (compliance_topics) at uri /webhooks/compliance.
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Verifies the HMAC; throws a 401 Response for requests that don't come from Shopify.
  const { shop, topic } = await authenticate.webhook(request);
  const t = String(topic).toUpperCase().replace(/\//g, "_"); // "shop/redact" or "SHOP_REDACT" → "SHOP_REDACT"
  console.log(`Received ${t} compliance webhook for ${shop}`);

  switch (t) {
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
      // This app requests no customer scopes and stores no customer data
      // (it reads only the public storefront), so there is nothing to return or erase.
      break;

    case "SHOP_REDACT": {
      // Sent 48 hours after uninstall: erase everything we hold for this shop.
      // Every delete is a deleteMany, so a repeated webhook or missing rows never throw.
      const profile = await db.shopProfile.findUnique({ where: { shop }, select: { shopKey: true } });
      await db.$transaction([
        db.session.deleteMany({ where: { shop } }),
        db.appScanDetail.deleteMany({ where: { shop } }),
        ...(profile?.shopKey
          ? [
              db.reviewAttempt.deleteMany({ where: { shopKey: profile.shopKey } }), // AttemptFix rows cascade
              db.scan.deleteMany({ where: { shopKey: profile.shopKey } }),
            ]
          : []),
        db.shopProfile.deleteMany({ where: { shop } }),
      ]);
      break;
    }

    default:
      // Unknown topic: acknowledge so Shopify doesn't retry forever.
      break;
  }

  return new Response(null, { status: 200 });
};
