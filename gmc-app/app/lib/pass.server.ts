// Reads the shop's Reinstatement Pass from Shopify (the source of truth for what was paid),
// and counts the shop's recent scans for the free limit. Rules live in ./pass.ts.
import prisma from "../db.server";
import { freeWindowStart, passFromPurchases, type PassStatus, type Purchase } from "./pass";

/** The `admin` object from authenticate.admin(request). */
type AdminGraphql = { graphql: (query: string) => Promise<Response> };

const PASS_QUERY = `#graphql
  query ReinstatementPass {
    shop { plan { partnerDevelopment } }
    currentAppInstallation {
      oneTimePurchases(first: 25, reverse: true) {
        nodes { id name status test createdAt }
      }
    }
  }`;

export interface PassInfo {
  pass: PassStatus;
  /** True on development stores: Shopify only allows test charges there. */
  testStore: boolean;
}

export async function getPass(admin: AdminGraphql): Promise<PassInfo> {
  try {
    const res = await admin.graphql(PASS_QUERY);
    const body = (await res.json()) as {
      data?: {
        shop?: { plan?: { partnerDevelopment?: boolean } };
        currentAppInstallation?: { oneTimePurchases?: { nodes?: Purchase[] } };
      };
    };
    const testStore = billingTestMode(Boolean(body.data?.shop?.plan?.partnerDevelopment));
    const purchases = body.data?.currentAppInstallation?.oneTimePurchases?.nodes ?? [];
    return { pass: passFromPurchases(purchases, testStore), testStore };
  } catch (e) {
    // Never block the app on a billing lookup failure: treat as no pass (free limits still apply).
    console.error("[pass] could not read purchases", e);
    return { pass: { active: false }, testStore: billingTestMode(false) };
  }
}

/** Test charges on development stores, or everywhere when BILLING_TEST=true (e.g. before launch). */
function billingTestMode(partnerDevelopment: boolean): boolean {
  return partnerDevelopment || process.env.BILLING_TEST?.trim() === "true";
}

/** In-app scans (including snapshots) in the rolling free window. */
export function countRecentScans(shop: string): Promise<number> {
  return prisma.appScanDetail.count({ where: { shop, createdAt: { gte: freeWindowStart() } } });
}
