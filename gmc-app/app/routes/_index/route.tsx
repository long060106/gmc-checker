// App root "/".
// - Opened from Shopify admin (has ?shop=...): go to the embedded app, as the template does.
// - Anyone else: go to the public storefront check at /scan.
// The template's "type your shop domain" login form was removed: App Store requirement 2.3.1
// says apps must not ask merchants to enter their myshopify.com URL manually.
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  throw redirect("/scan");
};
