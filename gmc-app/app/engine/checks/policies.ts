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

// SHP-01 — shipping policy exists and states costs and delivery times.
export const checkShippingPolicy: CheckFn = (s) => {
  const base = { checkId: "SHP-01", googleRef: REF.misrepresentation, shopifyFix: FIX.shipping };
  const p = s.pages.shipping;
  if (!ok(p)) {
    return { ...base, status: "fail", evidence: `Shipping policy page ${p?.url ?? "/policies/shipping-policy"} returned ${p?.status || "no response"}` };
  }
  const text = mainText(p.html);
  const missing = [!SHIP_COST.test(text) && "shipping costs", !SHIP_TIME.test(text) && "delivery times"].filter(Boolean);
  if (!missing.length) return { ...base, status: "pass", evidence: "States shipping costs and delivery times" };
  return { ...base, status: missing.length === 2 ? "fail" : "warn", evidence: `Could not find: ${missing.join(", ")}` };
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
