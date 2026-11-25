// Review request kit: a dated, plain-text record of one review request, built from the
// pre-review snapshot. Pure function so it can be tested. Wording rules: it records changes
// to the public storefront; it never predicts or promises an outcome. Google alone decides.
import { dayIn } from "./dates";
import { COOLDOWN, REVIEW_TIME } from "./wording";

export interface KitFixed {
  checkId: string;
  title: string;
  googleRef?: string;
}

export interface KitFlagged extends KitFixed {
  status: "fail" | "warn";
  evidence: string;
  shopifyFix?: string;
}

export interface KitEarlier {
  attemptNo: number;
  requestedAt: string; // ISO
  outcome: string; // pending | reinstated | rejected | unknown
}

export interface KitInput {
  store: string;
  attemptNo: number;
  issue: string; // label text, e.g. "Misrepresentation"
  requestedAt: string; // ISO
  /** Date of the scan the changes are measured from; null when there was nothing to compare. */
  baselineAt: string | null;
  fixed: KitFixed[];
  stillFlagged: KitFlagged[];
  earlier: KitEarlier[];
}

const OUTCOME: Record<string, string> = {
  pending: "waiting for Google",
  reinstated: "reinstated",
  rejected: "not reinstated",
  unknown: "unknown",
};

/** Dates are YYYY-MM-DD in `timeZone`, the store's zone (see ./shop-timezone.server.ts). */
export function buildKitText(k: KitInput, timeZone = "UTC"): string {
  const day = (iso: string) => dayIn(iso, timeZone);
  const out: string[] = [];
  out.push("REVIEW REQUEST RECORD");
  out.push(`Store: ${k.store}`);
  out.push(`Request #${k.attemptNo}, prepared ${day(k.requestedAt)}`);
  out.push(`Issue shown in Merchant Center: ${k.issue}`);
  out.push("");

  if (k.baselineAt) {
    out.push(`WHAT CHANGED SINCE ${day(k.baselineAt)} (found by scanning the public storefront)`);
    if (k.fixed.length) {
      k.fixed.forEach((f, i) => {
        out.push(`${i + 1}. ${f.title}`);
        if (f.googleRef) out.push(`   Google's rule: ${f.googleRef}`);
      });
    } else {
      out.push("No changes detected by the storefront check.");
    }
  } else {
    out.push("WHAT CHANGED");
    out.push("This is the first scan on record, so there is nothing to compare yet. It is saved as the starting point.");
  }
  out.push("");

  out.push("STILL FLAGGED BY THE STOREFRONT CHECK");
  if (k.stillFlagged.length) {
    k.stillFlagged.forEach((f, i) => {
      out.push(`${i + 1}. [${f.status === "fail" ? "Fix" : "Check"}] ${f.title}`);
      out.push(`   What we saw: ${f.evidence}`);
      if (f.shopifyFix) out.push(`   Where to fix: ${f.shopifyFix}`);
      if (f.googleRef) out.push(`   Google's rule: ${f.googleRef}`);
    });
  } else {
    out.push("Nothing. Every storefront criterion we check passed in this snapshot.");
  }
  out.push("");

  if (k.earlier.length) {
    out.push("EARLIER REQUESTS");
    for (const e of [...k.earlier].sort((a, b) => a.attemptNo - b.attemptNo)) {
      out.push(`#${e.attemptNo}, ${day(e.requestedAt)}: ${OUTCOME[e.outcome] ?? e.outcome}`);
    }
    out.push("");
  }

  out.push("BEFORE YOU SEND");
  out.push(`- ${REVIEW_TIME}`);
  out.push(`- ${COOLDOWN} Request one review at a time and wait for the result.`);
  out.push("");
  out.push(
    "Independent tool, not affiliated with Google. This is a record of changes to the public storefront, not a prediction. Google alone decides.",
  );
  return out.join("\n");
}
