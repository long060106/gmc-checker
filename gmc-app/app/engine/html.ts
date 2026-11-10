// Small HTML helpers. Regex-based on purpose for v1: fast, no dependencies, easy to read.
// Swap for a real parser (e.g. node-html-parser) when a real store breaks them.

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&#160;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&ndash;": "–",
  "&mdash;": "—",
};

/** Visible text a shopper would read: no scripts, styles or tags. */
export function textOf(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Link {
  href: string; // absolute URL
  text: string; // visible anchor text
}

/** All <a href> links, resolved against baseUrl. Skips mailto:, tel:, javascript: and #anchors. */
export function extractLinks(html: string, baseUrl: string): Link[] {
  const out: Link[] = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[2].trim();
    if (!raw || /^(mailto:|tel:|javascript:|#)/i.test(raw)) continue;
    try {
      out.push({ href: new URL(raw, baseUrl).toString(), text: textOf(m[3]) });
    } catch {
      // malformed href — ignore
    }
  }
  return out;
}

/** Every JSON-LD object on the page, with @graph and arrays flattened. Bad JSON is skipped. */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const push = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(push);
    else if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      out.push(obj);
      if (obj["@graph"]) push(obj["@graph"]);
    }
  };
  while ((m = re.exec(html))) {
    try {
      push(JSON.parse(m[1]));
    } catch {
      // themes sometimes emit invalid JSON-LD — skip it
    }
  }
  return out;
}

export interface Offer {
  price?: string;
  priceCurrency?: string;
  availability?: string; // e.g. "https://schema.org/InStock"
}

function hasType(obj: Record<string, unknown>, type: string): boolean {
  const t = obj["@type"];
  return t === type || (Array.isArray(t) && t.includes(type));
}

/** Offers from Product / ProductGroup JSON-LD (Shopify themes put one offer per variant). */
export function productOffers(html: string): Offer[] {
  const offers: Offer[] = [];
  const collect = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(collect);
    if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      if (r.price !== undefined || r.lowPrice !== undefined) {
        offers.push({
          price: r.price !== undefined ? String(r.price) : String(r.lowPrice),
          priceCurrency: r.priceCurrency ? String(r.priceCurrency) : undefined,
          availability: r.availability ? String(r.availability) : undefined,
        });
      }
    }
  };
  for (const obj of extractJsonLd(html)) {
    if (hasType(obj, "Product")) collect(obj.offers);
    if (hasType(obj, "ProductGroup") && Array.isArray(obj.hasVariant)) {
      for (const v of obj.hasVariant) if (v && typeof v === "object") collect((v as Record<string, unknown>).offers);
    }
  }
  return offers;
}

/** <title> plus og:site_name, if present. */
export function siteNames(html: string): { title?: string; ogSiteName?: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const og =
    /<meta[^>]+property\s*=\s*["']og:site_name["'][^>]*content\s*=\s*["']([^"']*)["']/i.exec(html)?.[1] ??
    /<meta[^>]+content\s*=\s*["']([^"']*)["'][^>]*property\s*=\s*["']og:site_name["']/i.exec(html)?.[1];
  return { title: title ? textOf(title) : undefined, ogSiteName: og ? textOf(og) : undefined };
}

/**
 * Main content text only, without header/footer/nav noise.
 * Prefers Shopify's policy body, then <main>, then the whole page.
 */
export function mainText(html: string): string {
  const policy = html.search(/class\s*=\s*["'][^"']*shopify-policy__body/i);
  if (policy >= 0) {
    const start = html.indexOf(">", policy) + 1;
    const end = html.indexOf("</main>", start);
    return textOf(html.slice(start, end > 0 ? end : undefined));
  }
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  return textOf(main ? main[1] : html);
}

/** Short excerpt around the first match, for evidence strings. */
export function snippet(text: string, re: RegExp, radius = 40): string | undefined {
  const m = re.exec(text);
  if (!m) return undefined;
  const start = Math.max(0, m.index - radius);
  const end = Math.min(text.length, m.index + m[0].length + radius);
  return `…${text.slice(start, end).trim()}…`;
}
