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

/** Best-effort client IP. Fly.io sets fly-client-ip; most proxies set x-forwarded-for. */
export function clientIp(request: Request): string {
  const fly = request.headers.get("fly-client-ip");
  if (fly) return fly.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
