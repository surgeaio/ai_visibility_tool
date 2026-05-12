/**
 * Local scheduler process: optionally pings the cron route hourly when APP_URL + CRON_SECRET are set.
 * Vercel production should use vercel.json crons instead.
 */
import cron from "node-cron";

const appUrl = process.env.APP_URL?.replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

if (appUrl && secret) {
  cron.schedule("0 * * * *", async () => {
    const url = `${appUrl}/api/cron/run-schedules`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      console.log("[scheduler] cron ping", res.status, await res.text());
    } catch (err) {
      console.error("[scheduler] cron ping failed", err);
    }
  });
  console.log("[scheduler] hourly HTTP cron enabled →", `${appUrl}/api/cron/run-schedules`);
} else {
  console.log(
    "[scheduler] idle (set APP_URL + CRON_SECRET to enable hourly HTTP ping, or rely on Vercel cron in production).",
  );
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
