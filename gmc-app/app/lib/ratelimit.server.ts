// Tiny in-memory rate limiter (sliding window per key). Fine for one server instance (v1).
// If the app ever runs on more than one machine, move this to the database or Redis.

const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 5, windowMs = 10 * 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep memory bounded: occasionally drop keys with no recent hits.
  if (hits.size > 5_000) {
    for (const [k, ts] of hits) if (!ts.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

type Env = Record<string, string | undefined>;

/**
 * The visitor's IP, read only from a header that the hosting proxy sets itself. Otherwise a visitor
 * could send a new made-up IP with every request and never hit the limit.
 * - Render (env RENDER is set) sits behind Cloudflare, which replaces CF-Connecting-IP with the
 *   address that connected to it. Render's proxy keeps a client-sent X-Forwarded-For and only
 *   appends to it, so X-Forwarded-For is never trusted here.
 *   Checked on the live Render service on 2026-11-21: a client-sent CF-Connecting-IP is refused by
 *   Cloudflare (error 1000), and a client-sent Fly-Client-IP or X-Forwarded-For value reaches the app.
 * - Fly.io (env FLY_APP_NAME is set) replaces Fly-Client-IP.
 * Anywhere else (local dev) no header can be trusted, so everyone shares one bucket.
 */
export function clientIp(request: Request, env: Env = process.env): string {
  const header = (name: string) => request.headers.get(name)?.trim() || null;
  if (env.FLY_APP_NAME) return header("fly-client-ip") ?? "unknown";
  if (env.RENDER) return header("cf-connecting-ip") ?? "unknown";
  return "local";
}
