// App home: scan the merchant's own storefront against Google's published website requirements,
// and ask about the outcome of earlier review requests.
// Words we never use here: readiness, score, approval chance, guarantee. Google alone decides.
import { useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { parseResults, profileInput, scanShop } from "../lib/appscan.server";
import { CHECK_INFO, type CheckInfo } from "../engine/run";
import type { Finding, Status } from "../engine/types";

const DAY = 24 * 3600_000;
const ASK_AFTER_DAYS = 10; // Google says reviews take 7 business days, up to 2 weeks
const SNOOZE_DAYS = 7; // "Still waiting" hides the question for a week

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const profile = await prisma.shopProfile.findUnique({ where: { shop: session.shop } });
  const hasGmcInfo = Boolean(profile?.gmcBusinessName || profile?.gmcPhone || profile?.gmcEmail || profile?.gmcAddress);
  if (!profile?.shopKey) return { latest: null, askOutcome: [], hasGmcInfo };

  const scan = await prisma.scan.findFirst({ where: { shopKey: profile.shopKey }, orderBy: { createdAt: "desc" } });
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
    hasGmcInfo,
  };
};

type ActionResult =
  | { intent: "scan"; ok: true; findings: Finding[]; origin: string; createdAt: string }
  | { intent: "scan"; ok: false; error: string }
  | { intent: "outcome"; ok: boolean; answer?: string };

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

function summary(statuses: Status[]) {
  const checked = statuses.filter((s) => s !== "na");
  const passed = checked.filter((s) => s === "pass").length;
  return `${passed} of ${checked.length} published Google criteria we checked passed`;
}

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
  const { latest, askOutcome, hasGmcInfo } = useLoaderData<typeof loader>();
  const scanFetcher = useFetcher<typeof action>();
  const outcomeFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const scanning = scanFetcher.state !== "idle";
  const result = scanFetcher.data?.intent === "scan" ? scanFetcher.data : undefined;

  useEffect(() => {
    const d = outcomeFetcher.data;
    if (d?.intent === "outcome" && d.ok) {
      shopify.toast.show(d.answer === "pending" ? "OK — we'll ask again in a week" : "Thanks, outcome saved");
    }
  }, [outcomeFetcher.data, shopify]);

  const runScan = () => scanFetcher.submit({ intent: "scan" }, { method: "POST" });
  const answer = (attemptId: string, value: string) =>
    outcomeFetcher.submit({ intent: "outcome", attemptId, answer: value }, { method: "POST" });

  const findings = result?.ok ? result.findings : null;
  const passwordProtected = findings?.some((f) => f.checkId === "SITE-04" && f.status === "fail");

  return (
    <s-page heading="Storefront check">
      <s-button slot="primary-action" variant="primary" onClick={runScan} {...(scanning ? { loading: true } : {})}>
        Scan my store
      </s-button>

      {askOutcome.length && outcomeFetcher.state === "idle" && !outcomeFetcher.data ? (
        <s-banner tone="info" heading={`Did Google finish reviewing your request from ${fmtDate(askOutcome[0].requestedAt)}?`}>
          <s-paragraph>
            One tap. If you opted in to sharing, your answer (with no store address) helps show which fixes other merchants made
            before being reinstated.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button onClick={() => answer(askOutcome[0].id, "reinstated")}>Reinstated</s-button>
            <s-button onClick={() => answer(askOutcome[0].id, "rejected")}>Rejected</s-button>
            <s-button variant="tertiary" onClick={() => answer(askOutcome[0].id, "pending")}>
              Still waiting
            </s-button>
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

      {passwordProtected ? (
        <s-banner tone="warning" heading="Your store is password-protected">
          <s-paragraph>
            Google can't see a password-protected store, and neither can this scan. Remove the password in Online Store →
            Preferences, then scan again.
          </s-paragraph>
        </s-banner>
      ) : null}

      {findings && result?.ok ? (
        <>
          <s-section heading={summary(findings.map((f) => f.status))}>
            <s-paragraph>
              Scanned {result.origin} on {fmtDate(result.createdAt)}. Each finding links to the Google help page it comes
              from.
            </s-paragraph>
          </s-section>
          <FindingList findings={findings} />
        </>
      ) : latest?.findings ? (
        <>
          <s-section heading={`Last scan, ${fmtDate(latest.createdAt)}: ${summary(latest.findings.map((f) => f.status))}`}>
            <s-paragraph>Scan again after you change something to see the new result.</s-paragraph>
          </s-section>
          <FindingList findings={latest.findings} />
        </>
      ) : latest ? (
        <s-section heading={`Last scan, ${fmtDate(latest.createdAt)}: ${summary(Object.values(latest.results))}`}>
          <s-paragraph>Scan again to see the evidence and where to fix each item.</s-paragraph>
          <LatestStatuses results={latest.results} />
        </s-section>
      ) : (
        <s-section heading="Check your storefront before you ask Google for a review">
          <s-paragraph>
            The scan reads your public storefront the way Google's crawler does and checks it against Google Merchant
            Center's published website requirements: contact details, policies, placeholder text, broken links, prices
            and claims.
          </s-paragraph>
          <s-button variant="primary" onClick={runScan} {...(scanning ? { loading: true } : {})}>
            Scan my store
          </s-button>
        </s-section>
      )}

      <s-section slot="aside" heading="Before you request a review">
        <s-paragraph>
          Each failed review can cost a week or more of waiting. When you've made your fixes, take a snapshot: it records
          exactly what changed since your first scan, so you can list it in your request.
        </s-paragraph>
        <s-link href="/app/snapshot">Take a pre-review snapshot</s-link>
      </s-section>

      <s-section slot="aside" heading="About this check">
        <s-paragraph>
          Independent tool, not affiliated with Google. It checks Google's published criteria only. Google alone decides
          on reviews and reinstatement.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
