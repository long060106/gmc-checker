// Day-14 outcome email: one question, sent once to people who ticked
// "Email me in 14 days so I can log whether I got reinstated" on /scan.
//
//   npm run outcome:send            → DRY RUN (default): prints who would get what, sends nothing
//   npm run outcome:send -- --send  → really sends (needs the env vars below)
//
// Env: APP_PUBLIC_URL, MAIL_FROM, RESEND_API_KEY, MAIL_POSTAL_ADDRESS.
// MAIL_POSTAL_ADDRESS is required for real sends: US CAN-SPAM requires a valid physical postal
// address in commercial email. A PO box or registered mailbox is acceptable.
import { PrismaClient } from "@prisma/client";
import { sendMail } from "../app/lib/mail.server";

try {
  process.loadEnvFile(".env"); // Node ≥ 20.12; scripts don't run through Vite
} catch {
  // no .env file — rely on the real environment
}

const SEND = process.argv.includes("--send");
const prisma = new PrismaClient();

function requireEnv(names: string[]): Record<string, string> {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    console.error(`Refusing to send. Missing env: ${missing.join(", ")}`);
    if (missing.includes("MAIL_POSTAL_ADDRESS")) {
      console.error("MAIL_POSTAL_ADDRESS is required by CAN-SPAM (a physical postal address in every commercial email).");
    }
    process.exit(1);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]!.trim()]));
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildEmail(base: string, token: string, postal: string) {
  const link = (a: string) => `${base}/outcome/${token}?a=${a}`;
  const unsub = `${base}/unsubscribe/${token}`;
  const subject = "One question: did Google finish reviewing your Merchant Center account?";
  const text = [
    "Hi,",
    "",
    "About two weeks ago you ran our free storefront check and asked us to check in.",
    "",
    "Did Google finish reviewing your Merchant Center account? Open the link that fits and press the button:",
    "",
    `  Reinstated:     ${link("reinstated")}`,
    `  Rejected:       ${link("rejected")}`,
    `  Still waiting:  ${link("pending")}`,
    "",
    "We only use answers as counts. We never publish your email or your store.",
    "This is the only email we send about it. You won't get it twice.",
    "",
    "--",
    "Independent tool, not affiliated with Google. Google alone decides on reviews and reinstatement.",
    `Unsubscribe: ${unsub}`,
    postal,
  ].join("\n");
  const btn = (a: string, label: string) =>
    `<a href="${esc(link(a))}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 16px;border:1px solid #1f5199;border-radius:6px;color:#1f5199;text-decoration:none">${label}</a>`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px">
<p>Hi,</p>
<p>About two weeks ago you ran our free storefront check and asked us to check in.</p>
<p><strong>Did Google finish reviewing your Merchant Center account?</strong></p>
<p>${btn("reinstated", "Reinstated")}${btn("rejected", "Rejected")}${btn("pending", "Still waiting")}</p>
<p style="color:#5c5f62">We only use answers as counts. We never publish your email or your store. This is the only email we send about it.</p>
<hr style="border:none;border-top:1px solid #e1e3e5">
<p style="color:#5c5f62;font-size:12px">Independent tool, not affiliated with Google. Google alone decides on reviews and reinstatement.<br>
<a href="${esc(unsub)}" style="color:#5c5f62">Unsubscribe</a><br>${esc(postal)}</p>
</body></html>`;
  const headers = {
    "List-Unsubscribe": `<${unsub}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  return { subject, text, html, headers };
}

async function main() {
  const env = SEND
    ? requireEnv(["APP_PUBLIC_URL", "MAIL_FROM", "RESEND_API_KEY", "MAIL_POSTAL_ADDRESS"])
    : {
        APP_PUBLIC_URL: process.env.APP_PUBLIC_URL?.trim() || "http://localhost:3000",
        MAIL_POSTAL_ADDRESS: process.env.MAIL_POSTAL_ADDRESS?.trim() || "[MAIL_POSTAL_ADDRESS not set]",
      };
  const base = env.APP_PUBLIC_URL.replace(/\/+$/, "");

  const due = await prisma.waitlistEntry.findMany({
    where: {
      outcomeEmailOptIn: true,
      unsubscribed: false,
      outcomeEmailSentAt: null,
      outcomeToken: { not: null },
      outcomeEmailSendAfter: { lte: new Date() },
    },
    orderBy: { outcomeEmailSendAfter: "asc" },
  });

  console.log(`${SEND ? "SENDING" : "DRY RUN"}: ${due.length} email(s) due.`);
  let sent = 0;
  for (const entry of due) {
    const mail = buildEmail(base, entry.outcomeToken!, env.MAIL_POSTAL_ADDRESS);
    if (!SEND) {
      console.log(`- would send to ${entry.email} (signed up ${entry.createdAt.toISOString().slice(0, 10)}): ${base}/outcome/${entry.outcomeToken}`);
      continue;
    }
    try {
      const id = await sendMail({ to: entry.email, ...mail });
      await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { outcomeEmailSentAt: new Date() } });
      sent++;
      console.log(`- sent to ${entry.email} (${id})`);
    } catch (e) {
      console.error(`- FAILED for ${entry.email}: ${(e as Error).message}`);
    }
  }
  if (!SEND && due.length) console.log("Nothing was sent. Run with --send to send for real.");
  if (SEND) console.log(`Done: ${sent}/${due.length} sent.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
