import { describe, expect, it } from "vitest";
import { CrawlError, isPrivateIp, normalizeStoreUrl } from "./crawl.server";
import { extractJsonLd, extractLinks, mainText, productOffers, textOf } from "./html";

describe("SSRF guard", () => {
  it("blocks private and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    expect(isPrivateIp("23.227.38.65")).toBe(false); // a Shopify edge IP
    expect(isPrivateIp("2606:4700::1")).toBe(false);
  });
});

describe("normalizeStoreUrl", () => {
  it("adds https and keeps only the origin", () => {
    expect(normalizeStoreUrl("acme.test/products/mug?x=1").toString()).toBe("https://acme.test/");
    expect(normalizeStoreUrl("http://acme.test").protocol).toBe("https:");
  });
  it("rejects empty input with a friendly error", () => {
    expect(() => normalizeStoreUrl("  ")).toThrow(CrawlError);
  });
});

describe("html helpers", () => {
  it("textOf drops scripts and decodes entities", () => {
    expect(textOf("<p>Hi&nbsp;there</p><script>var x=1</script>")).toBe("Hi there");
  });
  it("extractLinks resolves relative links and skips mailto/#", () => {
    const links = extractLinks(`<a href="/pages/about">About</a><a href="mailto:a@b.c">m</a><a href="#top">t</a>`, "https://acme.test/");
    expect(links).toEqual([{ href: "https://acme.test/pages/about", text: "About" }]);
  });
  it("extractJsonLd flattens @graph and survives bad JSON", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Organization"}]}</script><script type="application/ld+json">{bad</script>`;
    expect(extractJsonLd(html).map((o) => o["@type"])).toContain("Organization");
  });
  it("productOffers reads offers arrays", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","offers":[{"price":"9.50","priceCurrency":"USD"}]}</script>`;
    expect(productOffers(html)).toEqual([{ price: "9.50", priceCurrency: "USD", availability: undefined }]);
  });
  it("mainText prefers the Shopify policy body", () => {
    const html = `<header>NAV NAV</header><main><div class="shopify-policy__body"><p>Policy text</p></div></main><footer>FOOT</footer>`;
    expect(mainText(html)).toBe("Policy text");
  });
});
