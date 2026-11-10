import type { CheckFn } from "../types";
import { FIX, REF } from "../refs";
import { snippet, textOf } from "../html";
import { homeLinks, ok, pathOf } from "./util";

// Default theme copy (mostly Shopify's Dawn) and generic filler that Google calls "placeholders".
const PLACEHOLDERS = [
  /lorem ipsum/i,
  /add customer reviews here/i,
  /talk about your brand/i,
  /share information about your brand with your customers/i,
  /pair text with an image to focus on/i,
  /use this text to (?:share|describe|introduce)/i,
  /your (?:headline|heading|text|content|tagline) (?:goes )?here/i,
  /example product title/i,
  /\bimage with text\b/i,
];

// SITE-01 — no placeholder text on home, about, contact or product pages.
export const checkPlaceholders: CheckFn = (s) => {
  const base = { checkId: "SITE-01", googleRef: REF.websiteFix, shopifyFix: FIX.theme };
  const pages: Array<[string, string]> = [];
  for (const k of ["home", "about", "contact"]) {
    const p = s.pages[k];
    if (ok(p)) pages.push([k, textOf(p.html)]);
  }
  for (const p of (s.products ?? []).filter(ok)) pages.push([pathOf(p), textOf(p.html)]);
  if (!pages.length) return { ...base, status: "na", evidence: "No pages could be read" };

  const hits: string[] = [];
  for (const [where, text] of pages) {
    for (const re of PLACEHOLDERS) {
      const hit = snippet(text, re, 20);
      if (hit) hits.push(`${where}: "${hit}"`);
    }
  }
  if (hits.length) return { ...base, status: "fail", evidence: `Placeholder text found — ${hits.slice(0, 3).join(" | ")}` };
  return { ...base, status: "pass", evidence: `No placeholder text on ${pages.length} pages` };
};

// SITE-02 — internal links on the home page don't 404 or bounce to the home page.
export const checkBrokenLinks: CheckFn = (s) => {
  const base = { checkId: "SITE-02", googleRef: REF.websiteFix, shopifyFix: FIX.navigation };
  const links = s.links ?? [];
  if (!links.length) return { ...base, status: "na", evidence: "No internal links were checked" };
  const path = (u: string) => {
    try {
      return new URL(u).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return u;
    }
  };
  const broken = links.filter((l) => l.status >= 400 && l.status !== 429); // 429 = rate-limited, not broken
  const toHome = links.filter((l) => l.status === 200 && path(l.finalUrl) === "/" && path(l.url) !== "/");
  if (broken.length) {
    return { ...base, status: "fail", evidence: `Broken: ${broken.slice(0, 5).map((l) => `${path(l.url)} (${l.status})`).join(", ")}` };
  }
  if (toHome.length) {
    return { ...base, status: "warn", evidence: `Redirect to the home page instead of their own page: ${toHome.slice(0, 5).map((l) => path(l.url)).join(", ")}` };
  }
  return { ...base, status: "pass", evidence: `${links.length} internal links checked, none broken` };
};

const SOCIAL_HOST = /(^|\.)(facebook|instagram|twitter|x|tiktok|pinterest|youtube|linkedin)\.com$/i;
const SHARE_LINK = /\/(sharer|share|intent\/tweet|pin\/create)\b/i;

// SITE-03 — social links point to real profiles, not theme defaults.
export const checkSocialLinks: CheckFn = (s) => {
  const base = { checkId: "SITE-03", googleRef: REF.websiteFix, shopifyFix: `${FIX.theme} (social media settings)` };
  const profiles = homeLinks(s).filter((l) => {
    try {
      const u = new URL(l.href);
      return SOCIAL_HOST.test(u.hostname) && !SHARE_LINK.test(u.pathname);
    } catch {
      return false;
    }
  });
  if (!profiles.length) {
    return { ...base, googleRef: REF.trust, status: "warn", evidence: "No social profile links on the home page (Google suggests linking your profiles)" };
  }
  const defaults = profiles.filter((l) => {
    const p = new URL(l.href).pathname.replace(/\/+$/, "");
    return p === "" || /^\/@?shopify(plus)?$/i.test(p);
  });
  if (defaults.length) {
    return { ...base, status: "fail", evidence: `Theme-default or empty social links: ${defaults.map((l) => l.href).slice(0, 4).join(", ")}` };
  }
  return { ...base, status: "pass", evidence: `${profiles.length} social profile links look real` };
};

// SITE-04 — the store is public: no password page, no forced login.
export const checkPublicAccess: CheckFn = (s) => {
  const base = { checkId: "SITE-04", googleRef: REF.editorial, shopifyFix: FIX.preferences };
  const home = s.pages.home;
  if (!home || home.status === 0) return { ...base, status: "fail", evidence: "The store could not be reached" };
  const path = pathOf(home);
  if (path.startsWith("/password")) {
    return { ...base, status: "fail", evidence: "The store is password-protected, so Google can't see it" };
  }
  if (/\/account\/login/.test(path)) return { ...base, status: "fail", evidence: "The home page redirects to a login page" };
  if (home.status >= 400) return { ...base, status: "fail", evidence: `The home page returned ${home.status}` };
  return { ...base, status: "pass", evidence: "The home page is public" };
};
