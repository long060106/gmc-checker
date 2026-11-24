// A store's shopKey is the HMAC of its FINAL storefront hostname, so it changes when the merchant
// connects a new custom domain (or removes one). Without this, the store would lose its review history
// and could take the "first" free snapshot again. When the key changes, its rows follow it.
import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "$transaction" | "shopProfile" | "reviewAttempt" | "scan">;

/**
 * Moves review attempts and scans from `oldKey` to `newKey` and points the shop's profile at `newKey`.
 * Returns true if anything was moved. Does nothing when the key is unchanged or unknown, or when
 * another installed shop still uses `oldKey` (two shops on one hostname): that history isn't ours to move.
 */
export async function moveShopHistory(
  db: Db,
  shop: string,
  oldKey: string | null | undefined,
  newKey: string,
): Promise<boolean> {
  if (!oldKey || oldKey === newKey) return false;
  const shared = await db.shopProfile.count({ where: { shopKey: oldKey, shop: { not: shop } } });
  if (shared > 0) return false;
  await db.$transaction([
    db.reviewAttempt.updateMany({ where: { shopKey: oldKey }, data: { shopKey: newKey } }),
    db.scan.updateMany({ where: { shopKey: oldKey }, data: { shopKey: newKey } }),
    db.shopProfile.update({ where: { shop }, data: { shopKey: newKey } }),
  ]);
  return true;
}
