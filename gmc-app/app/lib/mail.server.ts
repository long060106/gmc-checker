// Minimal email sender over Resend's HTTP API (no SDK). Used by scripts/send-outcome-emails.ts.
// Env: RESEND_API_KEY, MAIL_FROM (e.g. "Storefront Check <hello@yourdomain.com>").

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

export async function sendMail({ to, subject, text, html, headers }: MailInput): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new Error("RESEND_API_KEY and MAIL_FROM must be set to send email");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, html, headers }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !body.id) {
    throw new Error(`Resend error ${res.status}: ${body.message ?? "unknown error"}`);
  }
  return body.id;
}
