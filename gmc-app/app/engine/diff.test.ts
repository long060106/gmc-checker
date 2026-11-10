import { describe, expect, it } from "vitest";
import { diffScans } from "./diff";

describe("diffScans", () => {
  it("finds fixed, regressed and still-failing checks", () => {
    const d = diffScans(
      { "RET-01": "fail", "CON-01": "warn", "SITE-02": "pass", "PRC-01": "fail" },
      { "RET-01": "pass", "CON-01": "pass", "SITE-02": "fail", "PRC-01": "warn" },
    );
    expect(d.fixed.sort()).toEqual(["CON-01", "RET-01"]);
    expect(d.regressed).toEqual(["SITE-02"]);
    expect(d.stillFailing.sort()).toEqual(["PRC-01", "SITE-02"]);
  });

  it("ignores n/a on either side", () => {
    const d = diffScans({ "ID-01": "na", "PRC-01": "fail" }, { "ID-01": "pass", "PRC-01": "na" });
    expect(d.fixed).toEqual([]);
    expect(d.regressed).toEqual([]);
    expect(d.stillFailing).toEqual([]);
  });

  it("ignores checks the baseline didn't have (new checks are not 'fixes')", () => {
    const d = diffScans({}, { "CON-03": "pass", "TRU-01": "fail" });
    expect(d.fixed).toEqual([]);
    expect(d.stillFailing).toEqual(["TRU-01"]);
  });

  it("returns empty lists for identical scans", () => {
    const s = { "RET-01": "pass" as const, "SHP-01": "pass" as const };
    expect(diffScans(s, s)).toEqual({ fixed: [], regressed: [], stillFailing: [] });
  });
});
