// The store's IANA time zone from Shopify, so dates in the app match the merchant's calendar.
import { safeTimeZone } from "./dates";

/** The `admin` object from authenticate.admin(request). */
type AdminGraphql = { graphql: (query: string) => Promise<Response> };

const TIMEZONE_QUERY = `#graphql
  query ShopTimeZone {
    shop { ianaTimezone }
  }`;

export async function shopTimeZone(admin: AdminGraphql): Promise<string> {
  try {
    const res = await admin.graphql(TIMEZONE_QUERY);
    const body = (await res.json()) as { data?: { shop?: { ianaTimezone?: string } } };
    return safeTimeZone(body.data?.shop?.ianaTimezone);
  } catch (e) {
    // A date one day off is better than a page that fails to load.
    console.error("[timezone] could not read the shop time zone", e);
    return "UTC";
  }
}
