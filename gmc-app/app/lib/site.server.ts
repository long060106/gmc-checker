// Public site facts for search engines: the canonical origin, the pages worth indexing,
// and the IndexNow key (public by design: search engines fetch it from /<key>.txt).

/** https://gmc-checker-wgme.onrender.com today; SHOPIFY_APP_URL follows the app if the domain changes. */
export function siteOrigin(request: Request): string {
  const fromEnv = process.env.SHOPIFY_APP_URL?.trim().replace(/\/+$/, "");
  return fromEnv || new URL(request.url).origin;
}

/** Public pages for the sitemap and IndexNow, with the date their content last changed. */
export const PUBLIC_PAGES: Array<{ path: string; lastmod: string }> = [
  { path: "/scan", lastmod: "2026-11-23" },
  { path: "/guides/gmc-misrepresentation-shopify", lastmod: "2026-11-23" },
  { path: "/privacy", lastmod: "2026-11-21" },
];

export const INDEXNOW_KEY = "dfb2677f4ed7803304b32f9c59f7725f";
