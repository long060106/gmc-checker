// App home: scan the merchant's own storefront against Google's published website requirements,
// and ask about the outcome of earlier review requests.
// Words we never use here: readiness, score, approval chance, guarantee. Google alone decides.
import { useEffect, useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { parseResults, profileInput, scanShop } from "../lib/appscan.server";
import { getPass } from "../lib/pass.server";
import { PASS_DAYS, PASS_PRICE_USD, REFUND_DAYS, snapshotAllowed } from "../lib/pass";
import { rateLimit } from "../lib/ratelimit.server";
import { CHECK_INFO, type CheckInfo } from "../engine/run";
import type { Finding, Status } from "../engine/types";
import { ALL_PASS_NOTE, allPassed, checkSummary, COOLDOWN, REVIEW_TIME } from "../lib/wording";

const DAY = 24 * 3600_000;
// Google says reviews take 7 business days, up to 2 weeks. Same 14 days as the /scan follow-up email.
const ASK_AFTER_DAYS = 14;
const SNOOZE_DAYS = 7; // "Still waiting" hides the question for a week
// Scans are free and unlimited. This only stops runaway clicking: each scan fetches up to 25 store pages.
const SCAN_MAX = 10;
const SCAN_WINDOW_MS = 10 * 60_000;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const [profile, { pass, priorRefunds }] = await Promise.all([
    prisma.shopProfile.findUnique({ where: { shop: session.shop } }),
    getPass(admin, session.shop),
  ]);
  const hasGmcInfo = Boolean(profile?.gmcBusinessName || profile?.gmcPhone || profile?.gmcEmail || profile?.gmcAddress);
  const plan = {
    passActive: pass.active,
    passUntil: pass.active ? pass.expiresAt : null,
    hasStorefrontPassword: Boolean(profile?.storefrontPassword),
    refundNote: priorRefunds > 0 ? "" : `, ${REFUND_DAYS}-day refund`, // the refund is once per store
  };
  if (!profile?.shopKey) return { latest: null, askOutcome: [], rejected: null, hasGmcInfo, ...plan };

  const [scan, last] = await Promise.all([
    // In-app scans only: anyone can run a public /scan of this store and type any Merchant Center name.
    prisma.scan.findFirst({ where: { shopKey: profile.shopKey, source: "app" }, orderBy: { createdAt: "desc" } }),
    prisma.reviewAttempt.findFirst({
      where: { shopKey: profile.shopKey },
      orderBy: { attemptNo: "desc" },
      select: { attemptNo: true, outcome: true, snapshotScanId: true },
    }),
  ]);
  // After a "Rejected" answer: what was still flagged in that request's snapshot, and the next step.
  // Shown until the merchant records their next request.
  let rejected: { attemptNo: number; stillFlagged: number; nextNeedsPass: boolean } | null = null;
  if (last?.outcome === "rejected") {
    const snap = last.snapshotScanId ? await prisma.scan.findUnique({ where: { id: last.snapshotScanId } }) : null;
    const statuses = snap ? Object.values(parseResults(snap)) : [];
    rejected = {
      attemptNo: last.attemptNo,
      stillFlagged: statuses.filter((s) => s === "fail" || s === "warn").length,
      nextNeedsPass: !snapshotAllowed(last.attemptNo + 1, pass),
    };
  }
  const now = Date.now();
  // For a pending attempt, outcomeAt = last time the merchant said "still waiting" (snooze).
  const attempts = await prisma.reviewAttempt.findMany({
    where: {
      shopKey: profile.shopKey,
      outcome: "pending",
      requestedAt: { lte: new Date(now - ASK_AFTER_DAYS * DAY) },
      OR: [{ outcomeAt: null }, { outcomeAt: { lte: new Date(now - SNOOZE_DAYS * DAY) } }],
    },
    orderBy: { requestedAt: "asc" },
    select: { id: true, attemptNo: true, requestedAt: true },
  });
  const detail = scan ? await prisma.appScanDetail.findUnique({ where: { scanId: scan.id } }) : null;
  let latestFindings: Finding[] | null = null;
  try {
    latestFindings = detail ? (JSON.parse(detail.findings) as Finding[]) : null;
  } catch {
    latestFindings = null;
  }
  return {
    latest: scan
      ? { createdAt: scan.createdAt.toISOString(), results: parseResults(scan), findings: latestFindings }
      : null,
    askOutcome: attempts.map((a) => ({ id: a.id, attemptNo: a.attemptNo, requestedAt: a.requestedAt.toISOString() })),
    rejected,
    hasGmcInfo,
    ...plan,
  };
};

