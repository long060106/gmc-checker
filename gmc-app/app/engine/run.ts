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

// Bump when any check's logic changes. Scan diffs are only valid between scans with the same version.
export const ENGINE_VERSION = "0.1.0";

export interface CheckInfo {
  title: string;
  group: "Identity" | "Contact" | "Policies" | "Site" | "Pricing" | "Claims";
  needs?: "gmcName" | "app"; // gmcName = merchant must type their Merchant Center business name
}

export const CHECK_INFO: Record<string, CheckInfo> = {
  "ID-01": { title: "Same business name as Merchant Center", group: "Identity", needs: "gmcName" },
  "ID-02": { title: "Business name follows Google's format rules", group: "Identity", needs: "gmcName" },
  "CON-01": { title: "Contact page exists and is linked", group: "Contact" },
  "CON-02": { title: "Email, phone and address are visible", group: "Contact" },
  "CON-03": { title: "Contact details match Merchant Center", group: "Contact", needs: "app" },
  "CON-04": { title: "Support email uses your store's domain", group: "Contact" },
  "ABT-01": { title: "About page exists", group: "Contact" },
  "RET-01": { title: "Refund policy page loads and is linked", group: "Policies" },
  "RET-02": { title: "Refund policy covers window, method, fees, timing", group: "Policies" },
  "SHP-01": { title: "Shipping policy states costs and delivery times", group: "Policies" },
  "POL-01": { title: "Privacy policy and Terms exist", group: "Policies" },
  "POL-02": { title: "No template leftovers in policies", group: "Policies" },
  "SITE-01": { title: "No placeholder text on the site", group: "Site" },
  "SITE-02": { title: "No broken links on the home page", group: "Site" },
  "SITE-03": { title: "Social links point to real profiles", group: "Site" },
  "SITE-04": { title: "Store is public (no password or login)", group: "Site" },
  "PRC-01": { title: "Structured-data price matches the page", group: "Pricing" },
  "PRC-02": { title: "Price is in the server HTML", group: "Pricing" },
  "PRC-03": { title: "Stock status matches structured data", group: "Pricing" },
  "CLM-01": { title: "No unreliable claims in product text", group: "Claims" },
  "TRU-01": { title: "No badges implying Google endorsement", group: "Claims" },
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
