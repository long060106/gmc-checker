import type { Page, StoreSnapshot } from "../types";
import { extractLinks, type Link } from "../html";

export const ok = (p: Page | undefined): p is Page & { status: 200 } => !!p && p.status === 200;

export const pathOf = (p: Page) => {
  try {
    return new URL(p.finalUrl ?? p.url).pathname;
  } catch {
    return p.url;
  }
};

/** All links on the home page (any domain), resolved to absolute URLs. */
export function homeLinks(s: StoreSnapshot): Link[] {
  const home = s.pages.home;
  if (!ok(home)) return [];
  return extractLinks(home.html, home.finalUrl ?? home.url);
}

/** Does the home page link to this path (e.g. "/policies/refund-policy")? */
export function homeLinksTo(s: StoreSnapshot, path: string): boolean {
  return homeLinks(s).some((l) => {
    try {
      return new URL(l.href).pathname.replace(/\/+$/, "") === path.replace(/\/+$/, "");
    } catch {
      return false;
    }
  });
}
