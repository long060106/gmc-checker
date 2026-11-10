import { describe, expect, it } from "vitest";
import { HOME_HTML, LONG_REFUND, ORIGIN, page, policy, product, snap } from "./fixtures";
import { checkBusinessNameConsistent, checkBusinessNameFormat } from "./identity";
import { checkAboutPage, checkContactPage, checkSupportEmailDomain, registrableDomain } from "./contact";
import { checkPolicyPlaceholders, checkPrivacyAndTerms, checkRefundPage, checkShippingPolicy } from "./policies";
import { checkBrokenLinks, checkPlaceholders, checkPublicAccess, checkSocialLinks } from "./site";
import { checkAvailabilityMatch, checkPriceInHtml, checkStructuredPrice, priceShown } from "./pricing";
import { checkFakeEndorsement, checkUnreliableClaims } from "./claims";
import { runAll, CHECK_INFO, CHECKS } from "../run";

const st = (f: { status: string }) => f.status;

describe("ID-01 business name consistency", () => {
  const refund = page(policy("Acme Goods returns..."), "/policies/refund-policy");
  it("is n/a without a name", () => expect(st(checkBusinessNameConsistent(snap(), {}))).toBe("na"));
  it("passes when the exact name is in several places", () =>
    expect(st(checkBusinessNameConsistent(snap({ pages: { refund } }), { gmcBusinessName: "Acme Goods" }))).toBe("pass"));
  it("warns on the ABC Company vs abccompany.com pattern", () => {
    const home = page(`<html><head><title>abccompany.com</title></head><body>Welcome to abccompany.com</body></html>`);
    expect(st(checkBusinessNameConsistent(snap({ pages: { home } }), { gmcBusinessName: "ABC Company" }))).toBe("warn");
  });
  it("fails when the name is nowhere", () =>
    expect(st(checkBusinessNameConsistent(snap(), { gmcBusinessName: "Zebra Imports" }))).toBe("fail"));
});

describe("ID-02 business name format", () => {
  const f = (n: string) => st(checkBusinessNameFormat(snap(), { gmcBusinessName: n }));
  it("passes a clean short name", () => expect(f("Acme Goods")).toBe("pass"));
  it("fails a company suffix", () => expect(f("Acme Goods LLC")).toBe("fail"));
  it("fails all caps", () => expect(f("ACME GOODS")).toBe("fail"));
  it("fails promo text", () => expect(f("Acme Goods Free Shipping")).toBe("fail"));
  it("does not flag 'Taco' as a 'Co' suffix", () => expect(f("Taco")).toBe("pass"));
  it("warns over 20 characters", () => expect(f("Acme Handmade Ceramics")).toBe("warn"));
});

describe("CON-01 / CON-04 / ABT-01", () => {
  const contact = page("<html><body><main>Write to support@acme.test</main></body></html>", "/pages/contact");
  it("CON-01 passes when the page loads and is linked", () => expect(st(checkContactPage(snap({ pages: { contact } })))).toBe("pass"));
  it("CON-01 fails on 404", () =>
    expect(st(checkContactPage(snap({ pages: { contact: page("nope", "/pages/contact", 404) } })))).toBe("fail"));
  it("CON-01 warns when not linked from home", () => {
    const c = page("<html><body>hi</body></html>", "/pages/get-in-touch");
    expect(st(checkContactPage(snap({ pages: { contact: c } })))).toBe("warn");
  });
  it("CON-04 passes for an own-domain email", () => expect(st(checkSupportEmailDomain(snap({ pages: { contact } })))).toBe("pass"));
  it("CON-04 warns for gmail only", () => {
    const c = page("<html><body>acmegoods@gmail.com</body></html>", "/pages/contact");
    expect(st(checkSupportEmailDomain(snap({ pages: { contact: c } })))).toBe("warn");
  });
  it("CON-04 ignores image file names that look like emails", () => {
    const c = page(`<html><body><img src="logo@2x.png"></body></html>`, "/pages/contact");
    expect(st(checkSupportEmailDomain(snap({ pages: { contact: c } })))).toBe("na");
  });
  it("registrableDomain handles co.uk", () => expect(registrableDomain("shop.acme.co.uk")).toBe("acme.co.uk"));
  it("ABT-01 passes / fails", () => {
    expect(st(checkAboutPage(snap({ pages: { about: page("<p>Our story</p>", "/pages/about-us") } })))).toBe("pass");
    expect(st(checkAboutPage(snap({ pages: { about: page("", "/pages/about-us", 404) } })))).toBe("fail");
  });
});

