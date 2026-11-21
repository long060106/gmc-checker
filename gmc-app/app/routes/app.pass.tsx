// Reinstatement Pass: $39 one time, 60 days. Charged through Shopify Billing (App Store rule 1.2.1).
// Copy rules: say what it unlocks, never that it improves the odds. Google alone decides.
// Refund: within 7 days, once per store, for the tool (never tied to the review outcome).
// Asking ends the pass at once; the money goes back manually from the Partner Dashboard (see SETUP.md §9).
import { useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { countRecentScans, getPass } from "../lib/pass.server";
import {
  FREE_ATTEMPTS,
  FREE_SCANS,
  FREE_WINDOW_DAYS,
  PASS_DAYS,
  PASS_PLAN,
  PASS_PRICE_USD,
  REFUND_DAYS,
  refundable,
  scansLeft,
} from "../lib/pass";

const DAY = 24 * 3600_000;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const [{ pass, testStore, priorRefunds }, recent] = await Promise.all([
    getPass(admin, session.shop),
    countRecentScans(session.shop),
  ]);
  // Shopify sends the merchant back here with ?charge_id=… after they approve or decline.
  const returned = new URL(request.url).searchParams.has("charge_id");
  const canRefund = refundable(pass, priorRefunds);
  return {
    pass,
    testStore,
    scansLeft: scansLeft(recent, pass),
    returned,
    canRefund,
    refundUsed: priorRefunds > 0, // the 7-day refund is once per store
    refundUntil: canRefund && pass.active ? new Date(Date.parse(pass.purchasedAt) + REFUND_DAYS * DAY).toISOString() : null,
  };
};

type ActionResult =
  | { intent: "buy"; error: string }
  | { intent: "refund"; ok: true; test: boolean }
  | { intent: "refund"; ok: false; error: string }
  | null;

export const action = async ({ request }: ActionFunctionArgs): Promise<ActionResult> => {
  const { session, admin, billing } = await authenticate.admin(request);
  const form = await request.formData();
  const { pass, testStore, priorRefunds } = await getPass(admin, session.shop);

  if (form.get("intent") === "refund") {
    if (!pass.active || !refundable(pass, priorRefunds)) {
      return {
        intent: "refund",
        ok: false,
        error: `The in-app refund is for the first ${REFUND_DAYS} days after buying, once per store. Nothing was changed.`,
      };
    }
    const reason = String(form.get("reason") ?? "").trim().slice(0, 500) || null;
    try {
      await prisma.refundRequest.create({
        data: { shop: session.shop, purchaseId: pass.purchaseId, test: pass.test, reason },
      });
    } catch (e) {
      // P2002 = this purchase already has a request (double click): same result for the merchant.
      if ((e as { code?: string }).code !== "P2002") {
        console.error("[refund] could not save request", e);
        return { intent: "refund", ok: false, error: "We couldn't record the request. Nothing was changed. Please try again." };
      }
    }
    // Shows up in the Render logs; `npm run refunds` lists everything still to refund.
    console.log(`[refund] requested shop=${session.shop} purchase=${pass.purchaseId} test=${pass.test}`);
    return { intent: "refund", ok: true, test: pass.test };
  }

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
    return { intent: "buy", error: "We couldn't start the purchase. Nothing was charged. Please try again in a few minutes." };
  }
  return null;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function Pass() {
  const { pass, testStore, scansLeft: left, returned, canRefund, refundUsed, refundUntil } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const busyIntent = nav.formData?.get("intent");
  const [reason, setReason] = useState("");

  const refunded = result?.intent === "refund" && result.ok ? result : null;

  return (
    <s-page heading={PASS_PLAN}>
      {result?.intent === "buy" ? (
        <s-banner tone="critical" heading="Purchase not started">
          <s-paragraph>{result.error}</s-paragraph>
        </s-banner>
      ) : null}
      {result?.intent === "refund" && !result.ok ? (
        <s-banner tone="critical" heading="Refund not requested">
          <s-paragraph>{result.error}</s-paragraph>
        </s-banner>
      ) : null}
      {refunded ? (
        <s-banner tone="success" heading="Refund requested. Your pass has ended.">
          <s-paragraph>
            {refunded.test
              ? "This was a test purchase on a development store, so there is no money to return."
              : `The $${PASS_PRICE_USD} will be refunded through Shopify, or removed from your Shopify bill if it hasn't been paid yet, within 3 business days. Your scans and review history stay.`}
          </s-paragraph>
        </s-banner>
      ) : null}

      {pass.active ? (
        <s-banner tone="success" heading={`Your pass is active until ${fmtDate(pass.expiresAt)}`}>
          <s-paragraph>
            Unlimited scans and a snapshot and review kit for every review request until then.
            {pass.test ? " (Test purchase on a development store: no money was charged.)" : ""}
          </s-paragraph>
        </s-banner>
      ) : returned && !refunded ? (
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
                <s-table-cell>
                  Pre-review snapshot and review kit: what changed, what is still flagged and where to fix it, earlier
                  requests
                </s-table-cell>
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
              <input type="hidden" name="intent" value="buy" />
              <s-button type="submit" variant="primary" {...(busy && busyIntent === "buy" ? { loading: true } : {})}>
                {`Get the pass for $${PASS_PRICE_USD}`}
              </s-button>
            </Form>
          ) : null}
          {!pass.active ? (
            <s-paragraph>
              <s-text color="subdued">
                {refundUsed
                  ? "This store has already used its refund, so a new pass can't be refunded."
                  : `${REFUND_DAYS}-day refund: if the pass isn't useful, ask for your money back on this page within ${REFUND_DAYS} days. One click, no questions needed.`}
              </s-text>
            </s-paragraph>
          ) : null}
          {testStore && !pass.active ? (
            <s-paragraph>
              <s-text color="subdued">Development store: this will be a test charge, no money moves.</s-text>
            </s-paragraph>
          ) : null}
        </s-stack>
      </s-section>

      {canRefund && refundUntil ? (
        <s-section heading="Changed your mind?">
          <Form method="post">
            <input type="hidden" name="intent" value="refund" />
            <input type="hidden" name="reason" value={reason} />
            <s-stack direction="block" gap="base">
              <s-paragraph>
                {`You can get a full refund until ${fmtDate(refundUntil)}. Your pass ends as soon as you ask; your scans and review history stay. The refund is for the tool, so it doesn't depend on what Google decides.`}
              </s-paragraph>
              <s-text-field
                label="What didn't work for you? (optional)"
                details="Helps us fix the app. Please don't include customer details."
                value={reason}
                onInput={(e) => setReason(e.currentTarget.value)}
                onChange={(e) => setReason(e.currentTarget.value)}
              ></s-text-field>
              <s-button type="submit" tone="critical" {...(busy && busyIntent === "refund" ? { loading: true } : {})}>
                {`Request a refund of $${PASS_PRICE_USD}`}
              </s-button>
            </s-stack>
          </Form>
        </s-section>
      ) : null}

      <s-section slot="aside" heading="What the pass doesn't do">
        <s-paragraph>
          It doesn&apos;t change how Google reviews your account or how long a review takes, and it can&apos;t promise
          reinstatement. Google alone decides. It gives you a careful check of Google&apos;s published website rules and a
          dated record of what you changed.
        </s-paragraph>
      </s-section>
      <s-section slot="aside" heading="Billing">
        <s-paragraph>
          {`Charged once through your Shopify bill, in USD. It doesn't renew. When it ends, the app goes back to the free limits and keeps all your history. Changed your mind? Ask for a refund on this page within ${REFUND_DAYS} days of buying (once per store).`}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
