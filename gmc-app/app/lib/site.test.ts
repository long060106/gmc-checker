import { describe, expect, it } from "vitest";
import { LEGACY_HOST, legacyHostRedirect } from "./site.server";

const OLD = `https://${LEGACY_HOST}`;
const NEW = "https://fixlog.me";

const get = (url: string, method = "GET") => new Request(url, { method });
const location = (res: Response | null) => res?.headers.get("Location");

describe("legacyHostRedirect", () => {
  it("does nothing while SHOPIFY_APP_URL is still the old host", () => {
    expect(legacyHostRedirect(get(`${OLD}/scan`), OLD)).toBeNull();
    expect(legacyHostRedirect(get(`${OLD}/scan`), `${OLD}/`)).toBeNull();
  });

  it("does nothing when SHOPIFY_APP_URL is missing or not a URL", () => {
    expect(legacyHostRedirect(get(`${OLD}/scan`), undefined)).toBeNull();
    expect(legacyHostRedirect(get(`${OLD}/scan`), "fixlog.me")).toBeNull();
  });

  it("moves public pages with a 301 and keeps the query string", () => {
    const res = legacyHostRedirect(get(`${OLD}/scan?ref=sc-askoffer`), NEW);
    expect(res?.status).toBe(301);
    expect(location(res)).toBe(`${NEW}/scan?ref=sc-askoffer`);
    expect(location(legacyHostRedirect(get(`${OLD}/guides/gmc-misrepresentation-shopify`), NEW))).toBe(
      `${NEW}/guides/gmc-misrepresentation-shopify`,
    );
    expect(location(legacyHostRedirect(get(`${OLD}/privacy`), NEW))).toBe(`${NEW}/privacy`);
    expect(location(legacyHostRedirect(get(`${OLD}/robots.txt`), NEW))).toBe(`${NEW}/robots.txt`);
    expect(location(legacyHostRedirect(get(`${OLD}/sitemap.xml`), NEW))).toBe(`${NEW}/sitemap.xml`);
    expect(location(legacyHostRedirect(get(`${OLD}/`), NEW))).toBe(`${NEW}/`);
    expect(location(legacyHostRedirect(get(`${OLD}/scan`, "HEAD"), NEW))).toBe(`${NEW}/scan`);
  });

  it("leaves the embedded app, webhooks, email links and the ping on the old host", () => {
    for (const path of [
      "/?shop=demo.myshopify.com&host=abc",
      "/app",
      "/app/pass",
      "/auth/login",
      "/webhooks/compliance",
      "/outcome/tok123",
      "/unsubscribe/tok123",
      "/healthz",
      "/googlee7b8adbd16218b31.html",
    ]) {
      expect(legacyHostRedirect(get(`${OLD}${path}`), NEW), path).toBeNull();
    }
  });

  it("never redirects a form post, so a scan in progress still submits", () => {
    expect(legacyHostRedirect(get(`${OLD}/scan`, "POST"), NEW)).toBeNull();
  });

  it("does nothing on the new host or on localhost", () => {
    expect(legacyHostRedirect(get(`${NEW}/scan`), NEW)).toBeNull();
    expect(legacyHostRedirect(get("http://localhost:3999/scan"), NEW)).toBeNull();
  });
});
