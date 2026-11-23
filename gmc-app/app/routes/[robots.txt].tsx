// /robots.txt: let search engines read the public pages, keep them out of the embedded app and
// one-off email links, and point them to the sitemap.
import type { LoaderFunctionArgs } from "react-router";
import { siteOrigin } from "../lib/site.server";

export const loader = ({ request }: LoaderFunctionArgs) =>
  new Response(
    [
      "User-agent: *",
      "Disallow: /app",
      "Disallow: /auth",
      "Disallow: /webhooks",
      "Disallow: /outcome/",
      "Disallow: /unsubscribe/",
      "",
      `Sitemap: ${siteOrigin(request)}/sitemap.xml`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
