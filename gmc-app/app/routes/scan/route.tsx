// Public web checker at /scan. No Shopify auth: anyone can scan a public Shopify storefront.
// Never throws to the user: every failure becomes a friendly message (App Store req 2.1.1 mindset).
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, ShouldRevalidateFunction } from "react-router";
import { useState } from "react";
import { Form, Link, data, useActionData, useFetcher, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { randomBytes } from "node:crypto";

import prisma from "../../db.server";
import { crawlStore, CrawlError } from "../../engine/crawl.server";
import { CHECK_INFO, CHECKS, ENGINE_VERSION, runAll } from "../../engine/run";
import { REF } from "../../engine/refs";
import { legacyHostRedirect, siteOrigin } from "../../lib/site.server";
import type { Finding, Status } from "../../engine/types";
import { shopKey } from "../../lib/shopkey.server";
import { clientIp, rateLimit } from "../../lib/ratelimit.server";
import { LABELS } from "../../lib/labels";

import styles from "./styles.module.css";

const TITLE = "Shopify GMC misrepresentation check (free) – Fixlog";
const DESCRIPTION =
  "Free check of a Shopify store against Google Merchant Center's website rules. Every finding links to Google's rule and says where to fix it.";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const moved = legacyHostRedirect(request);
  if (moved) throw moved;
  return { canonical: `${siteOrigin(request)}/scan` };
};

// The loader only returns the canonical URL, so a scan or waitlist post never needs to re-run it.
// This also keeps a scan started on the old host from being redirected away from its result.
export const shouldRevalidate: ShouldRevalidateFunction = ({ formMethod, defaultShouldRevalidate }) =>
  formMethod ? false : defaultShouldRevalidate;

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: TITLE },
  { name: "description", content: DESCRIPTION },
  ...(loaderData ? [{ tagName: "link", rel: "canonical", href: loaderData.canonical }] : []),
  { property: "og:title", content: TITLE },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:type", content: "website" },
  ...(loaderData
    ? [
        {
          "script:ld+json": {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Fixlog storefront check",
            url: loaderData.canonical,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: DESCRIPTION,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
        },
      ]
    : []),
];

const GROUP_ORDER = ["Site", "Identity", "Contact", "Policies", "Pricing", "Claims"] as const;

type ScanResult =
  | { intent: "scan"; ok: true; scanId: string; origin: string; findings: Finding[] }
  | { intent: "scan"; ok: false; error: string };
type WaitlistResult = { intent: "waitlist"; ok: true; optedIn: boolean } | { intent: "waitlist"; ok: false; error: string };
type AnswerResult = { intent: "answer"; ok: boolean };
type ActionResult = ScanResult | WaitlistResult | AnswerResult;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Link tag for the 7-day test, e.g. /scan?ref=reddit-ppc. Anything else is dropped. */
const cleanRef = (v: FormDataEntryValue | null) => {
  const r = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(r) ? r : null;
};
const SUSPENDED = new Set(["yes", "no", "unsure"]);

export async function action({ request }: ActionFunctionArgs) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return data<ActionResult>({ intent: "scan", ok: false, error: "Something went wrong. Please try again." }, { status: 400 });
  }
  const intent = String(form.get("intent") ?? "scan");
  if (intent === "waitlist") return joinWaitlist(form);
  if (intent === "answer") return saveAnswer(form);
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
    try {
      await prisma.scanContext.create({ data: { scanId: scan.id, channel: cleanRef(form.get("ref")) } });
    } catch (e) {
      console.error("[scan] context not saved", e); // never block the report on stats
    }
    return data<ActionResult>({ intent: "scan", ok: true, scanId: scan.id, origin, findings });
  } catch (e) {
    if (e instanceof CrawlError) return data<ActionResult>({ intent: "scan", ok: false, error: e.message });
    console.error("[scan] unexpected error", e);
    return data<ActionResult>({ intent: "scan", ok: false, error: "We couldn't finish this scan. Please try again in a minute." });
  }
}

