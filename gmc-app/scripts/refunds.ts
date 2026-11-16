// Refund requests for the Reinstatement Pass (the 7-day in-app refund).
// The pass already ended when the merchant asked; this list is what's left to do by hand.
//
//   npm run refunds                   → list requests not yet refunded
//   npm run refunds -- --all          → list every request
//   npm run refunds -- --mark <id>    → record that you issued the refund in the Partner Dashboard
//
// Refund steps: Partner Dashboard → Stores (or Apps → this app → History) → find the store →
// the "Reinstatement Pass" charge → Issue refund (or credit, if the charge is still unpaid).
// Shopify doesn't notify the merchant, so the in-app message is the only notice they get.
// Uses TURSO_DATABASE_URL from .env if set, i.e. the PRODUCTION database.
import { createPrismaClient } from "../app/db.server";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env file — rely on the real environment
}

const prisma = createPrismaClient();
const args = process.argv.slice(2);
const markAt = args.indexOf("--mark");

async function main() {
  console.log(`Database: ${process.env.TURSO_DATABASE_URL ? "Turso (production)" : "local dev.sqlite"}\n`);

  if (markAt !== -1) {
    const id = args[markAt + 1];
    if (!id) throw new Error("Usage: npm run refunds -- --mark <id>");
    const r = await prisma.refundRequest.update({ where: { id }, data: { refundedAt: new Date() } });
    console.log(`Marked refunded: ${r.shop} ${r.purchaseId}`);
    return;
  }

  const rows = await prisma.refundRequest.findMany({
    where: args.includes("--all") ? {} : { refundedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!rows.length) {
    console.log("Nothing to refund.");
    return;
  }
  for (const r of rows) {
    const ageDays = ((Date.now() - r.createdAt.getTime()) / 86_400_000).toFixed(1);
    console.log(
      [
        `id:        ${r.id}`,
        `store:     ${r.shop}`,
        `purchase:  ${r.purchaseId}${r.test ? "  (TEST: nothing to refund, just mark it)" : ""}`,
        `asked:     ${r.createdAt.toISOString()} (${ageDays} days ago)`,
        `refunded:  ${r.refundedAt ? r.refundedAt.toISOString() : "NOT YET"}`,
        `reason:    ${r.reason ?? "-"}`,
        "",
      ].join("\n"),
    );
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
