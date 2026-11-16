import { describe, expect, it } from "vitest";
import {
  FREE_SCANS,
  PASS_PLAN,
  passFromPurchases,
  refundable,
  scansLeft,
  snapshotAllowed,
  type Purchase,
} from "./pass";

const NOW = new Date("2026-11-15T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 3600_000).toISOString();
const buy = (over: Partial<Purchase> = {}): Purchase => ({
  id: "gid://shopify/AppPurchaseOneTime/1",
  name: PASS_PLAN,
  status: "ACTIVE",
  test: false,
  createdAt: daysAgo(1),
  ...over,
});

describe("passFromPurchases", () => {
  it("is inactive with no purchases", () => {
    expect(passFromPurchases([], false, NOW)).toEqual({ active: false });
  });

  it("is active for 60 days after an approved purchase", () => {
    const s = passFromPurchases([buy({ createdAt: daysAgo(59) })], false, NOW);
    expect(s.active).toBe(true);
    if (s.active) expect(s.expiresAt).toBe(new Date(NOW.getTime() + 24 * 3600_000).toISOString());
  });

  it("expires after 60 days", () => {
    expect(passFromPurchases([buy({ createdAt: daysAgo(61) })], false, NOW).active).toBe(false);
  });

  it("ignores purchases that were not approved", () => {
    for (const status of ["PENDING", "DECLINED", "EXPIRED", "CANCELLED"]) {
      expect(passFromPurchases([buy({ status })], false, NOW).active).toBe(false);
    }
  });

  it("ignores other plans", () => {
    expect(passFromPurchases([buy({ name: "Something else" })], false, NOW).active).toBe(false);
  });

  it("never lets a test charge unlock a real store", () => {
    expect(passFromPurchases([buy({ test: true })], false, NOW).active).toBe(false);
    expect(passFromPurchases([buy({ test: true })], true, NOW).active).toBe(true);
  });

  it("uses the latest purchase when a merchant buys again", () => {
    const s = passFromPurchases(
      [buy({ id: "a", createdAt: daysAgo(70) }), buy({ id: "b", createdAt: daysAgo(10) })],
      false,
      NOW,
    );
    expect(s.active && s.expiresAt).toBe(new Date(NOW.getTime() + 50 * 24 * 3600_000).toISOString());
  });
});

describe("refunds", () => {
  it("revokes the pass as soon as a refund is requested", () => {
    const p = buy({ id: "gid://shopify/AppPurchaseOneTime/9" });
    expect(passFromPurchases([p], false, NOW, new Set([p.id])).active).toBe(false);
  });

  it("allows one refund within 7 days of buying", () => {
    const fresh = passFromPurchases([buy({ createdAt: daysAgo(6) })], false, NOW);
    const old = passFromPurchases([buy({ createdAt: daysAgo(8) })], false, NOW);
    expect(refundable(fresh, 0, NOW)).toBe(true);
    expect(refundable(old, 0, NOW)).toBe(false);
    expect(refundable(fresh, 1, NOW)).toBe(false); // already refunded once on this store
    expect(refundable({ active: false }, 0, NOW)).toBe(false);
  });
});

describe("free limits", () => {
  const free = { active: false } as const;
  const paid = { active: true, expiresAt: daysAgo(-30), test: false, purchaseId: "x", purchasedAt: daysAgo(30) } as const;

  it("counts down free scans and never goes below zero", () => {
    expect(scansLeft(0, free)).toBe(FREE_SCANS);
    expect(scansLeft(FREE_SCANS, free)).toBe(0);
    expect(scansLeft(FREE_SCANS + 5, free)).toBe(0);
  });

  it("has no scan limit with a pass", () => {
    expect(scansLeft(100, paid)).toBeNull();
  });

  it("allows the first snapshot free and later ones with a pass", () => {
    expect(snapshotAllowed(1, free)).toBe(true);
    expect(snapshotAllowed(2, free)).toBe(false);
    expect(snapshotAllowed(2, paid)).toBe(true);
  });
});
