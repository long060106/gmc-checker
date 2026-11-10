// shopKey = HMAC-SHA256(hostname, secret).
// Why HMAC and not a plain hash: there are only a few million store domains, so anyone could hash
// them all and reverse a plain SHA-256. With a secret key that attack needs the key too.
// This is pseudonymization, not anonymization: keep SHOPKEY_SECRET out of the database and git.
import { createHmac } from "node:crypto";

const DEV_FALLBACK = "dev-only-shopkey-secret-change-me";
let warned = false;

function secret(): string {
  const s = process.env.SHOPKEY_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SHOPKEY_SECRET is not set. Set it before running in production.");
  }
  if (!warned) {
    console.warn("[shopkey] SHOPKEY_SECRET not set — using a dev-only fallback key.");
    warned = true;
  }
  return DEV_FALLBACK;
}

/** Stable, non-reversible key for a store. Normalizes case and a leading "www.". */
export function shopKey(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/^www\./, "");
  return createHmac("sha256", secret()).update(host).digest("hex");
}
