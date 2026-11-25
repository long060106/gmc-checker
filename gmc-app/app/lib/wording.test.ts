import { describe, expect, it } from "vitest";
import { allPassed, checkSummary, COOLDOWN } from "./wording";

describe("checkSummary", () => {
  it("leads with the total and skips empty groups", () =>
    expect(checkSummary(["pass", "pass", "warn", "na"])).toBe("4 checks: 2 passed, 1 to check, 1 not checked"));
  it("lists everything in a fixed order", () =>
    expect(checkSummary(["na", "fail", "warn", "pass"])).toBe("4 checks: 1 passed, 1 to fix, 1 to check, 1 not checked"));
});

describe("allPassed", () => {
  it("is true with passes and skipped checks only", () => expect(allPassed(["pass", "na"])).toBe(true));
  it("is false when anything is left to check", () => expect(allPassed(["pass", "warn"])).toBe(false));
  it("is false when nothing ran", () => expect(allPassed(["na"])).toBe(false));
});

it("COOLDOWN keeps Google's hedges", () => {
  expect(COOLDOWN).toContain("second review");
  expect(COOLDOWN).toContain("may begin");
});
