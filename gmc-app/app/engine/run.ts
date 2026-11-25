// Runs every registered check against a snapshot. This file is the engine's public API:
//   runAll(snapshot, input) → Finding[]      ENGINE_VERSION      CHECK_INFO
import type { CheckFn, CheckInput, Finding, StoreSnapshot } from "./types";
import { checkBusinessNameConsistent, checkBusinessNameFormat } from "./checks/identity";
import { checkAboutPage, checkContactPage, checkSupportEmailDomain } from "./checks/contact";
import { checkPolicyPlaceholders, checkPrivacyAndTerms, checkRefundPage, checkShippingPolicy } from "./checks/policies";
import { checkBrokenLinks, checkPlaceholders, checkPublicAccess, checkSocialLinks } from "./checks/site";
import { checkAvailabilityMatch, checkPriceInHtml, checkStructuredPrice } from "./checks/pricing";
import { checkFakeEndorsement, checkUnreliableClaims } from "./checks/claims";
import { checkGmcContactMatch } from "./checks/gmcmatch";
import { REF } from "./refs";

// Bump when any check's logic changes. Scan diffs are only valid between scans with the same version.
export const ENGINE_VERSION = "0.2.0"; // 0.2.0: SHP-01 also reads a linked shipping info page

export interface CheckInfo {
  title: string;
  group: "Identity" | "Contact" | "Policies" | "Site" | "Pricing" | "Claims";
  ref: string; // the Google help page the check cites (same as its findings' googleRef)
  needs?: "gmcName" | "app"; // gmcName = merchant must type their Merchant Center business name
}

export const CHECK_INFO: Record<string, CheckInfo> = {
  "ID-01": { title: "Same business name as Merchant Center", group: "Identity", ref: REF.trust, needs: "gmcName" },
  "ID-02": { title: "Business name follows Google's format rules", group: "Identity", ref: REF.businessName, needs: "gmcName" },
  "CON-01": { title: "Contact page exists and is linked", group: "Contact", ref: REF.editorial },
  "CON-02": { title: "Email, phone and address are visible", group: "Contact", ref: REF.editorial },
  "CON-03": { title: "Contact details match Merchant Center", group: "Contact", ref: REF.requestReview, needs: "app" },
  "CON-04": { title: "Support email uses your store's domain", group: "Contact", ref: REF.businessInfo },
  "ABT-01": { title: "About page exists", group: "Contact", ref: REF.trust },
  "RET-01": { title: "Refund policy page loads and is linked", group: "Policies", ref: REF.editorial },
  "RET-02": { title: "Refund policy covers window, method, fees, timing", group: "Policies", ref: REF.editorial },
  "SHP-01": { title: "Shipping policy states costs and delivery times", group: "Policies", ref: REF.misrepresentation },
  "POL-01": { title: "Privacy policy and Terms exist", group: "Policies", ref: REF.trust },
  "POL-02": { title: "No template leftovers in policies", group: "Policies", ref: REF.websiteFix },
  "SITE-01": { title: "No placeholder text on the site", group: "Site", ref: REF.websiteFix },
  "SITE-02": { title: "No broken links on the home page", group: "Site", ref: REF.websiteFix },
  "SITE-03": { title: "Social links point to real profiles", group: "Site", ref: REF.websiteFix },
  "SITE-04": { title: "Store is public (no password or login)", group: "Site", ref: REF.editorial },
  "PRC-01": { title: "Structured-data price matches the page", group: "Pricing", ref: REF.structuredData },
  "PRC-02": { title: "Price is in the server HTML", group: "Pricing", ref: REF.priceMismatch },
  "PRC-03": { title: "Stock status matches structured data", group: "Pricing", ref: REF.misrepresentation },
  "CLM-01": { title: "No unreliable claims in product text", group: "Claims", ref: REF.misrepresentation },
  "TRU-01": { title: "No badges implying Google endorsement", group: "Claims", ref: REF.misrepresentation },
};

// [checkId, function]. Order = order shown in the report.
export const CHECKS: Array<[string, CheckFn]> = [
  ["SITE-04", checkPublicAccess],
  ["ID-01", checkBusinessNameConsistent],
  ["ID-02", checkBusinessNameFormat],
  ["CON-01", checkContactPage],
  // ["CON-02", checkContactVisible], // TODO(Long): bỏ comment sau khi viết xong CON-02 trong checks/contact.ts
  ["CON-03", checkGmcContactMatch],
  ["CON-04", checkSupportEmailDomain],
  ["ABT-01", checkAboutPage],
  ["RET-01", checkRefundPage],
  // ["RET-02", checkRefundContent], // TODO(Long): bỏ comment sau khi viết xong RET-02 trong checks/policies.ts
  ["SHP-01", checkShippingPolicy],
  ["POL-01", checkPrivacyAndTerms],
  ["POL-02", checkPolicyPlaceholders],
  ["SITE-01", checkPlaceholders],
  ["SITE-02", checkBrokenLinks],
  ["SITE-03", checkSocialLinks],
  ["PRC-01", checkStructuredPrice],
  ["PRC-02", checkPriceInHtml],
  ["PRC-03", checkAvailabilityMatch],
  ["CLM-01", checkUnreliableClaims],
  ["TRU-01", checkFakeEndorsement],
];

export function runAll(s: StoreSnapshot, input: CheckInput = {}): Finding[] {
  return CHECKS.map(([id, fn]) => {
    try {
      return fn(s, input);
    } catch (e) {
      // One broken check must never break the whole report (App Store req 2.1.1: no 500s).
      return { checkId: id, status: "na", evidence: `Check failed to run: ${(e as Error).message}`, googleRef: "", shopifyFix: "" };
    }
  });
}
