// "Don't waste a review": right before the merchant asks Google for a review, re-scan and record
// exactly which checks went from flagged to passing since the baseline scan.
// This is a dated record of changes the merchant can paste into their request — not a prediction.
import { useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { parseResults, profileInput, scanShop } from "../lib/appscan.server";
import { diffScans } from "../engine/diff";
import { CHECK_INFO } from "../engine/run";

// Same labels as the public /scan page (Google's own headings on the Editorial and Misrepresentation pages).
const LABELS: Record<string, string> = {
  misrepresentation: "Misrepresentation",
  website_needs_improvement: "Website needs improvement",
  insufficient_contact_info: "Insufficient contact information",
  missing_return_policy: "Missing return and refund policy",
  site_inaccessible: "Site inaccessible",
  login_required: "Login required",
  cannot_complete_purchase: "Users cannot complete purchase",
  other: "Other / not sure",
};
const OUTCOME: Record<string, string> = { pending: "Waiting", reinstated: "Reinstated", rejected: "Rejected", unknown: "Unknown" };

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const title = (id: string) => CHECK_INFO[id]?.title ?? id;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const profile = await prisma.shopProfile.findUnique({ where: { shop: session.shop } });
  const attempts = profile?.shopKey
    ? await prisma.reviewAttempt.findMany({
        where: { shopKey: profile.shopKey },
        orderBy: { attemptNo: "desc" },
        select: { attemptNo: true, requestedAt: true, label: true, outcome: true },
      })
    : [];
  return {
    attempts: attempts.map((a) => ({ ...a, requestedAt: a.requestedAt.toISOString() })),
  };
};

type ActionResult =
  | { ok: false; error: string }
  | {
      ok: true;
      attemptNo: number;
      firstScan: boolean;
      comparable: boolean;
      baselineDate: string;
      fixed: string[];
      regressed: string[];
      stillFlagged: string[];
      summaryText: string;
    };

export const action = async ({ request }: ActionFunctionArgs): Promise<ActionResult> => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const label = String(form.get("label") ?? "");
  if (!(label in LABELS)) return { ok: false, error: "Choose the issue Merchant Center shows for your account." };
  const consent = form.get("consent") === "on";

  // 1. Fresh scan = the snapshot.
  const res = await scanShop(session.shop, await profileInput(session.shop));
  if (!res.ok) return { ok: false, error: res.error };
  const snapshot = res.scan;

  // 2. Baseline = the previous attempt's snapshot, else the earliest scan of this store (web or app).
  const previous = await prisma.reviewAttempt.findFirst({ where: { shopKey: res.shopKey }, orderBy: { attemptNo: "desc" } });
  const baseline =
    (previous?.snapshotScanId ? await prisma.scan.findUnique({ where: { id: previous.snapshotScanId } }) : null) ??
    (await prisma.scan.findFirst({ where: { shopKey: res.shopKey, id: { not: snapshot.id } }, orderBy: { createdAt: "asc" } })) ??
    snapshot;
  const firstScan = baseline.id === snapshot.id;

  // 3. Diff only when both scans used the same engine version — otherwise a "fix" could be a changed check.
  const comparable = !firstScan && baseline.engineVersion === snapshot.engineVersion;
  const snapStatuses = parseResults(snapshot);
  const d = comparable
    ? diffScans(parseResults(baseline), snapStatuses)
    : { fixed: [], regressed: [], stillFailing: Object.keys(snapStatuses).filter((k) => ["fail", "warn"].includes(snapStatuses[k])) };

  // 4. Record the attempt. Privacy choice: the attempt and its AttemptFix rows are always stored so the
  //    merchant sees their own history, but ONLY attempts with consentAt set may ever be used in shared
  //    stats/rankings. Any aggregate query must filter on `consentAt: { not: null }`.
  const attemptNo = (previous?.attemptNo ?? 0) + 1;
  const now = new Date();
  await prisma.reviewAttempt.create({
    data: {
      shopKey: res.shopKey,
      attemptNo,
      label,
      baselineScanId: baseline.id,
      snapshotScanId: snapshot.id,
      requestedAt: now,
      source: "in_app",
      consentAt: consent ? now : null,
      fixes: { create: d.fixed.map((checkId) => ({ checkId })) },
    },
  });
  await prisma.shopProfile.update({
    where: { shop: session.shop },
    data: { outcomeSharingConsentAt: consent ? now : null },
  });

  const lines = [
    `Changes made since ${fmtDate(baseline.createdAt)}:`,
    ...(d.fixed.length ? d.fixed.map((id) => `- ${title(id)}`) : ["- (none detected by the storefront check)"]),
  ];
  if (d.stillFailing.length) lines.push("", "Still flagged by the storefront check:", ...d.stillFailing.map((id) => `- ${title(id)}`));

  return {
    ok: true,
    attemptNo,
    firstScan,
    comparable,
    baselineDate: baseline.createdAt.toISOString(),
    fixed: d.fixed,
    regressed: d.regressed,
    stillFlagged: d.stillFailing,
    summaryText: lines.join("\n"),
  };
};

