import type { CheckFn } from "../types";
import { FIX, REF } from "../refs";
import { textOf } from "../html";
import { homeLinksTo, ok, pathOf } from "./util";

// CON-01 — a contact page exists and the home page links to it.
export const checkContactPage: CheckFn = (s) => {
  const base = { checkId: "CON-01", googleRef: REF.editorial, shopifyFix: `${FIX.pages}; ${FIX.navigation}` };
  const c = s.pages.contact;
  if (!ok(c)) {
    return { ...base, status: "fail", evidence: `No contact page found (tried ${c?.url ?? "/pages/contact"}, got ${c?.status || "no response"})` };
  }
  const path = pathOf(c);
  if (!homeLinksTo(s, path)) {
    return { ...base, status: "warn", evidence: `Contact page ${path} loads, but the home page doesn't link to it` };
  }
  return { ...base, status: "pass", evidence: `Contact page ${path} loads and is linked from the home page` };
};

// TODO(Long): CON-02 checkContactVisible goes here — see research/2026-11-09-steps-4-7.md, "Your turn".

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "yandex.com", "mail.com",
]);
const NOT_AN_EMAIL = /(example\.(com|org)|sentry|wixpress|shopify\.com|\.(png|jpe?g|webp|gif|svg))$/i;

/** "shop.example.co.uk" → "example.co.uk", "www.example.com" → "example.com" */
export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  const sld = parts[parts.length - 2] ?? "";
  if (parts.length >= 3 && /^(co|com|org|net|ac|gov)$/.test(sld) && parts[parts.length - 1].length === 2) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

// CON-04 — the visible support email should use the store's own domain.
export const checkSupportEmailDomain: CheckFn = (s) => {
  const base = { checkId: "CON-04", googleRef: REF.businessInfo, shopifyFix: `${FIX.storeDetails}; ${FIX.gmcBusinessInfo}` };
  const html = ["contact", "home", "refund", "privacy"]
    .map((k) => s.pages[k])
    .filter(ok)
    .map((p) => p.html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " "))
    .join(" ");
  const emails = [...new Set((html.match(EMAIL) ?? []).map((e) => e.toLowerCase()))].filter((e) => !NOT_AN_EMAIL.test(e));
  if (!emails.length) return { ...base, status: "na", evidence: "No email address found on the site (see CON-02)" };

  const origin = s.origin ?? s.pages.home?.finalUrl ?? s.pages.home?.url;
  if (!origin) return { ...base, status: "na", evidence: "Store address unknown" };
  const storeDomain = registrableDomain(new URL(origin).hostname);
  const domainOf = (e: string) => e.split("@")[1];

  const own = emails.filter((e) => registrableDomain(domainOf(e)) === storeDomain);
  if (own.length) return { ...base, status: "pass", evidence: `Shows ${own[0]} (same domain as the store)` };
  if (emails.every((e) => FREE_MAIL.has(domainOf(e)))) {
    return { ...base, status: "warn", evidence: `Only free-mail addresses found (${emails.slice(0, 2).join(", ")}); Google asks for your own domain in the customer service email` };
  }
  return { ...base, status: "warn", evidence: `Email domain (${emails.slice(0, 2).join(", ")}) differs from the store domain ${storeDomain}` };
};

// ABT-01 — an About page exists.
export const checkAboutPage: CheckFn = (s) => {
  const base = { checkId: "ABT-01", googleRef: REF.trust, shopifyFix: `${FIX.pages}; ${FIX.navigation}` };
  const a = s.pages.about;
  if (ok(a) && textOf(a.html).length > 0) {
    return { ...base, status: "pass", evidence: `About page found at ${pathOf(a)}` };
  }
  return { ...base, status: "fail", evidence: `No About page found (looked for an "about" link on the home page and ${a?.url ?? "/pages/about-us"})` };
};
