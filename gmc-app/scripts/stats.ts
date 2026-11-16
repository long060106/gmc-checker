// 7-day first-signal test: the numbers from research/2026-11-09-steps-4-7.md, Step 6, read from
// the database, with the thresholds and kill conditions next to them.
//
//   npm run stats                      → last 7 days
//   npm run stats -- --days 14
//   npm run stats -- --since 2026-11-17
//   npm run stats -- --answers 20      → also checks the "distribution failed" kill condition
//
// Uses TURSO_DATABASE_URL from .env if set, i.e. the PRODUCTION database (see SETUP.md §5).
// Counts are per store (distinct hashed store key), so your own repeat test scans count once.
import { createPrismaClient } from "../app/db.server";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env file — rely on the real environment
}

const prisma = createPrismaClient();
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const days = Number(arg("--days") ?? 7);
const since = arg("--since") ? new Date(`${arg("--since")}T00:00:00Z`) : new Date(Date.now() - days * 86_400_000);
const answersPosted = arg("--answers") !== undefined ? Number(arg("--answers")) : null;

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "n/a");
const mark = (ok: boolean | null) => (ok === null ? "  ? " : ok ? " OK " : "MISS");

async function main() {
  if (Number.isNaN(since.getTime())) throw new Error("Bad --since date; use YYYY-MM-DD.");
  console.log(`Database: ${process.env.TURSO_DATABASE_URL ? "Turso (production)" : "local dev.sqlite"}`);
  console.log(`Window:   since ${since.toISOString().slice(0, 16).replace("T", " ")} UTC\n`);

  const scans = await prisma.scan.findMany({
    where: { source: "web", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { id: true, shopKey: true, context: { select: { channel: true, suspended: true } } },
  });
  const waitlist = await prisma.waitlistEntry.findMany({
    where: { createdAt: { gte: since } },
    select: { scanId: true, suspended: true, outcomeEmailOptIn: true },
  });

  // One row per store: the first channel we saw for it and its latest answer.
  const stores = new Map<string, { channel: string | null; suspended: string | null }>();
  for (const s of scans) {
    const prev = stores.get(s.shopKey);
    stores.set(s.shopKey, {
      channel: prev?.channel ?? s.context?.channel ?? null,
      suspended: s.context?.suspended ?? prev?.suspended ?? null,
    });
  }
  // A waitlist "yes" also marks the store as suspended (covers entries without a context row).
  const scanStore = new Map(scans.map((s) => [s.id, s.shopKey]));
  for (const w of waitlist) {
    const key = w.scanId ? scanStore.get(w.scanId) : undefined;
    if (key && w.suspended === true) stores.get(key)!.suspended = "yes";
  }

  const all = [...stores.values()];
  const storeCount = stores.size;
  const answered = all.filter((s) => s.suspended).length;
  const suspended = all.filter((s) => s.suspended === "yes").length;
  const joined = waitlist.length;
  const joinedSuspended = waitlist.filter((w) => w.suspended === true).length;
  const optInSuspended = waitlist.filter((w) => w.suspended === true && w.outcomeEmailOptIn).length;

  console.log("TRAFFIC");
  console.log(`  Web scans: ${scans.length}, from ${storeCount} stores. By link (?ref=…):`);
  const byChannel = new Map<string, number>();
  for (const s of all) {
    const c = s.channel ?? "(no ref)";
    byChannel.set(c, (byChannel.get(c) ?? 0) + 1);
  }
  for (const [c, n] of [...byChannel].sort((a, b) => b[1] - a[1])) console.log(`    ${c.padEnd(24)} ${n}`);
  console.log(`  Answered "suspended?": ${answered} of ${storeCount} stores (${pct(answered, storeCount)})`);
  console.log(`  Waitlist sign-ups: ${joined} (${joinedSuspended} suspended, ${optInSuspended} of those want the 14-day email)\n`);

  const checks: [string, boolean | null, string][] = [
    ["≥ 60 stores scanned", storeCount >= 60, `${storeCount}`],
    [
      "≥ 40% of scanners suspended or warned",
      storeCount ? suspended / storeCount >= 0.4 : null,
      `${suspended}/${storeCount} = ${pct(suspended, storeCount)}`,
    ],
    ["≥ 10 priced-waitlist sign-ups", joined >= 10, `${joined}`],
    [
      "…and ≥ 15% of suspended scanners joined",
      suspended ? joinedSuspended / suspended >= 0.15 : null,
      `${joinedSuspended}/${suspended} = ${pct(joinedSuspended, suspended)}`,
    ],
    [
      "≥ 30% of suspended scanners want the 14-day email",
      suspended ? optInSuspended / suspended >= 0.3 : null,
      `${optInSuspended}/${suspended} = ${pct(optInSuspended, suspended)}`,
    ],
  ];
  console.log("SUCCESS THRESHOLDS (Step 6)");
  for (const [name, ok, val] of checks) console.log(`  [${mark(ok)}] ${name.padEnd(52)} ${val}`);

  console.log("\nKILL CONDITIONS ([OK] = not triggered)");
  const distributionFailed = answersPosted === null ? null : answersPosted >= 20 && storeCount < 30;
  console.log(
    `  [${mark(distributionFailed === null ? null : !distributionFailed)}] < 30 stores after ≥ 20 public answers: ` +
      (answersPosted === null ? "pass --answers N to check" : `${storeCount} stores, ${answersPosted} answers`),
  );
  const noPay = suspended ? joinedSuspended / suspended < 0.05 : null;
  console.log(`  [${mark(noPay === null ? null : !noPay)}] < 5% of suspended scanners join the priced waitlist`);
  const noMoat = suspended ? optInSuspended / suspended < 0.15 : null;
  console.log(`  [${mark(noMoat === null ? null : !noMoat)}] < 15% of suspended scanners opt in to the outcome email`);
  console.log("\n'?' = not enough data yet. Small numbers swing a lot: read the counts, not just the percentages.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
