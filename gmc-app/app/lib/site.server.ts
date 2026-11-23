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

/** The Render hostname the site used before it had its own domain. It keeps working after the move. */
export const LEGACY_HOST = "gmc-checker-wgme.onrender.com";

/**
 * Pages that move to the new domain. Everything else stays reachable on the old host so nothing in
 * flight breaks: the embedded app ("/?shop=", /app, /auth), webhooks, links in emails already sent,
 * /healthz (the keep-awake ping) and the old Search Console file.
 */
function movesToNewDomain(url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return !url.searchParams.has("shop");
  return (
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.startsWith("/guides/") ||
    PUBLIC_PAGES.some((p) => p.path === path)
  );
}

/**
 * A 301 from the old Render host to the domain in SHOPIFY_APP_URL, for public pages only.
 * Returns null (no redirect) while SHOPIFY_APP_URL still points at the old host, so it does nothing
 * until the domain switch. Call it first in each public page's loader: `if (moved) throw moved`.
 */
export function legacyHostRedirect(request: Request, appUrl = process.env.SHOPIFY_APP_URL): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  let target: URL;
  try {
    target = new URL(appUrl?.trim() ?? "");
  } catch {
    return null;
  }
  const url = new URL(request.url);
  if (url.hostname !== LEGACY_HOST || target.hostname === LEGACY_HOST) return null;
  if (!movesToNewDomain(url)) return null;
  const location = new URL(url.pathname + url.search, target.origin).toString();
  return new Response(null, { status: 301, headers: { Location: location } });
}
