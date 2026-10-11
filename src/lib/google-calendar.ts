import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account } from "@/db/schema";
import type { Interval } from "./freetime";

import { FREEBUSY_SCOPE } from "./google-scope";

export { FREEBUSY_SCOPE };

export type BusyResult = { status: "ok" | "not_connected" | "error"; busy: Interval[] };

export function hasCalendarScope(scope: string | null | undefined): boolean {
  return (scope ?? "").split(/[\s,]+/).includes(FREEBUSY_SCOPE);
}

async function googleAccount(userId: string) {
  return db.query.account.findFirst({ where: and(eq(account.userId, userId), eq(account.providerId, "google")) });
}

export async function calendarConnected(userId: string): Promise<boolean> {
  const a = await googleAccount(userId);
  return Boolean(a && hasCalendarScope(a.scope) && (a.refreshToken || a.accessToken));
}

class Disconnected extends Error {}

/** A valid access token, refreshed with the stored refresh token when it has expired. */
async function accessToken(userId: string): Promise<string> {
  const a = await googleAccount(userId);
  if (!a || !hasCalendarScope(a.scope)) throw new Disconnected();
  const fresh = a.accessToken && a.accessTokenExpiresAt && a.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
  if (fresh) return a.accessToken as string;
  if (!a.refreshToken) throw new Disconnected();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: a.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (body.error === "invalid_grant") {
    // The person revoked access in their Google account. Forget the tokens so the app asks again.
    await db.update(account).set({ accessToken: null, refreshToken: null, accessTokenExpiresAt: null }).where(eq(account.id, a.id));
    throw new Disconnected();
  }
  if (!res.ok || !body.access_token) throw new Error(`token refresh failed: ${res.status}`);
  await db
    .update(account)
    .set({ accessToken: body.access_token, accessTokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 3600) * 1000) })
    .where(eq(account.id, a.id));
  return body.access_token;
}

const cache = new Map<string, { at: number; value: BusyResult }>();
const TTL_MS = 2 * 60_000;

/** When the person is busy between two moments, according to their primary Google calendar. */
export async function getBusy(userId: string, from: Date, to: Date): Promise<BusyResult> {
  const key = `${userId}|${from.getTime()}|${to.getTime()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: BusyResult;
  try {
    const token = await accessToken(userId);
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) {
      value = { status: "error", busy: [] };
    } else if (!res.ok) {
      value = { status: "error", busy: [] };
    } else {
      const data = (await res.json()) as { calendars?: { primary?: { busy?: { start: string; end: string }[]; errors?: unknown[] } } };
      const primary = data.calendars?.primary;
      if (!primary || primary.errors?.length) value = { status: "error", busy: [] };
      else value = { status: "ok", busy: (primary.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) })).filter((b) => b.end > b.start) };
    }
  } catch (e) {
    value = e instanceof Disconnected ? { status: "not_connected", busy: [] } : { status: "error", busy: [] };
  }
  if (value.status !== "error") cache.set(key, { at: Date.now(), value });
  return value;
}

/** Forget the calendar link: revoke at Google (best effort) and drop the stored tokens. */
export async function disconnectCalendar(userId: string): Promise<void> {
  const a = await googleAccount(userId);
  if (!a) return;
  const token = a.refreshToken ?? a.accessToken;
  if (token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
  }
  const remaining = (a.scope ?? "").split(/[\s,]+/).filter((s) => s && s !== FREEBUSY_SCOPE).join(",");
  await db.update(account).set({ accessToken: null, refreshToken: null, accessTokenExpiresAt: null, scope: remaining || null }).where(eq(account.id, a.id));
  for (const k of cache.keys()) if (k.startsWith(`${userId}|`)) cache.delete(k);
}

export function clearBusyCache() {
  cache.clear();
}
