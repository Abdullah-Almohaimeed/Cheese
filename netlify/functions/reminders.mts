// Runs every five minutes on Netlify and asks the app to send any reminders that are due.
// On other hosts, point any scheduler at GET /api/cron/reminders with the same Authorization header.
import type { Config } from "@netlify/functions";

export default async () => {
  const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.log("reminders: URL or CRON_SECRET is missing, skipping");
    return;
  }
  const res = await fetch(`${base}/api/cron/reminders`, { headers: { Authorization: `Bearer ${secret}` } });
  console.log("reminders:", res.status, await res.text());
};

export const config: Config = { schedule: "*/5 * * * *" };
