import type { CheckFn } from "../types";
import { FIX, REF } from "../refs";
import { mainText, snippet } from "../html";
import { homeLinksTo, ok, pathOf } from "./util";

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

// RET-01 — refund policy page loads without login and the home page links to it.
export const checkRefundPage: CheckFn = (s) => {
  const base = { checkId: "RET-01", googleRef: REF.editorial, shopifyFix: FIX.refund };
  const p = s.pages.refund;
  if (!ok(p)) {
    return { ...base, status: "fail", evidence: `Refund policy page ${p?.url ?? "/policies/refund-policy"} returned ${p?.status || "no response"}` };
  }
  const n = words(mainText(p.html));
  if (n < 50) return { ...base, status: "warn", evidence: `Refund policy is very short (${n} words)` };
  if (!homeLinksTo(s, pathOf(p))) {
    return { ...base, shopifyFix: FIX.navigation, status: "warn", evidence: `Refund policy exists (${n} words) but the home page doesn't link to it (usually the footer menu)` };
  }
  return { ...base, status: "pass", evidence: `Refund policy loads (${n} words) and is linked from the home page` };
};

// TODO(Long): RET-02 checkRefundContent goes here — follow the worked example in research/2026-11-09-steps-4-7.md.

const SHIP_COST = /(free shipping|shipping (?:is )?free|flat[- ]rate|shipping (?:rates?|costs?|fees?|charges?)|calculated at checkout|[$€£]\s?\d)/i;
const SHIP_TIME = /(\d+\s*(?:-|–|to)\s*\d+\s*(?:business |working )?days|\d+\s*(?:business |working )?days?|delivery times?|processing times?|ships? within)/i;
// On a general page (help, FAQ) a bare "30 days" is usually the return window, so only ranges,
// business/working days and explicit delivery wording count as delivery times there.
const INFO_TIME = /(\d+\s*(?:-|–|to)\s*\d+\s*(?:business |working )?days|\d+\s*(?:business|working) days?|delivery times?|processing times?|ships? within|dispatch(?:ed)? within)/i;
const SHIP_WORD = /\b(?:shipping|shipped|ships?|delivery|deliveries|delivered)\b/gi;

/**
 * The parts of a page within `radius` characters of a shipping word, overlapping parts merged.
 * A help or FAQ page also covers refunds and prices, so "$40" there only counts as a shipping
 * cost when it sits near a word like "shipping" or "delivery".
 */
export function nearShippingWords(text: string, radius = 150): string[] {
  const out: string[] = [];
  let from = 0;
  let to = -1;
  for (const m of text.matchAll(SHIP_WORD)) {
    const i = m.index ?? 0;
    const a = Math.max(0, i - radius);
    const b = i + m[0].length + radius;
    if (to >= 0 && a <= to) {
      to = b;
      continue;
    }
    if (to >= 0) out.push(text.slice(from, to));
    from = a;
    to = b;
  }
  if (to >= 0) out.push(text.slice(from, to));
  return out;
}

// SHP-01 — shipping policy exists and states costs and delivery times. When the home page links a
// separate shipping page (pages.shippingInfo) that has what the policy page lacks, it's a warning
// that names both pages, not a fail: the info is on the site, just not on the policy page.
export const checkShippingPolicy: CheckFn = (s) => {
  const base = { checkId: "SHP-01", googleRef: REF.misrepresentation, shopifyFix: FIX.shipping };
  const p = s.pages.shipping;
  const policyText = ok(p) ? mainText(p.html) : "";
  const onPolicy = { cost: SHIP_COST.test(policyText), time: SHIP_TIME.test(policyText) };
  if (ok(p) && onPolicy.cost && onPolicy.time) {
    return { ...base, status: "pass", evidence: "States shipping costs and delivery times" };
  }

  const info = ok(s.pages.shippingInfo) ? s.pages.shippingInfo : undefined;
  const infoPath = info ? pathOf(info) : "";
  const near = info ? nearShippingWords(mainText(info.html)) : [];
  const onInfo = { cost: near.some((t) => SHIP_COST.test(t)), time: near.some((t) => INFO_TIME.test(t)) };
  const missing = [
    !(onPolicy.cost || onInfo.cost) && "shipping costs",
    !(onPolicy.time || onInfo.time) && "delivery times",
  ].filter(Boolean);
  const notLoaded = `Shipping policy page ${p?.url ?? "/policies/shipping-policy"} returned ${p?.status || "no response"}`;

  if (!missing.length) {
    const lacks = [!onPolicy.cost && "shipping costs", !onPolicy.time && "delivery times"].filter(Boolean).join(" or ");
    const evidence = ok(p)
      ? `Your shipping policy page doesn't state ${lacks}, but ${infoPath} appears to. State them in the shipping policy too, so anyone who opens it finds them.`
      : `${notLoaded}, but ${infoPath} appears to state shipping costs and delivery times. Add them as your shipping policy too.`;
    return { ...base, status: "warn", evidence };
  }
  if (!ok(p)) {
    const also = info ? `, and ${infoPath} doesn't state ${missing.join(" or ")} either` : "";
    return { ...base, status: "fail", evidence: notLoaded + also };
  }
  const looked = info ? ` (looked in your shipping policy and ${infoPath})` : "";
  return { ...base, status: missing.length === 2 ? "fail" : "warn", evidence: `Could not find: ${missing.join(", ")}${looked}` };
};

// POL-01 — privacy policy and terms of service exist.
export const checkPrivacyAndTerms: CheckFn = (s) => {
  const base = { checkId: "POL-01", googleRef: REF.trust, shopifyFix: FIX.policies };
  const missing = (["privacy", "terms"] as const).filter((k) => !ok(s.pages[k]));
  if (!missing.length) return { ...base, status: "pass", evidence: "Privacy policy and terms of service both load" };
  const names = missing.map((k) => (k === "privacy" ? "privacy policy" : "terms of service"));
  return { ...base, status: missing.length === 2 ? "fail" : "warn", evidence: `Missing: ${names.join(", ")}` };
};

const TEMPLATE_LEFTOVERS = [
  /\[\s*(?:your |the )?(?:store|company|business|shop)(?: name)?\s*\]/i,
  /lorem ipsum/i,
  /\[\s*insert[^\]]{0,40}\]/i,
  /\{\{[^}]{1,40}\}\}/,
  /\[\s*(?:email|e-mail|phone|address|contact)[^\]]{0,30}\]/i,
  /\bX{2,}\s*days\b/i,
  /\[\s*date\s*\]/i,
];

// POL-02 — no template leftovers in policy pages.
export const checkPolicyPlaceholders: CheckFn = (s) => {
  const base = { checkId: "POL-02", googleRef: REF.websiteFix, shopifyFix: FIX.policies };
  const pages = (["refund", "shipping", "privacy", "terms"] as const).filter((k) => ok(s.pages[k]));
  if (!pages.length) return { ...base, status: "na", evidence: "No policy pages could be read" };
  const hits: string[] = [];
  for (const k of pages) {
    const text = mainText(s.pages[k]!.html);
    for (const re of TEMPLATE_LEFTOVERS) {
      const hit = snippet(text, re, 25);
      if (hit) {
        hits.push(`${k} policy: "${hit}"`);
        break;
      }
    }
  }
  if (hits.length) return { ...base, status: "fail", evidence: `Template text left in: ${hits.join(" | ")}` };
  return { ...base, status: "pass", evidence: `No template leftovers in ${pages.length} policy pages` };
};
