// TEMPORARY (2026-11-21): shows the caller which IP headers reached the server, to confirm that
// Render/Cloudflare replace CF-Connecting-IP even when the client sends its own. It echoes only the
// caller's own request. Remove this file once checked.
import type { LoaderFunctionArgs } from "react-router";
import { clientIp } from "../lib/ratelimit.server";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const h = (n: string) => request.headers.get(n);
  return Response.json(
    {
      used: clientIp(request),
      onRender: Boolean(process.env.RENDER),
      cfConnectingIp: h("cf-connecting-ip"),
      trueClientIp: h("true-client-ip"),
      xForwardedFor: h("x-forwarded-for"),
      xRealIp: h("x-real-ip"),
      flyClientIp: h("fly-client-ip"),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
};
