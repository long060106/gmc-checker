import type { CheckFn } from "../types";
import { FIX, REF } from "../refs";
import { mainText, siteNames, textOf } from "../html";
import { ok } from "./util";

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// ID-01 — the exact Merchant Center business name should appear on the site.
// Real case behind this check: "ABC Company" in GMC vs "abccompany.com" used as the name on the site.
export const checkBusinessNameConsistent: CheckFn = (s, input) => {
  const base = { checkId: "ID-01", googleRef: REF.trust, shopifyFix: `${FIX.storeDetails}; ${FIX.gmcBusinessInfo}` };
  const name = input?.gmcBusinessName?.trim() ?? "";
  if (squash(name).length < 2) {
    return { ...base, status: "na", evidence: "Enter the business name from your Merchant Center account to run this check" };
  }
  const home = s.pages.home;
  if (!ok(home)) return { ...base, status: "na", evidence: "Home page could not be read" };

  const { title, ogSiteName } = siteNames(home.html);
  const places: Array<[string, string]> = [];
  if (title) places.push(["page title", title]);
  if (ogSiteName) places.push(["site name tag", ogSiteName]);
  places.push(["home page", textOf(home.html)]);
  for (const k of ["refund", "terms", "privacy"]) {
    const p = s.pages[k];
    if (ok(p)) places.push([`${k} policy`, mainText(p.html)]);
  }

  const exact = places.filter(([, t]) => norm(t).includes(norm(name))).map(([where]) => where);
  const looseOnly = places
    .filter(([where, t]) => !exact.includes(where) && squash(t).includes(squash(name)))
    .map(([where]) => where);

  if (exact.length >= 2 && !looseOnly.length) {
    return { ...base, status: "pass", evidence: `"${name}" found in: ${exact.join(", ")}` };
  }
  if (looseOnly.length) {
    return {
      ...base,
      status: "warn",
      evidence: `"${name}" appears in a different form (spacing, punctuation or domain-style) in: ${looseOnly.join(", ")}. Use the exact same name everywhere.`,
    };
  }
  if (exact.length === 1) {
    return { ...base, status: "warn", evidence: `"${name}" found only in the ${exact[0]}` };
  }
  return {
    ...base,
    status: "fail",
    evidence: `"${name}" not found on the home page, title or policies. The site calls itself "${ogSiteName ?? title ?? "?"}"`,
  };
};

// ID-02 — Google's format rules for the Merchant Center business name.
export const checkBusinessNameFormat: CheckFn = (_s, input) => {
  const base = { checkId: "ID-02", googleRef: REF.businessName, shopifyFix: FIX.gmcBusinessInfo };
  const name = input?.gmcBusinessName?.trim() ?? "";
  if (!name) return { ...base, status: "na", evidence: "Enter the business name from your Merchant Center account to run this check" };

  const problems: string[] = [];
  if (name.length > 40) problems.push(`${name.length} characters (limit is 40)`);
  if (/\b(inc|llc|ltd|co|corp|corporation|gmbh|pty|plc)\.?$/i.test(name)) problems.push("ends with a company suffix");
  const letters = name.replace(/[^a-z]/gi, "");
  if (letters.length >= 4 && letters === letters.toUpperCase()) problems.push("all capital letters");
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}™®©]/u.test(name)) problems.push("emoji or trademark symbols");
  if (/\b(sale|free shipping|discount|cheap|deals?|\d+% off)\b/i.test(name)) problems.push("promotional words");
  if (/[!*$]/.test(name)) problems.push("special characters (! * $)");

  if (problems.length) return { ...base, status: "fail", evidence: `"${name}": ${problems.join("; ")}` };
  if (name.length > 20) {
    return { ...base, status: "warn", evidence: `"${name}" is ${name.length} characters; names over 20 may be cut off in listings` };
  }
  return { ...base, status: "pass", evidence: `"${name}" meets the format rules` };
};
