import { describe, expect, it } from "vitest";
import { dayIn, safeTimeZone, shortDateIn } from "./dates";

// 01:30 UTC on Nov 24 is still the evening of Nov 23 in New York.
const LATE_EVENING_ET = "2026-11-24T01:30:00.000Z";

describe("dates in the store's time zone", () => {
  it("uses the store's calendar day, not the UTC one", () => {
    expect(dayIn(LATE_EVENING_ET, "UTC")).toBe("2026-11-24");
    expect(dayIn(LATE_EVENING_ET, "America/New_York")).toBe("2026-11-23");
    expect(shortDateIn(LATE_EVENING_ET, "America/New_York")).toBe("Nov 23, 2026");
  });

  it("falls back to UTC for a missing or unknown zone", () => {
    expect(safeTimeZone(undefined)).toBe("UTC");
    expect(safeTimeZone("Not/AZone")).toBe("UTC");
    expect(safeTimeZone("Asia/Ho_Chi_Minh")).toBe("Asia/Ho_Chi_Minh");
  });
});
