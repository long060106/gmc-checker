// Copy that must read the same in the app, the review kit and the public /scan page.
import type { Status } from "../engine/types";

// Google's "Request a review" help page (REF.requestReview, read 2026-11-24), in our words.
export const REVIEW_TIME = "Google says a review takes about 7 business days and can take up to 2 weeks.";
export const COOLDOWN =
  "If issues aren't resolved by your second review, Google says a one-week cool-down may begin, and it may get longer with each unsuccessful review.";

// What a clean report can't tell you (feedback 2026-11-25, point 8).
export const ALL_PASS_NOTE =
  "Every storefront check passed. These checks only cover your public pages: Google also reviews your product data, feed and account verification, which this check can't see. So a store can pass every check here and still stay suspended.";

/** "19 checks: 14 passed, 2 to check, 3 not checked". The total comes first, so the count never seems to change. */
export function checkSummary(statuses: Status[]): string {
  const n = (s: Status) => statuses.filter((x) => x === s).length;
  const parts = [`${n("pass")} passed`];
  if (n("fail")) parts.push(`${n("fail")} to fix`);
  if (n("warn")) parts.push(`${n("warn")} to check`);
  if (n("na")) parts.push(`${n("na")} not checked`);
  return `${statuses.length} checks: ${parts.join(", ")}`;
}

/** True when nothing is left to fix or check (some checks may not have run). */
export const allPassed = (statuses: Status[]) => statuses.some((s) => s === "pass") && !statuses.some((s) => s === "fail" || s === "warn");
