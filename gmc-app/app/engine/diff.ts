// Compares two scans of the same store. Pure: no I/O.
// Used by the "I'm about to request a review" snapshot: the fixes come from this diff,
// not from the merchant's memory (self-report bias).
import type { Status } from "./types";

export interface ScanDiff {
  fixed: string[]; // fail|warn → pass
  regressed: string[]; // pass → fail|warn
  stillFailing: string[]; // fail|warn in the snapshot
}

const flagged = (s: Status | undefined) => s === "fail" || s === "warn";

/**
 * Only valid when both scans used the same ENGINE_VERSION — otherwise a "fix" may just be
 * a changed check. Callers must check that first.
 * "na" (not checked) on either side is ignored: we can't say anything changed.
 */
export function diffScans(baseline: Record<string, Status>, snapshot: Record<string, Status>): ScanDiff {
  const fixed: string[] = [];
  const regressed: string[] = [];
  const stillFailing: string[] = [];
  for (const [id, now] of Object.entries(snapshot)) {
    const before = baseline[id];
    if (flagged(now)) stillFailing.push(id);
    if (before === undefined || before === "na" || now === "na") continue;
    if (flagged(before) && now === "pass") fixed.push(id);
    if (before === "pass" && flagged(now)) regressed.push(id);
  }
  return { fixed, regressed, stillFailing };
}

/**
 * A scan that saw nothing but the password page or an unreachable store: every check except
 * "store is public" (SITE-04) is "na". Such a scan can't be a baseline: nothing in it can change.
 */
/**
 * Whether a stored scan may be the baseline of a snapshot diff. In-app scans always can. A public /scan
 * can be run by anyone for any store, so it counts only when no Merchant Center name was typed in:
 * then its results come from the storefront alone, never from what the visitor entered.
 */
export function canBeBaseline(scan: { source: string; gmcNameProvided: boolean }): boolean {
  return scan.source === "app" || !scan.gmcNameProvided;
}

export function isBlockedScan(results: Record<string, Status>): boolean {
  const others = Object.entries(results).filter(([id]) => id !== "SITE-04");
  return others.length > 0 && others.every(([, s]) => s === "na");
}
