// Reinstatement Pass: $39 one time, 60 days. Charged through Shopify Billing (App Store rule 1.2.1).
// Copy rules: say what it unlocks, never that it improves the odds. Google alone decides.
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { countRecentScans, getPass } from "../lib/pass.server";
import { FREE_ATTEMPTS, FREE_SCANS, FREE_WINDOW_DAYS, PASS_DAYS, PASS_PLAN, PASS_PRICE_USD, scansLeft } from "../lib/pass";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const [{ pass, testStore }, recent] = await Promise.all([getPass(admin), countRecentScans(session.shop)]);
  // Shopify sends the merchant back here with ?charge_id=… after they approve or decline.
  const returned = new URL(request.url).searchParams.has("charge_id");
  return { pass, testStore, scansLeft: scansLeft(recent, pass), returned };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin, billing } = await authenticate.admin(request);
  const { pass, testStore } = await getPass(admin);
  if (pass.active) return null; // already paid; don't charge twice
  const store = session.shop.replace(".myshopify.com", "");
  try {
    // On success this throws a redirect Response to Shopify's approval page; Shopify then returns the merchant here.
    await billing.request({
      plan: PASS_PLAN,
      isTest: testStore,
      returnUrl: `https://admin.shopify.com/store/${store}/apps/${process.env.SHOPIFY_API_KEY}/app/pass`,
    });
  } catch (e) {
    if (e instanceof Response) throw e; // the redirect, not an error
    // App Store rule 2.1.1: no error pages. Log the details, show a plain message.
    console.error("[pass] billing request failed", e, (e as { errorData?: unknown }).errorData);
    return { error: "We couldn't start the purchase. Nothing was charged. Please try again in a few minutes." };
  }
  return null;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function Pass() {
  const { pass, testStore, scansLeft: left, returned } = useLoaderData<typeof loader>();
  const failed = useActionData<typeof action>();
  const busy = useNavigation().state !== "idle";

  return (
    <s-page heading={PASS_PLAN}>
      {failed?.error ? (
        <s-banner tone="critical" heading="Purchase not started">
          <s-paragraph>{failed.error}</s-paragraph>
        </s-banner>
      ) : null}
      {pass.active ? (
        <s-banner tone="success" heading={`Your pass is active until ${fmtDate(pass.expiresAt)}`}>
          <s-paragraph>
            Unlimited scans and a snapshot for every review request until then.
            {pass.test ? " (Test purchase on a development store: no money was charged.)" : ""}
          </s-paragraph>
        </s-banner>
      ) : returned ? (
        <s-banner tone="warning" heading="No purchase was completed">
          <s-paragraph>If you approved the charge, reload this page in a minute. Otherwise nothing was charged.</s-paragraph>
        </s-banner>
      ) : null}

      <s-section heading={`$${PASS_PRICE_USD} once, for ${PASS_DAYS} days`}>
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Getting reinstated is usually a few rounds of fix, request a review, wait. The pass covers that whole stretch,
            with no subscription to remember to cancel.
          </s-paragraph>
          <s-table>
            <s-table-header-row>
              <s-table-header>&nbsp;</s-table-header>
              <s-table-header>Free</s-table-header>
              <s-table-header>Pass</s-table-header>
            </s-table-header-row>
            <s-table-body>
              <s-table-row>
                <s-table-cell>Every finding, with Google&apos;s rule and where to fix it in Shopify</s-table-cell>
                <s-table-cell>Yes</s-table-cell>
                <s-table-cell>Yes</s-table-cell>
              </s-table-row>
              <s-table-row>
                <s-table-cell>Store scans</s-table-cell>
                <s-table-cell>{`${FREE_SCANS} per ${FREE_WINDOW_DAYS} days`}</s-table-cell>
                <s-table-cell>Unlimited</s-table-cell>
              </s-table-row>
              <s-table-row>
                <s-table-cell>Pre-review snapshot: what changed since your last request</s-table-cell>
                <s-table-cell>{FREE_ATTEMPTS === 1 ? "First request" : `First ${FREE_ATTEMPTS} requests`}</s-table-cell>
                <s-table-cell>Every request</s-table-cell>
              </s-table-row>
              <s-table-row>
                <s-table-cell>History of your review requests and outcomes</s-table-cell>
                <s-table-cell>Yes</s-table-cell>
                <s-table-cell>Yes</s-table-cell>
              </s-table-row>
            </s-table-body>
          </s-table>
          {!pass.active && left !== null ? (
            <s-paragraph>
              <s-text color="subdued">{`You have ${left} free ${left === 1 ? "scan" : "scans"} left in the last ${FREE_WINDOW_DAYS} days.`}</s-text>
            </s-paragraph>
          ) : null}
          {!pass.active ? (
            <Form method="post">
              <s-button type="submit" variant="primary" {...(busy ? { loading: true } : {})}>
                {`Get the pass for $${PASS_PRICE_USD}`}
              </s-button>
            </Form>
          ) : null}
          {testStore && !pass.active ? (
            <s-paragraph>
              <s-text color="subdued">Development store: this will be a test charge, no money moves.</s-text>
            </s-paragraph>
          ) : null}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="What the pass doesn't do">
        <s-paragraph>
          It doesn't change how Google reviews your account or how long a review takes, and it can't promise
          reinstatement. Google alone decides. It gives you a careful check of Google&apos;s published website rules and a
          dated record of what you changed.
        </s-paragraph>
      </s-section>
      <s-section slot="aside" heading="Billing">
        <s-paragraph>
          Charged once through your Shopify bill, in USD. It doesn&apos;t renew. When it ends, the app goes back to the free
          limits and keeps all your history.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
