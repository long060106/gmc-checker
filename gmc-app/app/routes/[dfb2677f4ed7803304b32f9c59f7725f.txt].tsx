// IndexNow key file (Bing and other IndexNow engines fetch it to confirm we own the site).
// The key must match INDEXNOW_KEY in app/lib/site.server.ts.
import { INDEXNOW_KEY } from "../lib/site.server";

export const loader = () => new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
