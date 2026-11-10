// Public web checker at /scan. No Shopify auth: anyone can scan a public Shopify storefront.
// Never throws to the user: every failure becomes a friendly message (App Store req 2.1.1 mindset).
import type { ActionFunctionArgs, MetaFunction } from "react-router";
import { Form, Link, data, useActionData, useFetcher, useNavigation } from "react-router";
import { randomBytes } from "node:crypto";

import prisma from "../../db.server";
import { crawlStore, CrawlError } from "../../engine/crawl.server";
import { CHECK_INFO, ENGINE_VERSION, runAll } from "../../engine/run";
import type { Finding, Status } from "../../engine/types";
import { shopKey } from "../../lib/shopkey.server";
import { clientIp, rateLimit } from "../../lib/ratelimit.server";

import styles from "./styles.module.css";

export const meta: MetaFunction = () => [
  { title: "Storefront check for Google Merchant Center" },
  {
    name: "description",
    content:
      "Free check of a Shopify storefront against Google Merchant Center's published website requirements. Every finding shown, with the Google rule and the Shopify fix.",
  },
];

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

const GROUP_ORDER = ["Site", "Identity", "Contact", "Policies", "Pricing", "Claims"] as const;

type ScanResult =
  | { intent: "scan"; ok: true; scanId: string; origin: string; findings: Finding[] }
  | { intent: "scan"; ok: false; error: string };
type WaitlistResult = { intent: "waitlist"; ok: true; optedIn: boolean } | { intent: "waitlist"; ok: false; error: string };
type ActionResult = ScanResult | WaitlistResult;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function action({ request }: ActionFunctionArgs) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return data<ActionResult>({ intent: "scan", ok: false, error: "Something went wrong. Please try again." }, { status: 400 });
  }
  const intent = String(form.get("intent") ?? "scan");
  if (intent === "waitlist") return joinWaitlist(form);
  return runScan(request, form);
}

