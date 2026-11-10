// Shared types for the check engine.
// Rule: nothing in app/engine imports Shopify or does network I/O, except crawl.server.ts.

export type Status = "pass" | "warn" | "fail" | "na";

export interface Page {
  url: string; // URL we asked for
  status: number; // final HTTP status (0 = network error / blocked)
  html: string; // server HTML only — no JavaScript runs, same as Googlebot's price check
  finalUrl?: string; // URL after redirects
}

export interface LinkStatus {
  url: string;
  status: number;
  finalUrl: string;
}

// Keys used in `pages`: home, refund, shipping, privacy, terms, contact, about
export interface StoreSnapshot {
  pages: Record<string, Page | undefined>;
  products?: Page[]; // up to 3 sampled product pages
  links?: LinkStatus[]; // internal links found on the home page, with their status
  origin?: string; // e.g. "https://example.com"
}

// Facts the merchant types in (from their Merchant Center account). All optional.
export interface CheckInput {
  gmcBusinessName?: string;
  // App-only (typed on the "Merchant Center info" page), used by CON-03:
  gmcPhone?: string;
  gmcEmail?: string;
  gmcAddress?: string;
}

export interface Finding {
  checkId: string;
  status: Status;
  evidence: string; // what we actually saw — always shown to the merchant
  googleRef: string; // the Google help page the rule comes from
  shopifyFix: string; // where in Shopify admin to fix it
}

export type CheckFn = (s: StoreSnapshot, input?: CheckInput) => Finding;
