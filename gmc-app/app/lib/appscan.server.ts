// Scans the merchant's own store from inside the Shopify admin.
// Same engine and same shopKey basis as the public /scan page (HMAC of the FINAL storefront
// hostname after redirects), so a web scan and an app scan of one store line up for diffs.
import type { Scan } from "@prisma/client";
import prisma from "../db.server";
import { crawlStore, CrawlError } from "../engine/crawl.server";
import { ENGINE_VERSION, runAll } from "../engine/run";
import type { CheckInput, Finding, Status } from "../engine/types";
import { shopKey } from "./shopkey.server";

export type ScanShopResult =
  | { ok: true; scan: Scan; findings: Finding[]; origin: string; shopKey: string }
  | { ok: false; error: string };

/** The Merchant Center fields the merchant typed in, as engine input. */
export async function profileInput(shop: string): Promise<CheckInput> {
  const p = await prisma.shopProfile.findUnique({ where: { shop } });
  return {
    gmcBusinessName: p?.gmcBusinessName ?? undefined,
    gmcPhone: p?.gmcPhone ?? undefined,
    gmcEmail: p?.gmcEmail ?? undefined,
    gmcAddress: p?.gmcAddress ?? undefined,
  };
}

/** Never throws: every failure becomes a friendly message (App Store req 2.1.1 — no 500s). */
export async function scanShop(shopDomain: string, input: CheckInput): Promise<ScanShopResult> {
  try {
    const snapshot = await crawlStore(`https://${shopDomain}`);
    const findings = runAll(snapshot, input);
    const origin = snapshot.origin ?? `https://${shopDomain}`;
    const key = shopKey(new URL(origin).hostname);
    const results = Object.fromEntries(findings.map((f) => [f.checkId, f.status]));
    const scan = await prisma.scan.create({
      data: {
        shopKey: key,
        engineVersion: ENGINE_VERSION,
        results: JSON.stringify(results),
        source: "app",
        gmcNameProvided: Boolean(input.gmcBusinessName),
      },
    });
    await prisma.shopProfile.upsert({
      where: { shop: shopDomain },
      create: { shop: shopDomain, shopKey: key },
      update: { shopKey: key },
    });
    // Full findings (with evidence) stay in an app-only table, never in the shared Scan table.
    await prisma.appScanDetail.create({ data: { scanId: scan.id, shop: shopDomain, findings: JSON.stringify(findings) } });
    return { ok: true, scan, findings, origin, shopKey: key };
  } catch (e) {
    if (e instanceof CrawlError) return { ok: false, error: e.message };
    console.error("[appscan] unexpected error", e);
    return { ok: false, error: "We couldn't finish this scan. Please try again in a minute." };
  }
}

export function parseResults(scan: Pick<Scan, "results">): Record<string, Status> {
  try {
    return JSON.parse(scan.results) as Record<string, Status>;
  } catch {
    return {};
  }
}
