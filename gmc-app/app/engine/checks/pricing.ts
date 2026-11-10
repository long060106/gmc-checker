import type { CheckFn, Page } from "../types";
import { FIX, REF } from "../refs";
import { productOffers, textOf } from "../html";
import { ok, pathOf } from "./util";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Does the visible text show this price? Accepts 1299.00 / 1,299.00 / 1299,00 / 1.299,00 / $1,299 */
export function priceShown(text: string, raw: string): boolean {
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  const [i, d] = n.toFixed(2).split(".");
  const intUS = Number(i).toLocaleString("en-US");
  const intEU = Number(i).toLocaleString("de-DE");
  const decimals = [`${i}.${d}`, `${intUS}.${d}`, `${i},${d}`, `${intEU},${d}`];
  if (decimals.some((f) => new RegExp(`(?<![\\d.,])${esc(f)}(?!\\d)`).test(text))) return true;
  if (d === "00") {
    // Whole prices are often shown without decimals — only trust them next to a currency sign/code.
    const cur = "(?:[$€£¥₹]|USD|CAD|AUD|NZD|EUR|GBP|Rs\\.?)";
    return [i, intUS, intEU].some((f) =>
      new RegExp(`${cur}\\s?${esc(f)}(?![\\d.,]?\\d)|(?<![\\d.,])${esc(f)}\\s?${cur}`).test(text),
    );
  }
  return false;
}

const sampled = (products: Page[] | undefined) => (products ?? []).filter(ok);

// PRC-01 — the structured-data price appears on the page, with a currency.
export const checkStructuredPrice: CheckFn = (s) => {
  const base = { checkId: "PRC-01", googleRef: REF.structuredData, shopifyFix: `${FIX.products}; ${FIX.theme}` };
  const prods = sampled(s.products);
  if (!prods.length) return { ...base, status: "na", evidence: "No product pages could be sampled" };
  const issues: string[] = [];
  let checked = 0;
  for (const p of prods) {
    const offers = productOffers(p.html).filter((o) => o.price);
    if (!offers.length) continue;
    checked++;
    if (!offers.some((o) => priceShown(textOf(p.html), o.price!))) {
      issues.push(`${pathOf(p)}: structured data says ${offers[0].price} ${offers[0].priceCurrency ?? ""}, not found in the page text`);
    }
    if (offers.some((o) => !o.priceCurrency)) issues.push(`${pathOf(p)}: structured data has no priceCurrency`);
  }
  if (!checked) {
    return { ...base, status: "na", evidence: "Sampled products have no Product structured data, so Google reads the visible price only" };
  }
  // Heuristic (price formats vary) → "warn", never "fail"; the evidence lets the merchant verify.
  if (issues.length) return { ...base, status: "warn", evidence: issues.slice(0, 3).join(" | ") };
  return { ...base, status: "pass", evidence: `${checked} products: structured-data price matches the page` };
};

const CURRENCY_NUMBER =
  /(?:[$€£¥₹]|\b(?:USD|CAD|AUD|NZD|EUR|GBP)\b|Rs\.?)\s?\d|\d[\d.,]*\s?(?:[$€£]|\b(?:USD|CAD|AUD|NZD|EUR|GBP|kr|zł)\b)/i;

// PRC-02 — a price is present in the server HTML (Google doesn't run your JavaScript for this).
export const checkPriceInHtml: CheckFn = (s) => {
  const base = { checkId: "PRC-02", googleRef: REF.priceMismatch, shopifyFix: FIX.theme };
  const prods = sampled(s.products);
  if (!prods.length) return { ...base, status: "na", evidence: "No product pages could be sampled" };
  const missing = prods.filter((p) => !CURRENCY_NUMBER.test(textOf(p.html))).map(pathOf);
  if (!missing.length) return { ...base, status: "pass", evidence: `${prods.length} products show a price in the server HTML` };
  return {
    ...base,
    status: missing.length === prods.length ? "fail" : "warn",
    evidence: `No price in the server HTML (it may be added by JavaScript): ${missing.join(", ")}`,
  };
};

// PRC-03 — stock status in structured data agrees with the page.
export const checkAvailabilityMatch: CheckFn = (s) => {
  const base = { checkId: "PRC-03", googleRef: REF.misrepresentation, shopifyFix: `${FIX.products} (inventory)` };
  const issues: string[] = [];
  let checked = 0;
  for (const p of sampled(s.products)) {
    const avail = productOffers(p.html).map((o) => (o.availability ?? "").toLowerCase()).filter(Boolean);
    if (!avail.length) continue;
    checked++;
    const allOut = avail.every((a) => /outofstock|soldout|discontinued/.test(a));
    const allIn = avail.every((a) => /instock/.test(a));
    const soldOutText = /\b(sold out|out of stock|currently unavailable)\b/i.test(textOf(p.html));
    const buyDisabled = /name\s*=\s*["']add["'][^>]*\bdisabled\b/i.test(p.html);
    if (allOut && !soldOutText) issues.push(`${pathOf(p)}: structured data says out of stock, the page doesn't say so`);
    if (allIn && buyDisabled) issues.push(`${pathOf(p)}: structured data says in stock, but the buy button is disabled`);
  }
  if (!checked) return { ...base, status: "na", evidence: "No stock status in structured data on sampled products" };
  if (issues.length) return { ...base, status: "warn", evidence: issues.slice(0, 3).join(" | ") };
  return { ...base, status: "pass", evidence: `${checked} products: stock status agrees with the page` };
};