describe("policies", () => {
  const refund = page(LONG_REFUND, "/policies/refund-policy");
  it("RET-01 passes a long, linked policy", () => expect(st(checkRefundPage(snap({ pages: { refund } })))).toBe("pass"));
  it("RET-01 warns on a very short policy", () =>
    expect(st(checkRefundPage(snap({ pages: { refund: page(policy("All sales final."), "/policies/refund-policy") } })))).toBe("warn"));
  it("RET-01 fails when missing", () => expect(st(checkRefundPage(snap()))).toBe("fail"));
  it("RET-01 ignores header/footer words when counting", () => {
    const html = policy("All sales final.").replace("<header>Menu</header>", `<header>${"menu item ".repeat(100)}</header>`);
    expect(st(checkRefundPage(snap({ pages: { refund: page(html, "/policies/refund-policy") } })))).toBe("warn");
  });

  it("SHP-01 passes with cost and time", () => {
    const shipping = page(policy("Orders ship within 2 business days. Shipping is free over $50, otherwise a flat rate of $5."), "/policies/shipping-policy");
    expect(st(checkShippingPolicy(snap({ pages: { shipping } })))).toBe("pass");
  });
  it("SHP-01 fails with neither", () => {
    const shipping = page(policy("We ship worldwide."), "/policies/shipping-policy");
    expect(st(checkShippingPolicy(snap({ pages: { shipping } })))).toBe("fail");
  });

  it("POL-01 warns when terms are missing", () =>
    expect(st(checkPrivacyAndTerms(snap({ pages: { privacy: page(policy("p"), "/policies/privacy-policy") } })))).toBe("warn"));

  it("POL-02 catches template leftovers", () => {
    const terms = page(policy("These terms apply to [Store name]. Contact us at [email address]."), "/policies/terms-of-service");
    expect(st(checkPolicyPlaceholders(snap({ pages: { terms } })))).toBe("fail");
  });
  it("POL-02 passes clean policies", () => expect(st(checkPolicyPlaceholders(snap({ pages: { refund } })))).toBe("pass"));
});

describe("site", () => {
  it("SITE-01 catches Dawn default copy", () => {
    const home = page(`<html><body><h2>Talk about your brand</h2></body></html>`);
    expect(st(checkPlaceholders(snap({ pages: { home } })))).toBe("fail");
  });
  it("SITE-01 passes clean pages", () => expect(st(checkPlaceholders(snap()))).toBe("pass"));

  it("SITE-02 fails on a 404 link, warns on redirect-to-home, ignores 429", () => {
    const l = (path: string, status: number, final = path) => ({ url: ORIGIN + path, status, finalUrl: ORIGIN + final });
    expect(st(checkBrokenLinks(snap({ links: [l("/pages/faq", 404)] })))).toBe("fail");
    expect(st(checkBrokenLinks(snap({ links: [l("/collections/old", 200, "/")] })))).toBe("warn");
    expect(st(checkBrokenLinks(snap({ links: [l("/collections/all", 429)] })))).toBe("pass");
    expect(st(checkBrokenLinks(snap()))).toBe("na");
  });

  it("SITE-03 passes real profiles, fails theme defaults, ignores share links", () => {
    expect(st(checkSocialLinks(snap()))).toBe("pass");
    const bad = page(`<a href="https://facebook.com/shopify">fb</a><a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>`);
    expect(st(checkSocialLinks(snap({ pages: { home: bad } })))).toBe("fail");
    const none = page(`<a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>`);
    expect(st(checkSocialLinks(snap({ pages: { home: none } })))).toBe("warn");
  });

  it("SITE-04 fails on the password page", () => {
    const home = page("<form action='/password'></form>", "/", 200, "/password");
    expect(st(checkPublicAccess(snap({ pages: { home } })))).toBe("fail");
    expect(st(checkPublicAccess(snap()))).toBe("pass");
  });
});