type ActionResult =
  | { intent: "scan"; ok: true; findings: Finding[]; origin: string; createdAt: string }
  | { intent: "scan"; ok: false; error: string }
  | { intent: "outcome"; ok: boolean; answer?: string }
  | { intent: "password-removed"; ok: true };

export const action = async ({ request }: ActionFunctionArgs): Promise<ActionResult> => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "outcome") {
    const answer = String(form.get("answer") ?? "");
    const profile = await prisma.shopProfile.findUnique({ where: { shop: session.shop } });
    const attempt = profile?.shopKey
      ? await prisma.reviewAttempt.findFirst({ where: { id: String(form.get("attemptId") ?? ""), shopKey: profile.shopKey } })
      : null;
    if (!attempt || !["reinstated", "rejected", "pending"].includes(answer)) return { intent: "outcome", ok: false };
    await prisma.reviewAttempt.update({
      where: { id: attempt.id },
      // "pending" keeps the outcome open and only records when we asked (snooze).
      data: answer === "pending" ? { outcomeAt: new Date() } : { outcome: answer, outcomeAt: new Date() },
    });
    return { intent: "outcome", ok: true, answer };
  }

  // Save (then scan) or remove the storefront password. It is only used to open the store for scans.
  if (form.get("intent") === "storefront-password") {
    const value = String(form.get("storefrontPassword") ?? "").trim().slice(0, 100);
    await prisma.shopProfile.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, storefrontPassword: value || null },
      update: { storefrontPassword: value || null },
    });
    if (!value) return { intent: "password-removed", ok: true };
  }

  const limit = rateLimit(`app-scan:${session.shop}`, SCAN_MAX, SCAN_WINDOW_MS);
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return {
      intent: "scan",
      ok: false,
      error: `That's ${SCAN_MAX} scans in a few minutes. Try again in about ${mins} minute${mins === 1 ? "" : "s"}. Your latest results are below.`,
    };
  }

  const res = await scanShop(session.shop, await profileInput(session.shop));
  if (!res.ok) return { intent: "scan", ok: false, error: res.error };
  return { intent: "scan", ok: true, findings: res.findings, origin: res.origin, createdAt: res.scan.createdAt.toISOString() };
};

// ---------------------------------------------------------------- UI

