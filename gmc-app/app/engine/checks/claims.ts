import type { CheckFn } from "../types";
import { FIX, REF } from "../refs";
import { snippet, textOf } from "../html";
import { ok, pathOf } from "./util";

// Phrases Google's "Unreliable claims" section is about. Warn only: context matters ("cured meats").
const CLAIMS = [
  /\bmiracle\b/i,
  /\bcures?\b/i,
  /\bguaranteed (?:results|weight loss|to (?:cure|heal|work))\b/i,
  /\b100% (?:effective|guaranteed)/i,
  /\bfda[- ]approved\b/i,
  /\binstant(?:ly)? (?:results|weight loss)\b/i,
  /\blose \d+\s*(?:lbs?|pounds|kg|kilos)\b/i,
  /\breverses? (?:aging|ageing|diabetes|hair loss)\b/i,
  /\bclinically proven\b/i,
];

function pagesToScan(s: Parameters<CheckFn>[0]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const home = s.pages.home;
  if (ok(home)) out.push(["home", home.html]);
  for (const p of (s.products ?? []).filter(ok)) out.push([pathOf(p), p.html]);
  return out;
}

// CLM-01 — unreliable-claim wording in product/home text.
export const checkUnreliableClaims: CheckFn = (s) => {
  const base = { checkId: "CLM-01", googleRef: REF.misrepresentation, shopifyFix: `${FIX.products} (descriptions)` };
  const pages = pagesToScan(s);
  if (!pages.length) return { ...base, status: "na", evidence: "No pages could be read" };
  const hits: string[] = [];
  for (const [where, html] of pages) {
    const text = textOf(html);
    for (const re of CLAIMS) {
      const hit = snippet(text, re, 30);
      if (hit) hits.push(`${where}: "${hit}"`);
    }
  }
  if (hits.length) {
    return { ...base, status: "warn", evidence: `Wording Google may treat as unreliable claims — ${hits.slice(0, 3).join(" | ")}` };
  }
  return { ...base, status: "pass", evidence: `No unreliable-claim wording on ${pages.length} pages` };
};

// Google Trusted Stores ended years ago; "Google verified/certified" badges imply an endorsement Google doesn't give.
const FAKE_GOOGLE = /google[\s_-]*(?:trusted[\s_-]*stores?|verified|certified|approved|guaranteed?)|verified by google/i;

// TRU-01 — badges or text implying Google endorsement (checks text, alt text and image file names).
export const checkFakeEndorsement: CheckFn = (s) => {
  const base = { checkId: "TRU-01", googleRef: REF.misrepresentation, shopifyFix: `${FIX.theme} (trust badges)` };
  const pages = pagesToScan(s);
  if (!pages.length) return { ...base, status: "na", evidence: "No pages could be read" };
  for (const [where, html] of pages) {
    const visible = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<meta\b[^>]*>/gi, " ");
    const hit = snippet(visible, FAKE_GOOGLE, 30);
    if (hit) return { ...base, status: "fail", evidence: `${where}: "${hit.replace(/\s+/g, " ")}"` };
  }
  return { ...base, status: "pass", evidence: `No Google-endorsement badges on ${pages.length} pages` };
};
