// Loads one review attempt and turns it into the review kit (see ./kit.ts).
import prisma from "../db.server";
import { CHECK_INFO } from "../engine/run";
import type { Finding } from "../engine/types";
import { parseResults } from "./appscan.server";
import { LABELS } from "./labels";
import type { KitFlagged, KitInput } from "./kit";

const title = (id: string) => CHECK_INFO[id]?.title ?? id;

function parseFindings(json: string | undefined): Finding[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as Finding[];
  } catch {
    return [];
  }
}

/** The kit for attempt `attemptNo` of this shop, or null if there is no such attempt. */
export async function loadKit(shop: string, attemptNo: number): Promise<KitInput | null> {
  const profile = await prisma.shopProfile.findUnique({ where: { shop }, select: { shopKey: true } });
  if (!profile?.shopKey || !Number.isInteger(attemptNo) || attemptNo < 1) return null;
  const shopKey = profile.shopKey;

  const attempt = await prisma.reviewAttempt.findFirst({
    where: { shopKey, attemptNo },
    include: { fixes: true },
  });
  if (!attempt) return null;

  const [snapshot, baseline, detail, earlier] = await Promise.all([
    attempt.snapshotScanId ? prisma.scan.findUnique({ where: { id: attempt.snapshotScanId } }) : null,
    prisma.scan.findUnique({ where: { id: attempt.baselineScanId } }),
    attempt.snapshotScanId ? prisma.appScanDetail.findUnique({ where: { scanId: attempt.snapshotScanId } }) : null,
    prisma.reviewAttempt.findMany({
      where: { shopKey, attemptNo: { lt: attemptNo } },
      select: { attemptNo: true, requestedAt: true, outcome: true },
    }),
  ]);

  const findings = parseFindings(detail?.findings);
  const byId = new Map(findings.map((f) => [f.checkId, f]));
  // A diff is only meaningful between two different scans made by the same engine version.
  const comparable =
    !!snapshot && !!baseline && baseline.id !== snapshot.id && baseline.engineVersion === snapshot.engineVersion;

  // Still flagged: from the full findings when we have them, else from the bare statuses.
  const stillFlagged: KitFlagged[] = findings.length
    ? findings
        .filter((f): f is Finding & { status: "fail" | "warn" } => f.status === "fail" || f.status === "warn")
        .map((f) => ({
          checkId: f.checkId,
          title: title(f.checkId),
          status: f.status,
          evidence: f.evidence,
          shopifyFix: f.shopifyFix,
          googleRef: f.googleRef,
        }))
    : Object.entries(snapshot ? parseResults(snapshot) : {})
        .filter(([, s]) => s === "fail" || s === "warn")
        .map(([id, s]) => ({ checkId: id, title: title(id), status: s as "fail" | "warn", evidence: "(details not saved)" }));

  return {
    store: shop,
    attemptNo,
    issue: LABELS[attempt.label] ?? attempt.label,
    requestedAt: attempt.requestedAt.toISOString(),
    baselineAt: comparable && baseline ? baseline.createdAt.toISOString() : null,
    fixed: attempt.fixes.map((f) => ({ checkId: f.checkId, title: title(f.checkId), googleRef: byId.get(f.checkId)?.googleRef })),
    stillFlagged,
    earlier: earlier.map((e) => ({ ...e, requestedAt: e.requestedAt.toISOString() })),
  };
}