const GROUP_ORDER: CheckInfo["group"][] = ["Site", "Identity", "Contact", "Policies", "Pricing", "Claims"];
const TONE: Record<Status, "success" | "warning" | "critical" | "neutral"> = {
  pass: "success",
  warn: "warning",
  fail: "critical",
  na: "neutral",
};
const BADGE: Record<Status, string> = { pass: "Pass", warn: "Check", fail: "Fix", na: "Not checked" };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <>
      {GROUP_ORDER.map((group) => {
        const rows = findings.filter((f) => CHECK_INFO[f.checkId]?.group === group);
        if (!rows.length) return null;
        return (
          <s-section key={group} heading={group}>
            <s-stack direction="block" gap="base">
              {rows.map((f) => (
                <s-box key={f.checkId} padding="base" borderWidth="base" borderRadius="base">
                  <s-stack direction="block" gap="small-200">
                    <s-stack direction="inline" gap="small-200">
                      <s-badge tone={TONE[f.status]}>{BADGE[f.status]}</s-badge>
                      <s-text type="strong">{CHECK_INFO[f.checkId]?.title ?? f.checkId}</s-text>
                    </s-stack>
                    <s-paragraph>{f.evidence}</s-paragraph>
                    {f.status !== "pass" && f.status !== "na" && f.shopifyFix ? (
                      <s-paragraph>
                        <s-text color="subdued">Where to fix: </s-text>
                        {f.shopifyFix}
                      </s-paragraph>
                    ) : null}
                    {f.googleRef ? (
                      <s-link href={f.googleRef} target="_blank">
                        Google&apos;s rule
                      </s-link>
                    ) : null}
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-section>
        );
      })}
    </>
  );
}

function LatestStatuses({ results }: { results: Record<string, Status> }) {
  return (
    <s-stack direction="block" gap="small-200">
      {Object.entries(results).map(([id, status]) => (
        <s-stack key={id} direction="inline" gap="small-200">
          <s-badge tone={TONE[status]}>{BADGE[status]}</s-badge>
          <s-text>{CHECK_INFO[id]?.title ?? id}</s-text>
        </s-stack>
      ))}
    </s-stack>
  );
}

export default function Index() {
  const { latest, askOutcome, rejected, hasGmcInfo, passActive, passUntil, hasStorefrontPassword, refundNote } =
    useLoaderData<typeof loader>();
  const [storefrontPassword, setStorefrontPassword] = useState("");
  const scanFetcher = useFetcher<typeof action>();
  const outcomeFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const scanning = scanFetcher.state !== "idle";
  const result = scanFetcher.data?.intent === "scan" ? scanFetcher.data : undefined;

  useEffect(() => {
    if (scanFetcher.data?.intent === "password-removed") shopify.toast.show("Storefront password removed");
  }, [scanFetcher.data, shopify]);

  useEffect(() => {
    const d = outcomeFetcher.data;
    if (d?.intent === "outcome" && d.ok) {
      shopify.toast.show(d.answer === "pending" ? "OK — we'll ask again in a week" : "Thanks, outcome saved");
    }
  }, [outcomeFetcher.data, shopify]);

  const runScan = () => scanFetcher.submit({ intent: "scan" }, { method: "POST" });
  const savePasswordAndScan = () =>
    scanFetcher.submit({ intent: "storefront-password", storefrontPassword }, { method: "POST" });
  const removePassword = () => scanFetcher.submit({ intent: "storefront-password", storefrontPassword: "" }, { method: "POST" });
  const answer = (attemptId: string, value: string) =>
    outcomeFetcher.submit({ intent: "outcome", attemptId, answer: value }, { method: "POST" });

  const findings = result?.ok ? result.findings : null;
  const shown = findings ?? latest?.findings ?? null;
  const passwordProtected = shown?.some((f) => f.checkId === "SITE-04" && f.status === "fail" && /password/i.test(f.evidence));

  return (
    <s-page heading="Storefront check">
      <s-button slot="primary-action" variant="primary" onClick={runScan} {...(scanning ? { loading: true } : {})}>
        Scan my store
      </s-button>

      {askOutcome.length > 0 && outcomeFetcher.state === "idle" && !outcomeFetcher.data ? (
        <s-banner tone="info" heading={`Did Google finish reviewing your request from ${fmtDate(askOutcome[0].requestedAt)}?`}>
          <s-paragraph>
            One tap. If you opted in to sharing, your answer is saved without your store address and helps other merchants
            see which fixes came before a reinstatement.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button onClick={() => answer(askOutcome[0].id, "reinstated")}>Reinstated</s-button>
            <s-button onClick={() => answer(askOutcome[0].id, "rejected")}>Not reinstated</s-button>
            <s-button variant="tertiary" onClick={() => answer(askOutcome[0].id, "pending")}>
              Still waiting
            </s-button>
          </s-stack>
        </s-banner>
      ) : null}

      {rejected ? (
        <s-banner tone="warning" heading={`Google didn't reinstate you after request #${rejected.attemptNo}`}>
          <s-stack direction="block" gap="base">
            <s-paragraph>
              We can&apos;t know Google&apos;s reasons; only Merchant Center&apos;s issue details come from Google.{" "}
              {rejected.stillFlagged > 0
                ? `In the snapshot for that request, our storefront check still flagged ${rejected.stillFlagged} ${rejected.stillFlagged === 1 ? "item" : "items"}. Those are the first place to look.`
                : "In the snapshot for that request, every storefront criterion we check passed, so the cause may be outside the storefront: product data, the feed, or account verification."}{" "}
              {rejected.attemptNo === 1
                ? "If issues still aren't resolved by your next review, Google says a one-week cool-down may begin, so make the next request count."
                : "Merchant Center may show a cool-down before you can ask again, and Google says it may get longer with each unsuccessful review."}
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button href={`/app/kit/${rejected.attemptNo}`}>Open kit #{rejected.attemptNo}</s-button>
              {rejected.nextNeedsPass ? (
                <s-button variant="primary" href="/app/pass">
                  {`Get the pass for request #${rejected.attemptNo + 1} ($${PASS_PRICE_USD}${refundNote})`}
                </s-button>
              ) : (
                <s-button variant="primary" href="/app/snapshot">
                  {`Take snapshot #${rejected.attemptNo + 1}`}
                </s-button>
              )}
            </s-stack>
          </s-stack>
        </s-banner>
      ) : null}

      {!hasGmcInfo ? (
        <s-banner tone="warning" heading="Add your Merchant Center details">
          <s-paragraph>
            Some checks compare your storefront with the business name, phone, email and address in Merchant Center.{" "}
            <s-link href="/app/gmc-info">Add them here</s-link>.
          </s-paragraph>
        </s-banner>
      ) : null}

      {result && !result.ok ? (
        <s-banner tone="critical" heading="The scan didn't finish">
          <s-paragraph>{result.error}</s-paragraph>
        </s-banner>
      ) : null}

      {passwordProtected && !hasStorefrontPassword ? (
        <s-banner tone="warning" heading="Your store is password-protected">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Google can't see a password-protected store. Remove the password in Online Store → Preferences when you
              launch. Until then, save your storefront password here and the scan will check your store as it will look
              once the password is removed. It is only used to open your store for scans, and deleted when you uninstall.
            </s-paragraph>
            <s-text-field
              label="Storefront password"
              details="Online Store → Preferences → Password"
              value={storefrontPassword}
              onInput={(e) => setStorefrontPassword(e.currentTarget.value)}
              onChange={(e) => setStorefrontPassword(e.currentTarget.value)}
            ></s-text-field>
            <s-button
              variant="primary"
              onClick={savePasswordAndScan}
              {...(scanning ? { loading: true } : {})}
              {...(!storefrontPassword.trim() ? { disabled: true } : {})}
            >
              Save and scan
            </s-button>
          </s-stack>
        </s-banner>
      ) : null}

      {findings && result?.ok ? (
        <>
          <s-section heading={checkSummary(findings.map((f) => f.status))}>
            <s-paragraph>
              Scanned {result.origin} on {fmtDate(result.createdAt)}. Each finding links to the Google help page it comes
              from.
            </s-paragraph>
            {allPassed(findings.map((f) => f.status)) ? <s-paragraph>{ALL_PASS_NOTE}</s-paragraph> : null}
          </s-section>
          <FindingList findings={findings} />
        </>
      ) : latest?.findings ? (
        <>
          <s-section heading={`Last scan (${fmtDate(latest.createdAt)}) · ${checkSummary(latest.findings.map((f) => f.status))}`}>
            <s-paragraph>Scan again after you change something to see the new result.</s-paragraph>
            {allPassed(latest.findings.map((f) => f.status)) ? <s-paragraph>{ALL_PASS_NOTE}</s-paragraph> : null}
          </s-section>
          <FindingList findings={latest.findings} />
        </>
      ) : latest ? (
        <s-section heading={`Last scan (${fmtDate(latest.createdAt)}) · ${checkSummary(Object.values(latest.results))}`}>
          <s-paragraph>Scan again to see the evidence and where to fix each item.</s-paragraph>
          <LatestStatuses results={latest.results} />
        </s-section>
      ) : (
        <s-section heading="Check your storefront before you ask Google for a review">
          <s-paragraph>
            The scan reads the HTML your storefront sends, before any JavaScript runs, and checks it against the website
            rules in Google&apos;s Merchant Center help: contact details, policies, placeholder text, broken links, prices
            and claims. It takes up to 30 seconds.
          </s-paragraph>
          <s-button variant="primary" onClick={runScan} {...(scanning ? { loading: true } : {})}>
            Scan my store
          </s-button>
        </s-section>
      )}

      {hasStorefrontPassword ? (
        <s-section slot="aside" heading="Storefront password">
          <s-paragraph>
            Saved. Scans use it to open your password-protected store. Google still can't see the store until you remove the
            password.
          </s-paragraph>
          <s-button variant="tertiary" onClick={removePassword}>
            Remove password
          </s-button>
        </s-section>
      ) : null}

      <s-section slot="aside" heading="Before you request a review">
        <s-paragraph>{`${REVIEW_TIME} ${COOLDOWN}`}</s-paragraph>
        <s-paragraph>
          When you&apos;ve made your fixes, take a snapshot: a fresh scan compared with your first one. Fixlog turns it into
          a review kit, a dated record of what changed that you can use in your review request.
        </s-paragraph>
        <s-link href="/app/snapshot">Take a pre-review snapshot</s-link>
      </s-section>

      <s-section slot="aside" heading={passActive ? "Review Pass" : "Free plan"}>
        <s-paragraph>
          {passActive && passUntil
            ? `Active until ${fmtDate(passUntil)}: a snapshot and review kit for every review request.`
            : "Scans are free and unlimited. So are the snapshot and review kit for your first review request."}
        </s-paragraph>
        {!passActive ? (
          <s-link href="/app/pass">{`A kit for every later request: ${PASS_DAYS} days, $${PASS_PRICE_USD} once${refundNote}`}</s-link>
        ) : null}
      </s-section>

      <s-section slot="aside" heading="About this check">
        <s-paragraph>
          Independent tool by Long Nguyen, not affiliated with Google. It checks Google's published criteria only.
          Google alone decides on reviews and reinstatement.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