describe("pricing", () => {
  it("priceShown handles common formats", () => {
    expect(priceShown("Price $29.99", "29.99")).toBe(true);
    expect(priceShown("Preis 1.299,00 €", "1299.00")).toBe(true);
    expect(priceShown("Only $1,299 today", "1299")).toBe(true);
    expect(priceShown("29 reviews", "29.00")).toBe(false); // bare integer without currency doesn't count
    expect(priceShown("Price $129.99", "29.99")).toBe(false);
  });

  it("PRC-01 passes a match, warns a mismatch, n/a without structured data", () => {
    const good = product({ price: "29.99", currency: "USD", visible: "$29.99" });
    const bad = product({ price: "24.99", currency: "USD", visible: "$29.99" });
    const none = product({ visible: "$29.99" });
    expect(st(checkStructuredPrice(snap({ products: [good] })))).toBe("pass");
    expect(st(checkStructuredPrice(snap({ products: [bad] })))).toBe("warn");
    expect(st(checkStructuredPrice(snap({ products: [none] })))).toBe("na");
  });

  it("PRC-02 fails when no product shows a price in HTML", () => {
    expect(st(checkPriceInHtml(snap({ products: [product({ visible: "" })] })))).toBe("fail");
    expect(st(checkPriceInHtml(snap({ products: [product({ visible: "$29.99" })] })))).toBe("pass");
  });

  it("PRC-03 warns when in-stock data meets a disabled buy button", () => {
    const p = product({ price: "29.99", currency: "USD", visible: "$29.99", availability: "https://schema.org/InStock", buyDisabled: true });
    expect(st(checkAvailabilityMatch(snap({ products: [p] })))).toBe("warn");
    const fine = product({ price: "29.99", currency: "USD", visible: "$29.99", availability: "https://schema.org/InStock" });
    expect(st(checkAvailabilityMatch(snap({ products: [fine] })))).toBe("pass");
  });
});

describe("claims", () => {
  it("CLM-01 warns on 'miracle', not on 'secure' or 'cured'", () => {
    expect(st(checkUnreliableClaims(snap({ pages: { home: page("<p>A miracle cream</p>") } })))).toBe("warn");
    expect(st(checkUnreliableClaims(snap({ pages: { home: page("<p>Secure checkout. Cured salami.</p>") } })))).toBe("pass");
  });
  it("TRU-01 fails on a Google Trusted Store badge, ignores the site-verification meta tag", () => {
    const badge = page(`<img src="/badges/google-trusted-store.png" alt="Google Trusted Store">`);
    expect(st(checkFakeEndorsement(snap({ pages: { home: badge } })))).toBe("fail");
    const meta = page(`<head><meta name="google-site-verification" content="abc"></head>${HOME_HTML}`);
    expect(st(checkFakeEndorsement(snap({ pages: { home: meta } })))).toBe("pass");
  });
});

describe("runAll", () => {
  it("returns one finding per registered check, never throws", () => {
    const findings = runAll(snap(), { gmcBusinessName: "Acme Goods" });
    expect(findings).toHaveLength(CHECKS.length);
    for (const f of findings) expect(CHECK_INFO[f.checkId]).toBeDefined();
  });
  it("survives an empty snapshot", () => {
    expect(() => runAll({ pages: {} })).not.toThrow();
  });
});
