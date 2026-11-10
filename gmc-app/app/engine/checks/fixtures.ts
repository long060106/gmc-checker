// Tiny builders for test snapshots. Real saved store HTML goes in app/engine/fixtures/ later.
import type { Page, StoreSnapshot } from "../types";

export const ORIGIN = "https://acme.test";

export const page = (html: string, path = "/", status = 200, finalPath?: string): Page => ({
  url: ORIGIN + path,
  status,
  html,
  finalUrl: ORIGIN + (finalPath ?? path),
});

export const HOME_HTML = `<html><head><title>Acme Goods – Handmade mugs</title>
<meta property="og:site_name" content="Acme Goods"></head><body>
<header><a href="/pages/contact">Contact</a> <a href="/pages/about-us">About us</a></header>
<main><h1>Welcome to Acme Goods</h1></main>
<footer><a href="/policies/refund-policy">Refund policy</a> <a href="/policies/shipping-policy">Shipping</a>
<a href="https://instagram.com/acmegoods">Instagram</a> © 2026 Acme Goods</footer></body></html>`;

export const policy = (body: string) =>
  `<html><body><header>Menu</header><main><div class="shopify-policy__container"><div class="shopify-policy__body"><div class="rte">${body}</div></div></div></main><footer>Acme Goods</footer></body></html>`;

export const LONG_REFUND = policy(
  "Acme Goods accepts returns within 30 days of delivery. " +
    "To start a return, email support@acme.test and we will send you a prepaid return label. Items must be unused and in original packaging. ".repeat(4) +
    "Refunds are processed within 5 business days to the original payment method.",
);

export const snap = (over: Partial<StoreSnapshot> & { pages?: Record<string, Page | undefined> } = {}): StoreSnapshot => ({
  origin: ORIGIN,
  products: [],
  links: [],
  ...over,
  pages: { home: page(HOME_HTML), ...(over.pages ?? {}) },
});

export const product = (opts: { price?: string; currency?: string; availability?: string; visible?: string; buyDisabled?: boolean }) => {
  const ld = opts.price
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Mug",
        offers: [{ "@type": "Offer", price: opts.price, priceCurrency: opts.currency, availability: opts.availability }],
      })}</script>`
    : "";
  return page(
    `<html><head>${ld}</head><body><main><h1>Mug</h1><span class="price">${opts.visible ?? ""}</span>
<button type="submit" name="add"${opts.buyDisabled ? " disabled" : ""}>Add to cart</button></main></body></html>`,
    "/products/mug",
  );
};