async function runScan(request: Request, form: FormData) {
  const storeUrl = String(form.get("storeUrl") ?? "").slice(0, 300);
  const gmcBusinessName = String(form.get("gmcBusinessName") ?? "").trim().slice(0, 120) || undefined;

  const limit = rateLimit(`scan:${clientIp(request)}`);
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return data<ActionResult>(
      { intent: "scan", ok: false, error: `Too many scans from your network. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  try {
    const snapshot = await crawlStore(storeUrl);
    const findings = runAll(snapshot, { gmcBusinessName });
    const origin = snapshot.origin ?? storeUrl;
    const results = Object.fromEntries(findings.map((f) => [f.checkId, f.status]));
    const scan = await prisma.scan.create({
      data: {
        shopKey: shopKey(new URL(origin).hostname),
        engineVersion: ENGINE_VERSION,
        results: JSON.stringify(results),
        source: "web",
        gmcNameProvided: Boolean(gmcBusinessName),
      },
    });
    return data<ActionResult>({ intent: "scan", ok: true, scanId: scan.id, origin, findings });
  } catch (e) {
    if (e instanceof CrawlError) return data<ActionResult>({ intent: "scan", ok: false, error: e.message });
    console.error("[scan] unexpected error", e);
    return data<ActionResult>({ intent: "scan", ok: false, error: "We couldn't finish this scan. Please try again in a minute." });
  }
}

async function joinWaitlist(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) {
    return data<ActionResult>({ intent: "waitlist", ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  const suspendedRaw = String(form.get("suspended") ?? "");
  const suspended = suspendedRaw === "yes" ? true : suspendedRaw === "no" ? false : null;
  const labelRaw = String(form.get("label") ?? "");
  const label = labelRaw in LABELS ? labelRaw : null;
  const scanId = String(form.get("scanId") ?? "").slice(0, 40) || null;
  const optedIn = form.get("outcomeOptIn") === "on";
  const outcome = optedIn
    ? { outcomeEmailOptIn: true, outcomeEmailSendAfter: new Date(Date.now() + 14 * 24 * 3600_000), outcomeToken: randomBytes(24).toString("base64url") }
    : { outcomeEmailOptIn: false, outcomeEmailSendAfter: null, outcomeToken: null };

  try {
    const fields = { scanId, suspended, label, priceShown: 3900, ...outcome };
    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { email, ...fields },
      update: { ...fields, unsubscribed: false },
    });
    return data<ActionResult>({ intent: "waitlist", ok: true, optedIn });
  } catch (e) {
    console.error("[waitlist] save failed", e);
    return data<ActionResult>({ intent: "waitlist", ok: false, error: "We couldn't save that. Please try again." });
  }
}

// ---------------------------------------------------------------- UI

const BADGE: Record<Status, string> = { pass: "Pass", warn: "Check", fail: "Fix", na: "Not checked" };

function FindingRow({ f }: { f: Finding }) {
  const info = CHECK_INFO[f.checkId];
  return (
    <li className={`${styles.finding} ${styles[f.status]}`}>
      <div className={styles.findingHead}>
        <span className={`${styles.badge} ${styles[`badge_${f.status}`]}`}>{BADGE[f.status]}</span>
        <span className={styles.findingTitle}>{info?.title ?? f.checkId}</span>
        <span className={styles.checkId}>{f.checkId}</span>
      </div>
      <p className={styles.evidence}>{f.evidence}</p>
      {f.status !== "pass" && f.status !== "na" && f.shopifyFix && (
        <p className={styles.fix}>
          <strong>Where to fix:</strong> {f.shopifyFix}
        </p>
      )}
      {f.googleRef && (
        <a className={styles.ref} href={f.googleRef} target="_blank" rel="noreferrer">
          Google's rule ↗
        </a>
      )}
    </li>
  );
}

function Report({ origin, findings, scanId }: { origin: string; findings: Finding[]; scanId: string }) {
  const applicable = findings.filter((f) => f.status !== "na");
  const passed = applicable.filter((f) => f.status === "pass").length;
  const toFix = applicable.filter((f) => f.status === "fail").length;
  const toCheck = applicable.filter((f) => f.status === "warn").length;
  const notChecked = findings.filter((f) => f.status === "na");
  const rank: Record<Status, number> = { fail: 0, warn: 1, pass: 2, na: 3 };

  return (
    <section className={styles.report} aria-label="Scan report">
      <h2 className={styles.reportTitle}>Report for {new URL(origin).hostname}</h2>
      <p className={styles.summary}>
        <strong>
          {passed} of {applicable.length}
        </strong>{" "}
        published Google criteria we checked passed · <span className={styles.failText}>{toFix} to fix</span> ·{" "}
        <span className={styles.warnText}>{toCheck} to check</span>
      </p>

      {GROUP_ORDER.map((group) => {
        const items = applicable
          .filter((f) => CHECK_INFO[f.checkId]?.group === group)
          .sort((a, b) => rank[a.status] - rank[b.status]);
        if (!items.length) return null;
        return (
          <div key={group} className={styles.group}>
            <h3 className={styles.groupTitle}>{group}</h3>
            <ul className={styles.list}>
              {items.map((f) => (
                <FindingRow key={f.checkId} f={f} />
              ))}
            </ul>
          </div>
        );
      })}

      {notChecked.length > 0 && (
        <details className={styles.naBlock}>
          <summary>Not checked ({notChecked.length})</summary>
          <ul className={styles.list}>
            {notChecked.map((f) => (
              <FindingRow key={f.checkId} f={f} />
            ))}
          </ul>
        </details>
      )}

      <Waitlist scanId={scanId} />
    </section>
  );
}

function Waitlist({ scanId }: { scanId: string }) {
  const fetcher = useFetcher<typeof action>();
  const res = fetcher.data as ActionResult | undefined;
  if (res?.intent === "waitlist" && res.ok) return <WaitlistThanks optedIn={res.optedIn} />;

  return (
    <fetcher.Form method="post" className={styles.waitlist}>
      <input type="hidden" name="intent" value="waitlist" />
      <input type="hidden" name="scanId" value={scanId} />
      <h2 className={styles.waitlistTitle}>Track your fixes before you request a review</h2>
      <p className={styles.muted}>
        The Shopify app (coming soon) re-scans right before you request a review and lists exactly what you changed since
        your first scan, so you can paste it into your appeal and keep a record between attempts.
      </p>

      <fieldset className={styles.fieldset}>
        <legend>Is your Merchant Center account currently suspended or warned?</legend>
        <label>
          <input type="radio" name="suspended" value="yes" /> Yes
        </label>
        <label>
          <input type="radio" name="suspended" value="no" /> No
        </label>
        <label>
          <input type="radio" name="suspended" value="unsure" /> Not sure
        </label>
      </fieldset>

      <label className={styles.field}>
        <span>Which issue does Merchant Center show?</span>
        <select name="label" defaultValue="">
          <option value="">— Choose —</option>
          {Object.entries(LABELS).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.priceBox}>
        <strong>Reinstatement Pass — $39 one-time when it launches.</strong> Not for sale yet. Join the waitlist and
        we'll email you when it's available.
      </div>

      <label className={styles.field}>
        <span>Email</span>
        <input type="email" name="email" required autoComplete="email" maxLength={254} placeholder="you@yourstore.com" />
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" name="outcomeOptIn" /> Email me in 14 days so I can log whether I got reinstated (one
        question, one click).
      </label>
      <p className={styles.small}>
        We use your email only for this. See our <Link to="/privacy">privacy policy</Link>.
      </p>
      {res?.intent === "waitlist" && !res.ok && <p className={styles.error}>{res.error}</p>}
      <button className={styles.button} type="submit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Join the waitlist"}
      </button>
    </fetcher.Form>
  );
}

function WaitlistThanks({ optedIn }: { optedIn: boolean }) {
  return (
    <div className={styles.thanks} role="status">
      <h2 className={styles.waitlistTitle}>You're on the waitlist.</h2>
      <p>
        We'll email you when the Shopify app is available. Nothing is charged now.
        {optedIn && " In 14 days we'll send one question asking whether you were reinstated."}
      </p>
    </div>
  );
}

export default function ScanPage() {
  const result = useActionData<typeof action>() as ActionResult | undefined;
  const nav = useNavigation();
  const scanning = nav.state !== "idle" && nav.formData?.get("intent") !== "waitlist";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Check your Shopify store against Merchant Center's website rules</h1>
        <p className={styles.lede}>
          Free. Every finding is shown, each linked to the Google help page it comes from and the place in Shopify to fix
          it. We read your public pages the way Google's crawler does: server HTML, no JavaScript.
        </p>
      </header>

      <Form method="post" className={styles.scanForm}>
        <input type="hidden" name="intent" value="scan" />
        <label className={styles.field}>
          <span>Store address</span>
          <input name="storeUrl" required placeholder="yourstore.com" inputMode="url" autoComplete="url" maxLength={300} />
        </label>
        <label className={styles.field}>
          <span>
            Business name exactly as in your Merchant Center <em className={styles.muted}>(optional)</em>
          </span>
          <input name="gmcBusinessName" placeholder="e.g. ABC Company" maxLength={120} />
        </label>
        <button className={styles.button} type="submit" disabled={scanning}>
          {scanning ? "Scanning… (up to 30 seconds)" : "Scan my store"}
        </button>
      </Form>

      {result?.intent === "scan" && !result.ok && <p className={styles.error}>{result.error}</p>}
      {result?.intent === "scan" && result.ok && (
        <Report origin={result.origin} findings={result.findings} scanId={result.scanId} />
      )}
      {/* JS-disabled fallback: the waitlist form posts as a normal navigation and lands here. */}
      {result?.intent === "waitlist" &&
        (result.ok ? <WaitlistThanks optedIn={result.optedIn} /> : <p className={styles.error}>{result.error}</p>)}

      <footer className={styles.footer}>
        <p>
          Independent tool, not affiliated with Google. Google alone decides on reviews and reinstatement. A clean report
          means the published criteria we check look fine, not that your account will be approved.
        </p>
        <p>
          <Link to="/privacy">Privacy</Link>
        </p>
      </footer>
    </main>
  );
}