/** The two optional questions, saved as soon as they're answered, with or without an email. */
async function saveAnswer(form: FormData) {
  const scanId = String(form.get("scanId") ?? "").slice(0, 40);
  const suspendedRaw = String(form.get("suspended") ?? "");
  const labelRaw = String(form.get("label") ?? "");
  if (!scanId) return data<ActionResult>({ intent: "answer", ok: false }, { status: 400 });
  try {
    const res = await prisma.scanContext.updateMany({
      where: { scanId },
      data: {
        suspended: SUSPENDED.has(suspendedRaw) ? suspendedRaw : null,
        label: labelRaw in LABELS ? labelRaw : null,
      },
    });
    return data<ActionResult>({ intent: "answer", ok: res.count > 0 });
  } catch (e) {
    console.error("[scan] answer not saved", e);
    return data<ActionResult>({ intent: "answer", ok: false });
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
        checks passed · <span className={styles.failText}>{toFix} to fix</span> ·{" "}
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
  const answers = useFetcher<typeof action>();
  const [suspended, setSuspended] = useState("");
  const [label, setLabel] = useState("");
  const res = fetcher.data as ActionResult | undefined;
  if (res?.intent === "waitlist" && res.ok) return <WaitlistThanks optedIn={res.optedIn} />;

  // Save the answers on change, so they count even if the visitor never leaves an email.
  const save = (next: { suspended?: string; label?: string }) => {
    const s = next.suspended ?? suspended;
    const l = next.label ?? label;
    if (next.suspended !== undefined) setSuspended(s);
    if (next.label !== undefined) setLabel(l);
    answers.submit({ intent: "answer", scanId, suspended: s, label: l }, { method: "post" });
  };

  return (
    <fetcher.Form method="post" className={styles.waitlist}>
      <input type="hidden" name="intent" value="waitlist" />
      <input type="hidden" name="scanId" value={scanId} />
      <h2 className={styles.waitlistTitle}>Track your fixes before you request a review</h2>
      <p className={styles.muted}>
        The Shopify app (coming soon) re-scans right before you request a review and lists which checks changed since your
        first scan, so you can paste the list into your review request and keep a record between attempts.
      </p>

      <fieldset className={styles.fieldset}>
        <legend>Is your Merchant Center account currently suspended or warned?</legend>
        {[
          ["yes", "Yes"],
          ["no", "No"],
          ["unsure", "Not sure"],
        ].map(([value, text]) => (
          <label key={value}>
            <input
              type="radio"
              name="suspended"
              value={value}
              checked={suspended === value}
              onChange={() => save({ suspended: value })}
            />{" "}
            {text}
          </label>
        ))}
      </fieldset>

      <label className={styles.field}>
        <span>Which issue does Merchant Center show?</span>
        <select name="label" value={label} onChange={(e) => save({ label: e.currentTarget.value })}>
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
        We use your email only for the launch email and, if you tick the box, the 14-day question. See our <Link to="/privacy">privacy policy</Link>.
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

const NEEDS_NOTE: Record<string, string> = {
  gmcName: "uses the business name you type above",
  app: "in the Shopify app only",
};

/** The list of checks, from the engine itself, so search engines and visitors see what is covered. */
function WhatWeCheck() {
  const active = CHECKS.map(([id]) => id);
  return (
    <section className={styles.about} aria-labelledby="what-we-check">
      <h2 id="what-we-check" className={styles.waitlistTitle}>
        What the check looks at
      </h2>
      <p className={styles.muted}>
        {active.length} checks of your public pages, each one taken from a Google Merchant Center help page. They cover
        the website side of Merchant Center reviews (often labelled &quot;Misrepresentation&quot; or &quot;Website needs
        improvement&quot;), not your product feed or account verification.
      </p>
      {GROUP_ORDER.map((group) => {
        const ids = active.filter((id) => CHECK_INFO[id]?.group === group);
        if (!ids.length) return null;
        return (
          <div key={group}>
            <h3 className={styles.groupTitle}>{group}</h3>
            <ul className={styles.aboutList}>
              {ids.map((id) => {
                const info = CHECK_INFO[id];
                return (
                  <li key={id}>
                    {info.title}
                    {info.needs ? <span className={styles.muted}> ({NEEDS_NOTE[info.needs]})</span> : null} ·{" "}
                    <a href={info.ref} target="_blank" rel="noreferrer">
                      Google&apos;s page ↗
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p>
        <Link to="/guides/gmc-misrepresentation-shopify">
          Read the checklist: what Google&apos;s help pages list for Shopify stores, and where to fix each item
        </Link>
      </p>
    </section>
  );
}

function Faq() {
  return (
    <section className={styles.about} aria-labelledby="faq">
      <h2 id="faq" className={styles.waitlistTitle}>
        Questions
      </h2>
      <h3 className={styles.question}>Does a clean report mean Google will reinstate my account?</h3>
      <p>
        No. Google alone decides. The check covers Google&apos;s published website rules only; a suspension can also come
        from product data, the feed or account verification, which Merchant Center shows in its own issue details.
      </p>
      <h3 className={styles.question}>Why read the HTML before JavaScript runs?</h3>
      <p>
        Google&apos;s{" "}
        <a href={REF.priceMismatch} target="_blank" rel="noreferrer">
          price mismatch help page
        </a>{" "}
        says data passed with JavaScript after the page loads will trigger an error. So the check reads what your store
        sends before any script runs.
      </p>
      <h3 className={styles.question}>How long does a Merchant Center review take?</h3>
      <p>
        Google&apos;s{" "}
        <a href={REF.requestReview} target="_blank" rel="noreferrer">
          review page
        </a>{" "}
        says to wait 7 business days and that a review may take up to 2 weeks. If issues aren&apos;t resolved by the
        second attempt, a one-week cool-down may begin, and it may grow with each unsuccessful review. Fix everything
        you can before you ask.
      </p>
      <h3 className={styles.question}>What do you store?</h3>
      <p>
        The result of each check (pass, fix or check) under a one-way hash of the store address. Not the page content,
        and not the business name you type. See the <Link to="/privacy">privacy policy</Link>.
      </p>
    </section>
  );
}

export default function ScanPage() {
  useLoaderData<typeof loader>(); // canonical URL for meta only
  const result = useActionData<typeof action>() as ActionResult | undefined;
  const [params] = useSearchParams();
  const nav = useNavigation();
  const scanning = nav.state !== "idle" && nav.formData?.get("intent") !== "waitlist";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Check your Shopify store against Merchant Center's website rules</h1>
        <p className={styles.lede}>
          Free, and every finding is shown. Each one links to the Google help page it comes from and says where to fix it
          in Shopify. We read the HTML your store sends, before any JavaScript runs.
        </p>
      </header>

      <Form method="post" className={styles.scanForm}>
        <input type="hidden" name="intent" value="scan" />
        <input type="hidden" name="ref" value={params.get("ref") ?? ""} />
        <label className={styles.field}>
          <span>Store address</span>
          <input name="storeUrl" required placeholder="yourstore.com" inputMode="url" autoComplete="url" maxLength={300} />
        </label>
        <label className={styles.field}>
          <span>
            Business name as shown in Merchant Center{" "}
            <em className={styles.muted}>(optional: we check that your site uses the same name)</em>
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

      <WhatWeCheck />
      <Faq />

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
