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

/** Cookies for one scan only (used only after unlocking a password-protected store). Never stored. */
class CookieJar {
  private jar = new Map<string, string>();
  absorb(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      if (i > 0) this.jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function fetchOnce(start: string, budget: Budget, readBody: boolean, jar?: CookieJar): Promise<Page> {
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
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/json;q=0.9,*/*;q=0.5",
          ...(jar ? { cookie: jar.header() } : {}),
        },
      });
      jar?.absorb(res);
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

/**
 * A store page (/pages/...) that the home page links to as shipping or delivery info, e.g. a
 * "Shipping + Delivery" footer link to /pages/help#shipping. Many stores keep their shipping
 * details there and leave Shopify's shipping policy page short, so SHP-01 reads it too.
 * Returns the URL without its #anchor, or undefined. `links` must be absolute same-store URLs.
 */
export function findShippingInfoLink(links: { href: string; text: string }[]): string | undefined {
  const pick = links.find((l) => {
    const path = new URL(l.href).pathname;
    return /^\/pages\//i.test(path) && (/shipping|delivery/i.test(path) || /shipping|delivery/i.test(l.text));
  });
  return pick && stripHash(pick.href);
}

/** Hidden inputs of the storefront password form (e.g. authenticity_token, form_type), by name. */
export function passwordFormFields(html: string): Record<string, string> | null {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)]
    .map((m) => m[0])
    .find((f) => /action=["'][^"']*\/password["']/i.test(f) && /name=["']password["']/i.test(f));
  if (!form) return null;
  const fields: Record<string, string> = {};
  for (const m of form.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/type=["']hidden["']/i.test(tag)) continue;
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1];
    if (name) fields[name] = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
  }
  return fields;
}

/** Submits the storefront password like a visitor would. True when the home page then opens. */
async function unlockStorefront(origin: string, password: string, budget: Budget, jar: CookieJar): Promise<boolean> {
  const form = await fetchOnce(`${origin}/password`, budget, true, jar);
  const fields = passwordFormFields(form.html);
  if (!fields || !budget.take()) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/password`, {
      method: "POST",
      redirect: "manual",
      signal: ctrl.signal,
      headers: {
        "user-agent": USER_AGENT,
        "content-type": "application/x-www-form-urlencoded",
        cookie: jar.header(),
      },
      body: new URLSearchParams({ ...fields, password }),
    });
    jar.absorb(res);
    await res.body?.cancel();
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
  const home = await fetchOnce(`${origin}/`, budget, false, jar);
  return home.status > 0 && !new URL(home.finalUrl ?? home.url).pathname.startsWith("/password");
}

export interface CrawlOptions {
  /** In-app only: the merchant's storefront password, so a store that isn't launched yet can be checked. */
  storefrontPassword?: string;
}

export async function crawlStore(input: string, opts: CrawlOptions = {}): Promise<StoreSnapshot> {
  const start = normalizeStoreUrl(input);
  await assertPublicHttps(start); // throws a friendly CrawlError for the user
  const budget = new Budget();
  let jar: CookieJar | undefined;
  const cache = new Map<string, Promise<Page>>();
  const get = (u: string, readBody = true) => {
    const key = stripHash(u);
    if (!cache.has(key)) cache.set(key, fetchOnce(key, budget, readBody, jar));
    return cache.get(key)!;
  };

  let home = await get(`${start.origin}/`);
  if (home.status === 0) throw new CrawlError("Could not reach the store. Is the address right?");
  if (!looksLikeShopify(home)) throw new CrawlError("This checker only supports Shopify stores for now.");

  let finalHome = new URL(home.finalUrl ?? home.url);
  const origin = finalHome.origin; // e.g. myshop.myshopify.com may redirect to the custom domain
  let passwordProtected = false;
  if (finalHome.pathname.startsWith("/password")) {
    if (!opts.storefrontPassword) {
      return { pages: { home }, products: [], links: [], origin }; // nothing else is visible to Google either
    }
    jar = new CookieJar();
    budget.left += 4; // the unlock requests don't count against the pages we check
    if (!(await unlockStorefront(origin, opts.storefrontPassword, budget, jar))) {
      throw new CrawlError(
        "Your saved storefront password didn't open the store. Copy it again from Online Store → Preferences.",
      );
    }
    cache.clear();
    home = await get(`${origin}/`);
    finalHome = new URL(home.finalUrl ?? home.url);
    passwordProtected = true;
  }
  const pages: Record<string, Page | undefined> = { home };

  const internal = extractLinks(home.html, finalHome.toString()).filter((l) => {
    const u = new URL(l.href);
    return u.origin === origin && !SKIP_PATHS.test(u.pathname);
  });
  const findLink = (re: RegExp) =>
    internal.find((l) => re.test(new URL(l.href).pathname) || re.test(l.text))?.href;
  const shippingInfo = findShippingInfoLink(internal);

  const targets: Record<string, string> = {
    refund: `${origin}/policies/refund-policy`,
    shipping: `${origin}/policies/shipping-policy`,
    privacy: `${origin}/policies/privacy-policy`,
    terms: `${origin}/policies/terms-of-service`,
    contact: findLink(/contact/i) ?? `${origin}/pages/contact`,
    about: findLink(/about|our[- ]story/i) ?? `${origin}/pages/about-us`,
    ...(shippingInfo ? { shippingInfo } : {}),
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

  return { pages, products, links, origin, passwordProtected };
}
