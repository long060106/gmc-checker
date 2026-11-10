import type { CheckFn } from "../types";
import { FIX, REF } from "../refs";
import { textOf } from "../html";
import { ok } from "./util";

// CON-03 — the phone, email and address the merchant typed from Merchant Center appear on the site.
// Technique: search for a KNOWN value (different from CON-02, which discovers unknown contact details).

/** Digit strings of phone-like runs in the text, e.g. "(555) 123-4567" → "5551234567". */
function phoneRuns(text: string): string[] {
  return (text.match(/\+?\d[\d\s().-]{5,}\d/g) ?? []).map((r) => r.replace(/\D/g, "")).filter((d) => d.length >= 7);
}

/**
 * Same phone if the last 9 digits agree (or all digits when shorter). This absorbs country codes
 * and trunk zeros: "+1 555-123-4567" vs "(555) 123-4567", "+44 20 7946 0958" vs "020 7946 0958".
 */
export function phoneFound(text: string, phone: string): boolean {
  const want = phone.replace(/\D/g, "");
  if (want.length < 7) return false;
  const tail = want.slice(-9);
  return phoneRuns(text).some((d) => d.slice(-tail.length) === tail);
}

export function emailFound(html: string, email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.includes("@") && html.toLowerCase().includes(e);
}

/**
 * Address tokens that must all appear: street number, first street word, postal code.
 * "123 Main Street, Springfield, IL 62704" → ["123", "main", "62704"]
 */
export function addressTokens(address: string): string[] {
  const a = address.toLowerCase();
  const tokens: string[] = [];
  const num = /\b\d+[a-z]?\b/.exec(a);
  if (num) {
    tokens.push(num[0]);
    const street = /[a-z]{3,}/.exec(a.slice(num.index + num[0].length));
    if (street) tokens.push(street[0]);
  }
  // Postal code: last token with a digit, or a UK-style "sw1a 1aa", that isn't the street number.
  const uk = /\b[a-z]{1,2}\d[a-z\d]?\s?\d[a-z]{2}\b/.exec(a);
  if (uk) tokens.push(uk[0].replace(/\s+/, " "));
  else {
    const withDigits = a.match(/\b[a-z]*\d[a-z\d-]*\b/g) ?? [];
    const last = withDigits[withDigits.length - 1];
    if (last && last !== num?.[0] && last.replace(/\D/g, "").length >= 3) tokens.push(last);
  }
  return tokens;
}

export function addressFound(text: string, address: string): boolean {
  const tokens = addressTokens(address);
  if (tokens.length < 2) return false; // too vague to judge
  const t = text.toLowerCase().replace(/\s+/g, " ");
  return tokens.every((tok) => t.includes(tok));
}

export const checkGmcContactMatch: CheckFn = (s, input) => {
  const base = { checkId: "CON-03", googleRef: REF.requestReview, shopifyFix: `${FIX.storeDetails}; ${FIX.gmcBusinessInfo}` };
  const fields: Array<[string, string]> = [];
  if (input?.gmcPhone?.trim()) fields.push(["phone", input.gmcPhone.trim()]);
  if (input?.gmcEmail?.trim()) fields.push(["email", input.gmcEmail.trim()]);
  if (input?.gmcAddress?.trim()) fields.push(["address", input.gmcAddress.trim()]);
  if (!fields.length) {
    return { ...base, status: "na", evidence: "Needs the phone, email or address from your Merchant Center business info (enter them in the app)" };
  }

  const pages = ["home", "contact", "refund", "privacy"].map((k) => s.pages[k]).filter(ok);
  if (!pages.length) return { ...base, status: "na", evidence: "No pages could be read" };
  const html = pages.map((p) => p.html).join(" ");
  const text = pages.map((p) => textOf(p.html)).join(" ");

  const found: string[] = [];
  const missing: string[] = [];
  for (const [kind, value] of fields) {
    const hit =
      kind === "phone" ? phoneFound(text, value) : kind === "email" ? emailFound(html, value) : addressFound(text, value);
    (hit ? found : missing).push(`${kind} (${value})`);
  }

  if (!missing.length) return { ...base, status: "pass", evidence: `Found on the site: ${found.join(", ")}` };
  const evidence = `Not found on home, contact or policy pages: ${missing.join(", ")}${found.length ? ` · Found: ${found.join(", ")}` : ""}`;
  return { ...base, status: found.length ? "warn" : "fail", evidence };
};
