// Keep-alive target for cron-job.org (pings every 10 minutes so Render's free instance never
// sleeps). Two bytes of plain text: cron-job.org rejects large responses, and no database call.
export const loader = () =>
  new Response("ok", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
