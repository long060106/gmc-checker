import { describe, expect, it } from "vitest";
import { buildKitText, type KitInput } from "./kit";

const base: KitInput = {
  store: "demo.myshopify.com",
  attemptNo: 2,
  issue: "Misrepresentation",
  requestedAt: "2026-11-16T10:00:00.000Z",
  baselineAt: "2026-11-01T09:00:00.000Z",
  fixed: [{ checkId: "CON-01", title: "Contact page exists and is linked", googleRef: "https://support.google.com/x" }],
  stillFlagged: [
    {
      checkId: "RET-01",
      title: "Refund policy page loads and is linked",
      status: "fail",
      evidence: "No refund policy page",
      shopifyFix: "Settings → Policies",
      googleRef: "https://support.google.com/y",
    },
  ],
  earlier: [{ attemptNo: 1, requestedAt: "2026-11-02T00:00:00.000Z", outcome: "rejected" }],
};

describe("buildKitText", () => {
  it("lists changes, open items with where to fix, and earlier requests", () => {
    const t = buildKitText(base);
    expect(t).toContain("Request #2, prepared 2026-11-16");
    expect(t).toContain("WHAT CHANGED SINCE 2026-11-01");
    expect(t).toContain("1. Contact page exists and is linked");
    expect(t).toContain("[Fix] Refund policy page loads and is linked");
    expect(t).toContain("Where to fix: Settings → Policies");
    expect(t).toContain("#1, 2026-11-02: not reinstated");
  });

  it("says so plainly when there is nothing to compare or nothing flagged", () => {
    const t = buildKitText({ ...base, baselineAt: null, stillFlagged: [], earlier: [] });
    expect(t).toContain("first scan on record");
    expect(t).toContain("Every storefront criterion we check passed");
    expect(t).not.toContain("EARLIER REQUESTS");
  });

  it("never promises an outcome", () => {
    const t = buildKitText(base).toLowerCase();
    for (const banned of ["guarantee", "will be reinstated", "approval chance", "readiness"]) {
      expect(t).not.toContain(banned);
    }
    expect(t).toContain("google alone decides");
  });
});