// ---------------------------------------------------------------- UI

export default function Snapshot() {
  const { attempts } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const nav = useNavigation();
  const shopify = useAppBridge();
  const [label, setLabel] = useState("");
  const [consent, setConsent] = useState(false);
  const busy = nav.state === "submitting";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      shopify.toast.show("Copied");
    } catch {
      shopify.toast.show("Select the text and copy it manually", { isError: true });
    }
  };

  return (
    <s-page heading="Before you request a review">
      <s-section heading="Take a snapshot right before you ask Google">
        <s-paragraph>
          Each unsuccessful review in Merchant Center can start a cool-down that grows with every attempt. This snapshot
          re-scans your store and lists exactly what changed since your first scan, so your request can say what you fixed.
          It is a record of changes, not a prediction: Google alone decides.
        </s-paragraph>
        <Form method="post">
          {/* Hidden inputs carry the values, so submission doesn't depend on web-component form support. */}
          <input type="hidden" name="label" value={label} />
          {consent ? <input type="hidden" name="consent" value="on" /> : null}
          <s-stack direction="block" gap="base">
            <s-select
              label="Issue shown in Merchant Center"
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
            >
              <s-option value="">Choose…</s-option>
              {Object.entries(LABELS).map(([value, text]) => (
                <s-option key={value} value={value}>
                  {text}
                </s-option>
              ))}
            </s-select>
            <s-checkbox
              label="Share my anonymized fixes and outcome to improve the rankings (no store address is shared)"
              checked={consent}
              onChange={(e) => setConsent(e.currentTarget.checked)}
            ></s-checkbox>
            <s-button type="submit" variant="primary" {...(busy ? { loading: true } : {})}>
              I&apos;m about to request a review
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      {result && !result.ok ? (
        <s-banner tone="critical" heading="Snapshot not taken">
          <s-paragraph>{result.error}</s-paragraph>
        </s-banner>
      ) : null}

      {result?.ok ? (
        <s-section heading={`Attempt ${result.attemptNo} recorded`}>
          <s-stack direction="block" gap="base">
            {result.firstScan ? (
              <s-banner tone="info">
                <s-paragraph>
                  This is your first scan, so there is nothing to compare yet. It is saved as your baseline; take another
                  snapshot after your next round of fixes.
                </s-paragraph>
              </s-banner>
            ) : !result.comparable ? (
              <s-banner tone="info">
                <s-paragraph>
                  The checks were updated since your baseline scan on {fmtDate(result.baselineDate)}, so a before/after
                  comparison isn't available this time. The list below shows what is still flagged now.
                </s-paragraph>
              </s-banner>
            ) : null}
            {result.regressed.length ? (
              <s-banner tone="warning" heading="Passing before, flagged now">
                <s-paragraph>{result.regressed.map(title).join(", ")}</s-paragraph>
              </s-banner>
            ) : null}
            <s-paragraph>Copy this into your review request if it helps:</s-paragraph>
            <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{result.summaryText}</pre>
            </s-box>
            <s-button onClick={() => copy(result.summaryText)}>Copy</s-button>
            <s-paragraph>
              About 10 days from now we&apos;ll ask on the app home page whether Google reinstated you. One tap.
            </s-paragraph>
          </s-stack>
        </s-section>
      ) : null}

      {attempts.length ? (
        <s-section heading="Your review attempts">
          <s-table>
            <s-table-header-row>
              <s-table-header>Attempt</s-table-header>
              <s-table-header>Date</s-table-header>
              <s-table-header>Issue</s-table-header>
              <s-table-header>Outcome</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {attempts.map((a) => (
                <s-table-row key={a.attemptNo}>
                  <s-table-cell>{a.attemptNo}</s-table-cell>
                  <s-table-cell>{fmtDate(a.requestedAt)}</s-table-cell>
                  <s-table-cell>{LABELS[a.label] ?? a.label}</s-table-cell>
                  <s-table-cell>{OUTCOME[a.outcome] ?? a.outcome}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      ) : null}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
