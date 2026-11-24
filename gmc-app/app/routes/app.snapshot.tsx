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
import { getPass } from "../lib/pass.server";
import { FREE_ATTEMPTS, PASS_DAYS, PASS_PLAN, PASS_PRICE_USD, snapshotAllowed } from "../lib/pass";
import { canBeBaseline, diffScans, isBlockedScan } from "../engine/diff";
import { CHECK_INFO } from "../engine/run";
import { LABELS } from "../lib/labels";
import { shortDateIn } from "../lib/dates";
import { shopTimeZone } from "../lib/shop-timezone.server";

const OUTCOME: Record<string, string> = { pending: "Waiting", reinstated: "Reinstated", rejected: "Rejected", unknown: "Unknown" };

// Dates are formatted on the server in the store's time zone, so the page, the copied
// summary and the review kit all show the same day.
const title = (id: string) => CHECK_INFO[id]?.title ?? id;

/** Number of the next review attempt for this shop (1 if none recorded yet). */
async function nextAttemptNo(shop: string): Promise<number> {
  const profile = await prisma.shopProfile.findUnique({ where: { shop }, select: { shopKey: true } });
  if (!profile?.shopKey) return 1;
  const last = await prisma.reviewAttempt.findFirst({
    where: { shopKey: profile.shopKey },
    orderBy: { attemptNo: "desc" },
    select: { attemptNo: true },
  });
  return (last?.attemptNo ?? 0) + 1;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const profile = await prisma.shopProfile.findUnique({ where: { shop: session.shop } });
  const [attempts, { pass }, timeZone] = await Promise.all([
    profile?.shopKey
      ? prisma.reviewAttempt.findMany({
          where: { shopKey: profile.shopKey },
          orderBy: { attemptNo: "desc" },
          select: { attemptNo: true, requestedAt: true, label: true, outcome: true },
        })
      : Promise.resolve([]),
    getPass(admin, session.shop),
    shopTimeZone(admin),
  ]);
  const next = (attempts[0]?.attemptNo ?? 0) + 1;
  return {
    attempts: attempts.map(({ requestedAt, ...a }) => ({ ...a, date: shortDateIn(requestedAt, timeZone) })),
    needsPass: !snapshotAllowed(next, pass),
  };
};

type ActionResult =
  | { ok: false; error: string; needsPass?: boolean }
  | {
      ok: true;
      attemptNo: number;
      firstScan: boolean;
      comparable: boolean;
      /** Already formatted in the store's time zone. */
      baselineDate: string;
      fixed: string[];
      regressed: string[];
      stillFlagged: string[];
      summaryText: string;
    };

export const action = async ({ request }: ActionFunctionArgs): Promise<ActionResult> => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const label = String(form.get("label") ?? "");
  if (!(label in LABELS)) return { ok: false, error: "Choose the issue Merchant Center shows for your account." };
  const consent = form.get("consent") === "on";

  // 0. The first snapshot is free; later ones need the Review Pass. Checked before scanning.
  const [{ pass }, next, timeZone] = await Promise.all([
    getPass(admin, session.shop),
    nextAttemptNo(session.shop),
    shopTimeZone(admin),
  ]);
  if (!snapshotAllowed(next, pass)) {
    return {
      ok: false,
      needsPass: true,
      error: `Your first ${FREE_ATTEMPTS === 1 ? "snapshot is" : `${FREE_ATTEMPTS} snapshots are`} free. For snapshot ${next}, get the ${PASS_PLAN}.`,
    };
  }

  // 1. Fresh scan = the snapshot.
  const res = await scanShop(session.shop, await profileInput(session.shop));
  if (!res.ok) return { ok: false, error: res.error };
  const snapshot = res.scan;

  // 2. Baseline = the previous attempt's snapshot, else the earliest scan of this store (web or app).
  const previous = await prisma.reviewAttempt.findFirst({ where: { shopKey: res.shopKey }, orderBy: { attemptNo: "desc" } });
  //    Scans that only saw the password page (or nothing) are skipped: nothing in them can change.
  //    Public web scans with a typed-in Merchant Center name are skipped too (anyone can run one).
  const earlier = previous?.snapshotScanId
    ? null
    : await prisma.scan.findMany({
        where: { shopKey: res.shopKey, id: { not: snapshot.id } },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
  const baseline =
    (previous?.snapshotScanId ? await prisma.scan.findUnique({ where: { id: previous.snapshotScanId } }) : null) ??
    earlier?.find((s) => canBeBaseline(s) && !isBlockedScan(parseResults(s))) ??
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
    `Changes made since ${shortDateIn(baseline.createdAt, timeZone)}:`,
    ...(d.fixed.length ? d.fixed.map((id) => `- ${title(id)}`) : ["- (none detected by the storefront check)"]),
  ];
  if (d.stillFailing.length) lines.push("", "Still flagged by the storefront check:", ...d.stillFailing.map((id) => `- ${title(id)}`));

  return {
    ok: true,
    attemptNo,
    firstScan,
    comparable,
    baselineDate: shortDateIn(baseline.createdAt, timeZone),
    fixed: d.fixed,
    regressed: d.regressed,
    stillFlagged: d.stillFailing,
    summaryText: lines.join("\n"),
  };
};

// ---------------------------------------------------------------- UI

export default function Snapshot() {
  const { attempts, needsPass } = useLoaderData<typeof loader>();
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
          re-scans your store and lists which checks changed since your first scan, so your request can say what you fixed.
          It is a record of changes, not a prediction: Google alone decides.
        </s-paragraph>
        {needsPass ? (
          <s-banner tone="info" heading="Your free snapshot is used">
            <s-paragraph>
              {`The ${PASS_PLAN} ($${PASS_PRICE_USD} once, ${PASS_DAYS} days) gives a snapshot for every review request and unlimited scans.`}{" "}
              <s-link href="/app/pass">See the pass</s-link>
            </s-paragraph>
          </s-banner>
        ) : null}
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
              label="Let Fixlog include my fixes and review outcome in combined statistics. My store's address is never shared."
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
        <s-banner tone={result.needsPass ? "warning" : "critical"} heading="Snapshot not taken">
          <s-paragraph>
            {result.error}
            {result.needsPass ? (
              <>
                {" "}
                <s-link href="/app/pass">See the pass</s-link>
              </>
            ) : null}
          </s-paragraph>
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
                  The checks were updated since your baseline scan on {result.baselineDate}, so a before/after
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
            <s-stack direction="inline" gap="base">
              <s-button onClick={() => copy(result.summaryText)}>Copy</s-button>
              <s-button href={`/app/kit/${result.attemptNo}`} variant="primary">
                Open your review kit
              </s-button>
            </s-stack>
            <s-paragraph>
              The review kit is the full record for this request: what changed, what is still flagged with where to fix it
              and Google&apos;s rule, and your earlier requests. Copy it or download it as a text file.
            </s-paragraph>
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
              <s-table-header>Kit</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {attempts.map((a) => (
                <s-table-row key={a.attemptNo}>
                  <s-table-cell>{a.attemptNo}</s-table-cell>
                  <s-table-cell>{a.date}</s-table-cell>
                  <s-table-cell>{LABELS[a.label] ?? a.label}</s-table-cell>
                  <s-table-cell>{OUTCOME[a.outcome] ?? a.outcome}</s-table-cell>
                  <s-table-cell>
                    <s-link href={`/app/kit/${a.attemptNo}`}>Open</s-link>
                  </s-table-cell>
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
