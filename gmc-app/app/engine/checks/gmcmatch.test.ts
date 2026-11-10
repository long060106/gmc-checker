import { describe, expect, it } from "vitest";
import { addressFound, addressTokens, checkGmcContactMatch, emailFound, phoneFound } from "./gmcmatch";
import { page, snap } from "./fixtures";

const contact = page(
  `<html><body><main>Call (555) 123-4567 or write to <a href="mailto:Support@Acme.test">us</a>.
   Acme Goods, 123 Main Street, Springfield, IL 62704</main></body></html>`,
  "/pages/contact",
);
const s = snap({ pages: { contact } });
const st = (f: { status: string }) => f.status;

describe("helpers", () => {
  it("phoneFound absorbs country codes and formatting", () => {
    expect(phoneFound("Call (555) 123-4567", "+1 555-123-4567")).toBe(true);
    expect(phoneFound("Tel 020 7946 0958", "+44 20 7946 0958")).toBe(true);
    expect(phoneFound("Call (555) 123-4567", "555-999-0000")).toBe(false);
    expect(phoneFound("anything", "123")).toBe(false); // too short to judge
  });
  it("phoneFound does not glue separate numbers together", () => {
    expect(phoneFound("Price 29.99 Qty 12 Ref 345678", "2999123456")).toBe(false);
  });
  it("emailFound is case-insensitive and sees mailto links", () => {
    expect(emailFound(`<a href="mailto:Support@Acme.test">`, "support@acme.test")).toBe(true);
  });
  it("addressTokens picks number, street word, postal code", () => {
    expect(addressTokens("123 Main Street, Springfield, IL 62704")).toEqual(["123", "main", "62704"]);
    expect(addressTokens("10 Downing Street, London SW1A 2AA")).toEqual(["10", "downing", "sw1a 2aa"]);
  });
  it("addressFound needs all tokens", () => {
    expect(addressFound("123 Main St, Springfield IL 62704", "123 Main Street, Springfield, IL 62704")).toBe(true);
    expect(addressFound("123 Main St, Springfield IL 62705", "123 Main Street, Springfield, IL 62704")).toBe(false);
  });
});

describe("CON-03", () => {
  it("is n/a without any Merchant Center fields", () => expect(st(checkGmcContactMatch(s, {}))).toBe("na"));
  it("passes when everything matches", () =>
    expect(
      st(checkGmcContactMatch(s, { gmcPhone: "+1 555 123 4567", gmcEmail: "support@acme.test", gmcAddress: "123 Main Street, Springfield, IL 62704" })),
    ).toBe("pass"));
  it("warns when some fields don't match", () => {
    const f = checkGmcContactMatch(s, { gmcPhone: "+1 555 123 4567", gmcEmail: "sales@acme.test" });
    expect(f.status).toBe("warn");
    expect(f.evidence).toContain("email (sales@acme.test)");
  });
  it("fails when nothing matches", () =>
    expect(st(checkGmcContactMatch(s, { gmcPhone: "+1 212 000 1111", gmcEmail: "x@other.test" }))).toBe("fail"));
});
