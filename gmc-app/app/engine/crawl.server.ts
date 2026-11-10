// The only file in app/engine that touches the network.
// It turns a store URL into a StoreSnapshot. Checks never fetch anything themselves.
//
// Safety (SSRF, "server-side request forgery"): the public /scan page lets anyone make OUR server
// fetch a URL. Without guards, someone could point it at internal addresses (127.0.0.1, cloud
// metadata at 169.254.169.254, ...). So: https only, port 443 only, every hop's DNS must resolve
// to public IPs, redirects are followed by hand and re-checked, and only Shopify stores are crawled.
// Known gap (fine for v1): DNS could change between our lookup and fetch's own lookup.

import { lookup } from "node:dns/promises";
import net from "node:net";
import type { LinkStatus, Page, StoreSnapshot } from "./types";
import { extractLinks } from "./html";

const USER_AGENT = "StorefrontPolicyCheck/0.1 (+storefront pre-review check)";
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const MAX_REQUESTS = 25; // per scan, including redirects
const MAX_REDIRECTS = 5;
const CONCURRENCY = 4; // be polite to the store
const SKIP_PATHS = /^\/(cart|account|search|checkout|checkouts|apps|tools|admin|password)\b/i;

export class CrawlError extends Error {}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local + cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast + reserved
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

async function assertPublicHttps(url: URL): Promise<void> {
  if (url.protocol !== "https:") throw new CrawlError("Only https:// store addresses are supported.");
  if (url.port && url.port !== "443") throw new CrawlError("Custom ports are not supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) throw new CrawlError("Enter the store's domain name, not an IP address.");
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new CrawlError(`Could not find ${host}. Check the spelling.`);
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new CrawlError("That address is not a public website.");
  }
}

/** Accepts "mystore.com", "https://mystore.com/products/x", etc. Returns the https origin. */
export function normalizeStoreUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new CrawlError("Enter your store's address.");
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new CrawlError("That doesn't look like a web address.");
  }
  if (url.protocol === "http:") url.protocol = "https:";
  return new URL(url.origin);
}

class Budget {
  left = MAX_REQUESTS;
  take(): boolean {
    if (this.left <= 0) return false;
    this.left--;
    return true;
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchOnce(start: string, budget: Budget, readBody: boolean): Promise<Page> {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const failed: Page = { url: start, status: 0, html: "", finalUrl: url.toString() };
    if (!budget.take()) return failed;
    try {
      await assertPublicHttps(url);
    } catch {
      return failed; // a redirect to a private/odd address is treated as unreachable
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/json;q=0.9,*/*;q=0.5" },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        url = new URL(location, url);
        continue;
      }
      const html = readBody ? await readCapped(res) : "";
      if (!readBody) await res.body?.cancel();
      return { url: start, status: res.status, html, finalUrl: url.toString() };
    } catch {
      return failed; // timeout, TLS error, connection reset...
    } finally {
      clearTimeout(timer);
    }
  }
  return { url: start, status: 0, html: "", finalUrl: url.toString() };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function looksLikeShopify(p: Page): boolean {
  return /cdn\.shopify\.com|Shopify\.shop\s*=|shopify-section|\/cdn\/shop\//i.test(p.html);
}

const stripHash = (u: string) => u.split("#")[0];

export async function crawlStore(input: string): Promise<StoreSnapshot> {
  const start = normalizeStoreUrl(input);
  await assertPublicHttps(start); // throws a friendly CrawlError for the user
  const budget = new Budget();
  const cache = new Map<string, Promise<Page>>();
  const get = (u: string, readBody = true) => {
    const key = stripHash(u);
    if (!cache.has(key)) cache.set(key, fetchOnce(key, budget, readBody));
    return cache.get(key)!;
  };

  const home = await get(`${start.origin}/`);
  if (home.status === 0) throw new CrawlError("Could not reach the store. Is the address right?");
  if (!looksLikeShopify(home)) throw new CrawlError("This checker only supports Shopify stores for now.");

  const finalHome = new URL(home.finalUrl ?? home.url);
  const origin = finalHome.origin; // e.g. myshop.myshopify.com may redirect to the custom domain
  const pages: Record<string, Page | undefined> = { home };
  if (finalHome.pathname.startsWith("/password")) {
    return { pages, products: [], links: [], origin }; // nothing else is visible to Google either
  }

  const internal = extractLinks(home.html, finalHome.toString()).filter((l) => {
    const u = new URL(l.href);
    return u.origin === origin && !SKIP_PATHS.test(u.pathname);
  });
  const findLink = (re: RegExp) =>
    internal.find((l) => re.test(new URL(l.href).pathname) || re.test(l.text))?.href;

  const targets: Record<string, string> = {
    refund: `${origin}/policies/refund-policy`,
    shipping: `${origin}/policies/shipping-policy`,
    privacy: `${origin}/policies/privacy-policy`,
    terms: `${origin}/policies/terms-of-service`,
    contact: findLink(/contact/i) ?? `${origin}/pages/contact`,
    about: findLink(/about|our[- ]story/i) ?? `${origin}/pages/about-us`,
  };
  const fetched = await mapLimit(Object.entries(targets), CONCURRENCY, async ([k, u]) => [k, await get(u)] as const);
  for (const [k, p] of fetched) pages[k] = p;

  // Sample up to 3 products: Shopify's public products.json first, then product links on the home page.
  let productUrls: string[] = [];
  const pj = await get(`${origin}/products.json?limit=3`);
  if (pj.status === 200) {
    try {
      const data = JSON.parse(pj.html) as { products?: { handle?: string }[] };
      productUrls = (data.products ?? []).filter((p) => p.handle).map((p) => `${origin}/products/${p.handle}`);
    } catch {
      // not JSON — fall through
    }
  }
  if (!productUrls.length) {
    productUrls = [...new Set(internal.map((l) => stripHash(l.href)).filter((u) => /\/products\/[^/?]+/.test(u)))];
  }
  const products = await mapLimit(productUrls.slice(0, 3), CONCURRENCY, (u) => get(u));

  // Every internal link on the home page, with its status (reuses pages fetched above).
  const linkUrls = [...new Set(internal.map((l) => stripHash(l.href)))];
  const linkPages = await mapLimit(linkUrls, CONCURRENCY, (u) =>
    cache.has(u) || budget.left > 0 ? get(u, false) : Promise.resolve<Page>({ url: u, status: 0, html: "" }),
  );
  const links: LinkStatus[] = linkPages
    .filter((p) => p.status !== 0) // 0 = not checked (budget) or unreachable — unknown, not "broken"
    .map((p) => ({ url: p.url, status: p.status, finalUrl: p.finalUrl ?? p.url }));

  return { pages, products, links, origin };
}
