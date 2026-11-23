// /sitemap.xml: the public pages from PUBLIC_PAGES.
import type { LoaderFunctionArgs } from "react-router";
import { PUBLIC_PAGES, siteOrigin } from "../lib/site.server";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const origin = siteOrigin(request);
  const urls = PUBLIC_PAGES.map((p) => `  <url><loc>${origin}${p.path}</loc><lastmod>${p.lastmod}</lastmod></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
};
