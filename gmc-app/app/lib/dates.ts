// Dates shown to the merchant, in the store's time zone (Shopify admin → Settings → General).
// The server runs in UTC: without a zone, a request made on a US evening would be dated the next day.

/** The zone if this runtime knows it, else "UTC". */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** YYYY-MM-DD in `timeZone`: unambiguous in every locale. */
export function dayIn(date: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(date),
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Nov 23, 2026" in `timeZone`. */
export function shortDateIn(date: string | Date, timeZone: string): string {
  return new Date(date).toLocaleDateString("en-US", { timeZone, year: "numeric", month: "short", day: "numeric" });
}
