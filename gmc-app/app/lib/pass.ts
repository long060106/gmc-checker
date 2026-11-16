// Reinstatement Pass: pure rules (no network, no database) so they can be unit-tested.
// Shopify Billing records the one-time purchase; we decide what it unlocks and for how long.
//
// Free:  every finding of every scan, FREE_SCANS scans per FREE_WINDOW_DAYS, and the first snapshot.
// Pass:  $39 one time, PASS_DAYS days of unlimited scans and snapshots for every review attempt.
// Shopify one-time purchases never expire on Shopify's side, so the 60 days are counted from the
// purchase's createdAt here.

export const PASS_PLAN = "Reinstatement Pass"; // must match the key in shopify.server.ts billing config
export const PASS_PRICE_USD = 39;
export const PASS_DAYS = 60;
export const FREE_SCANS = 3;
export const FREE_WINDOW_DAYS = 30;
export const FREE_ATTEMPTS = 1;
/** Money back on request within this many days of buying, no questions asked. Asking ends the pass. */
export const REFUND_DAYS = 7;

const DAY_MS = 24 * 3600_000;

export interface Purchase {
  id: string;
  name: string;
  status: string; // ACTIVE once the merchant approved it
  test: boolean;
  createdAt: string; // ISO
}

export type PassStatus =
  | { active: true; expiresAt: string; test: boolean; purchaseId: string; purchasedAt: string }
  | { active: false };

/**
 * The pass is active if an approved purchase of the plan was made in the last PASS_DAYS days.
 * Test purchases count only on stores where test charges are expected (development stores),
 * so a test charge can never unlock a real store. Purchases in `revoked` (refund requested) never count.
 */
export function passFromPurchases(
  purchases: Purchase[],
  allowTest: boolean,
  now: Date = new Date(),
  revoked: ReadonlySet<string> = new Set(),
): PassStatus {
  let best: { expires: number; p: Purchase } | null = null;
  for (const p of purchases) {
    if (p.name !== PASS_PLAN || p.status !== "ACTIVE") continue;
    if (p.test && !allowTest) continue;
    if (revoked.has(p.id)) continue;
    const created = Date.parse(p.createdAt);
    if (Number.isNaN(created)) continue;
    const expires = created + PASS_DAYS * DAY_MS;
    if (expires <= now.getTime()) continue;
    if (!best || expires > best.expires) best = { expires, p };
  }
  return best
    ? {
        active: true,
        expiresAt: new Date(best.expires).toISOString(),
        test: best.p.test,
        purchaseId: best.p.id,
        purchasedAt: best.p.createdAt,
      }
    : { active: false };
}

/**
 * Whether the merchant can still ask for their money back on the current pass:
 * within REFUND_DAYS of buying, and only once per store (buy, use, refund, repeat is not a free plan).
 */
export function refundable(pass: PassStatus, priorRefunds: number, now: Date = new Date()): boolean {
  return pass.active && priorRefunds === 0 && now.getTime() - Date.parse(pass.purchasedAt) < REFUND_DAYS * DAY_MS;
}

/** Start of the rolling window for counting free scans. */
export function freeWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - FREE_WINDOW_DAYS * DAY_MS);
}

/** Free scans left in the rolling window; null means unlimited (pass active). */
export function scansLeft(scansInWindow: number, pass: PassStatus): number | null {
  if (pass.active) return null;
  return Math.max(0, FREE_SCANS - scansInWindow);
}

/** Whether the merchant may record review attempt number `attemptNo` (1-based). */
export function snapshotAllowed(attemptNo: number, pass: PassStatus): boolean {
  return pass.active || attemptNo <= FREE_ATTEMPTS;
}
