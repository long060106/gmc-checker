import { describe, expect, it } from "vitest";
import { moveShopHistory } from "./shophistory.server";

type Row = { shopKey: string };

/** In-memory stand-in for the three Prisma models moveShopHistory touches. */
function fakeDb(init: { profiles: { shop: string; shopKey: string | null }[]; attempts: Row[]; scans: Row[] }) {
  const state = structuredClone(init);
  const move = (rows: Row[]) => (args: { where: { shopKey: string }; data: { shopKey: string } }) => {
    let count = 0;
    for (const r of rows) if (r.shopKey === args.where.shopKey) (r.shopKey = args.data.shopKey), count++;
    return { count };
  };
  const db = {
    shopProfile: {
      count: async (args: { where: { shopKey: string; shop: { not: string } } }) =>
        state.profiles.filter((p) => p.shopKey === args.where.shopKey && p.shop !== args.where.shop.not).length,
      update: (args: { where: { shop: string }; data: { shopKey: string } }) => {
        const p = state.profiles.find((x) => x.shop === args.where.shop)!;
        p.shopKey = args.data.shopKey;
        return p;
      },
    },
    reviewAttempt: { updateMany: move(state.attempts) },
    scan: { updateMany: move(state.scans) },
    // The operations above already ran when the array was built; a real transaction would batch them.
    $transaction: async (ops: unknown[]) => ops,
  };
  return { db: db as unknown as Parameters<typeof moveShopHistory>[0], state };
}

describe("moveShopHistory", () => {
  it("moves attempts and scans to the new key when the storefront domain changes", async () => {
    const { db, state } = fakeDb({
      profiles: [{ shop: "a.myshopify.com", shopKey: "old" }],
      attempts: [{ shopKey: "old" }, { shopKey: "other" }],
      scans: [{ shopKey: "old" }, { shopKey: "old" }, { shopKey: "new" }],
    });
    expect(await moveShopHistory(db, "a.myshopify.com", "old", "new")).toBe(true);
    expect(state.attempts.map((r) => r.shopKey)).toEqual(["new", "other"]);
    expect(state.scans.map((r) => r.shopKey)).toEqual(["new", "new", "new"]);
    expect(state.profiles[0].shopKey).toBe("new");
  });

  it("does nothing when the key is unchanged or there was none", async () => {
    const { db, state } = fakeDb({ profiles: [{ shop: "a.myshopify.com", shopKey: "k" }], attempts: [{ shopKey: "k" }], scans: [] });
    expect(await moveShopHistory(db, "a.myshopify.com", "k", "k")).toBe(false);
    expect(await moveShopHistory(db, "a.myshopify.com", null, "k")).toBe(false);
    expect(state.attempts[0].shopKey).toBe("k");
  });

  it("leaves history alone when another installed shop still uses the old key", async () => {
    const { db, state } = fakeDb({
      profiles: [
        { shop: "a.myshopify.com", shopKey: "old" },
        { shop: "b.myshopify.com", shopKey: "old" },
      ],
      attempts: [{ shopKey: "old" }],
      scans: [{ shopKey: "old" }],
    });
    expect(await moveShopHistory(db, "a.myshopify.com", "old", "new")).toBe(false);
    expect(state.attempts[0].shopKey).toBe("old");
    expect(state.scans[0].shopKey).toBe("old");
  });
});
