import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./ratelimit.server";

const req = (headers: Record<string, string>) => new Request("https://example.test/scan", { headers });
const spoofed = { "x-forwarded-for": "1.2.3.4", "x-real-ip": "1.2.3.4", "true-client-ip": "1.2.3.4" };

describe("clientIp", () => {
  it("on Render, uses only CF-Connecting-IP and ignores headers a visitor can set", () => {
    const env = { RENDER: "true" };
    expect(clientIp(req({ ...spoofed, "fly-client-ip": "1.2.3.4", "cf-connecting-ip": "203.0.113.7" }), env)).toBe(
      "203.0.113.7",
    );
    expect(clientIp(req(spoofed), env)).toBe("unknown");
  });

  it("on Fly.io, uses only Fly-Client-IP", () => {
    const env = { FLY_APP_NAME: "fixlog" };
    expect(clientIp(req({ ...spoofed, "fly-client-ip": "198.51.100.9" }), env)).toBe("198.51.100.9");
    expect(clientIp(req({ ...spoofed, "cf-connecting-ip": "1.2.3.4" }), env)).toBe("unknown");
  });

  it("elsewhere, trusts no header (one shared bucket)", () => {
    expect(clientIp(req({ ...spoofed, "fly-client-ip": "1.2.3.4", "cf-connecting-ip": "1.2.3.4" }), {})).toBe("local");
  });
});

describe("rateLimit", () => {
  it("allows max requests per window, then blocks", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key).ok).toBe(true);
    const blocked = rateLimit(key);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
