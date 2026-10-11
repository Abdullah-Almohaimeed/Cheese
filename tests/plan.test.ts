import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, entry, freeOverride, freeWindow, planSession, progressLog } from "@/db/schema";
import { addEntry, upsertItem } from "@/lib/library";
import { loadPlan } from "@/lib/plan";
import { bookSession, completeSession, overlapping, removeSession } from "@/lib/sessions";
import { FREEBUSY_SCOPE, calendarConnected, clearBusyCache, disconnectCalendar, getBusy } from "@/lib/google-calendar";
import { localInstant } from "@/lib/freetime";
import { makeUser, resetDb } from "./helpers";

const ZONE = "Asia/Riyadh";
// Friday 16 Oct 2026, 15:00 in Riyadh.
const NOW = new Date(localInstant(ZONE, "2026-10-16", 15 * 60));
const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(localInstant(ZONE, day, h * 60 + m));
};

beforeEach(async () => {
  await resetDb();
  clearBusyCache();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup() {
  const me = await makeUser("Yousef");
  await db.update((await import("@/db/schema")).profile).set({ timezone: ZONE }).where(eq((await import("@/db/schema")).profile.userId, me.id));
  const it = await upsertItem({ category: "anime", source: "anilist", externalId: "1", title: "Frieren", creator: null, year: null, coverUrl: null, summary: null, unit: "episode", totalUnits: 28, unitSeconds: 1440, genres: [], platforms: [] });
  const { entry: e } = await addEntry(me.id, it.id);
  await db.update(entry).set({ status: "in_progress", progress: 7 }).where(eq(entry.id, e.id));
  return { me, it, e };
}

describe("bookSession", () => {
  it("books a session and refuses a double booking", async () => {
    const { me, it } = await setup();
    const first = await bookSession(me.id, { itemId: it.id, title: "Frieren · 2 episodes", category: "anime", startsAt: at("2026-10-16", "21:00"), durationMin: 48, units: 2 }, NOW);
    expect(first.ok).toBe(true);
    const clash = await bookSession(me.id, { itemId: it.id, title: "Again", startsAt: at("2026-10-16", "21:30"), durationMin: 30 }, NOW);
    expect(clash).toEqual({ ok: false, error: "You already have “Frieren · 2 episodes” at that time." });
    const after = await bookSession(me.id, { itemId: it.id, title: "Later", startsAt: at("2026-10-16", "21:48"), durationMin: 30 }, NOW);
    expect(after.ok).toBe(true); // back to back is fine
  });

  it("rejects the past, silly lengths, empty titles, and items you do not have", async () => {
    const { me, it } = await setup();
    const other = await makeUser("Sara");
    expect((await bookSession(me.id, { title: "Old", startsAt: at("2026-10-15", "21:00"), durationMin: 30 }, NOW)).ok).toBe(false);
    expect((await bookSession(me.id, { title: "Short", startsAt: at("2026-10-16", "21:00"), durationMin: 2 }, NOW)).ok).toBe(false);
    expect((await bookSession(me.id, { title: "Long", startsAt: at("2026-10-16", "21:00"), durationMin: 900 }, NOW)).ok).toBe(false);
    expect((await bookSession(me.id, { title: "  ", startsAt: at("2026-10-16", "21:00"), durationMin: 30 }, NOW)).ok).toBe(false);
    expect((await bookSession(other.id, { itemId: it.id, title: "Mine?", startsAt: at("2026-10-16", "21:00"), durationMin: 30 }, NOW)).ok).toBe(false);
  });

  it("another person's time does not conflict", async () => {
    const { me } = await setup();
    const sara = await makeUser("Sara");
    await bookSession(me.id, { title: "A", startsAt: at("2026-10-16", "21:00"), durationMin: 60 }, NOW);
    expect((await bookSession(sara.id, { title: "B", startsAt: at("2026-10-16", "21:00"), durationMin: 60 }, NOW)).ok).toBe(true);
  });

  it("a finished session no longer blocks the time", async () => {
    const { me } = await setup();
    const a = await bookSession(me.id, { title: "A", startsAt: at("2026-10-16", "21:00"), durationMin: 60 }, NOW);
    if (!a.ok) throw new Error("setup");
    await completeSession(me.id, a.session.id);
    expect(await overlapping(me.id, at("2026-10-16", "21:10"), at("2026-10-16", "21:40"))).toHaveLength(0);
  });
});

describe("completeSession", () => {
  it("applies the planned episodes and counts the time once", async () => {
    const { me, it, e } = await setup();
    const b = await bookSession(me.id, { itemId: it.id, title: "Frieren · 2 episodes", startsAt: at("2026-10-16", "21:00"), durationMin: 48, units: 2 }, NOW);
    if (!b.ok) throw new Error("setup");
    await completeSession(me.id, b.session.id);
    await completeSession(me.id, b.session.id); // double tap
    const [after] = await db.select().from(entry).where(eq(entry.id, e.id));
    expect(after.progress).toBe(9);
    const logs = await db.select().from(progressLog).where(eq(progressLog.userId, me.id));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ deltaUnits: 2, minutes: 48 });
  });

  it("a session without units logs its length as time", async () => {
    const { me } = await setup();
    const b = await bookSession(me.id, { title: "Board games", startsAt: at("2026-10-16", "21:00"), durationMin: 90 }, NOW);
    if (!b.ok) throw new Error("setup");
    await completeSession(me.id, b.session.id);
    const logs = await db.select().from(progressLog).where(eq(progressLog.userId, me.id));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ deltaUnits: 0, minutes: 90 });
  });

  it("cannot complete or remove someone else's session", async () => {
    const { me } = await setup();
    const sara = await makeUser("Sara");
    const b = await bookSession(me.id, { title: "A", startsAt: at("2026-10-16", "21:00"), durationMin: 60 }, NOW);
    if (!b.ok) throw new Error("setup");
    expect(await completeSession(sara.id, b.session.id)).toBeNull();
    expect(await removeSession(sara.id, b.session.id)).toBe(false);
    expect((await db.select().from(planSession))[0].done).toBe(false);
  });
});

describe("loadPlan", () => {
  async function withFriday() {
    const s = await setup();
    // Usual free time: 20:00 to 23:00 every day.
    await db.insert(freeWindow).values(Array.from({ length: 7 }, (_, weekday) => ({ userId: s.me.id, weekday, startMin: 1200, endMin: 1380 })));
    return s;
  }
  const profile = { timezone: ZONE, weeklyGoalMinutes: 360 };

  it("shows the usual window as one free gap with suggestions", async () => {
    const { me } = await withFriday();
    const plan = await loadPlan(me.id, profile, "2026-10-16", NOW);
    expect(plan.hasWindows).toBe(true);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({ kind: "free", minutes: 180, fits: ["Frieren"] });
    expect(plan.days.map((d) => d.day)[0]).toBe("2026-10-11");
    expect(plan.calendar).toBe("not_connected");
  });

  it("a booked session splits the gap and the timeline is in time order", async () => {
    const { me, it } = await withFriday();
    await bookSession(me.id, { itemId: it.id, title: "Frieren · 2 episodes", category: "anime", startsAt: at("2026-10-16", "21:00"), durationMin: 48, units: 2 }, NOW);
    const plan = await loadPlan(me.id, profile, "2026-10-16", NOW);
    expect(plan.items.map((i) => i.kind)).toEqual(["free", "session", "free"]);
    expect(plan.items[0]).toMatchObject({ minutes: 60 });
    expect(plan.items[2]).toMatchObject({ minutes: 72 });
    expect(plan.days.find((d) => d.day === "2026-10-16")?.hasPlan).toBe(true);
    expect(plan.plannedMinutes).toBe(48);
  });

  it("per-day adjustments add and block time", async () => {
    const { me } = await withFriday();
    await db.insert(freeOverride).values([
      { userId: me.id, day: "2026-10-17", kind: "add", startMin: 14 * 60, endMin: 16 * 60 },
      { userId: me.id, day: "2026-10-17", kind: "block", startMin: 22 * 60, endMin: 23 * 60 },
    ]);
    const plan = await loadPlan(me.id, profile, "2026-10-17", NOW);
    expect(plan.items.map((i) => (i.kind === "free" ? i.minutes : 0))).toEqual([120, 120]);
    expect(plan.adjustments).toHaveLength(2);
    // The same adjustments do not leak onto another day.
    expect((await loadPlan(me.id, profile, "2026-10-18", NOW)).adjustments).toHaveLength(0);
  });

  it("today does not offer time that has passed, and past days offer none", async () => {
    const { me } = await withFriday();
    const late = new Date(localInstant(ZONE, "2026-10-16", 21 * 60 + 10));
    const plan = await loadPlan(me.id, profile, "2026-10-16", late);
    expect(plan.items[0]).toMatchObject({ kind: "free", minutes: 110 }); // 21:10 rounded to 21:10, until 23:00
    expect((await loadPlan(me.id, profile, "2026-10-14", late)).items).toHaveLength(0);
  });

  it("with no usual free time set, there are no gaps and hasWindows is false", async () => {
    const { me } = await setup();
    const plan = await loadPlan(me.id, profile, "2026-10-16", NOW);
    expect(plan.hasWindows).toBe(false);
    expect(plan.items).toHaveLength(0);
  });

  it("only shows my own sessions", async () => {
    const { me } = await withFriday();
    const sara = await makeUser("Sara");
    await bookSession(sara.id, { title: "Sara's", startsAt: at("2026-10-16", "21:00"), durationMin: 60 }, NOW);
    const plan = await loadPlan(me.id, profile, "2026-10-16", NOW);
    expect(plan.items.every((i) => i.kind === "free")).toBe(true);
  });
});

describe("Google Calendar busy times", () => {
  async function connect(userId: string, over: Partial<typeof account.$inferInsert> = {}) {
    await db.insert(account).values({
      id: "acc1", accountId: "g1", providerId: "google", userId, scope: `openid,email,profile,${FREEBUSY_SCOPE}`,
      accessToken: "tok", refreshToken: "ref", accessTokenExpiresAt: new Date(Date.now() + 3_600_000), ...over,
    });
  }
  const week = [new Date("2026-10-11T00:00:00Z"), new Date("2026-10-18T00:00:00Z")] as const;

  function google(handlers: Record<string, (init?: RequestInit) => Response>) {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      for (const [k, h] of Object.entries(handlers)) if (String(url).includes(k)) return h(init);
      return new Response("nope", { status: 404 });
    }));
    return calls;
  }

  it("is not connected without the calendar permission", async () => {
    const me = await makeUser("Yousef");
    await connect(me.id, { scope: "openid,email,profile" });
    expect(await calendarConnected(me.id)).toBe(false);
    expect((await getBusy(me.id, ...week)).status).toBe("not_connected");
  });

  it("reads busy times and sends only the free/busy request", async () => {
    const me = await makeUser("Yousef");
    await connect(me.id);
    const calls = google({ "calendar/v3/freeBusy": () => Response.json({ calendars: { primary: { busy: [{ start: "2026-10-16T18:00:00Z", end: "2026-10-16T19:00:00Z" }] } } }) });
    const res = await getBusy(me.id, ...week);
    expect(res.status).toBe("ok");
    expect(res.busy).toEqual([{ start: Date.parse("2026-10-16T18:00:00Z"), end: Date.parse("2026-10-16T19:00:00Z") }]);
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(calls[0].init?.body)).items).toEqual([{ id: "primary" }]);
  });

  it("caches for a couple of minutes", async () => {
    const me = await makeUser("Yousef");
    await connect(me.id);
    const calls = google({ "freeBusy": () => Response.json({ calendars: { primary: { busy: [] } } }) });
    await getBusy(me.id, ...week);
    await getBusy(me.id, ...week);
    expect(calls).toHaveLength(1);
  });

  it("refreshes an expired token and stores the new one", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "cid");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "sec");
    const me = await makeUser("Yousef");
    await connect(me.id, { accessToken: "old", accessTokenExpiresAt: new Date(Date.now() - 1000) });
    const calls = google({
      "oauth2.googleapis.com/token": () => Response.json({ access_token: "new", expires_in: 3599 }),
      "freeBusy": () => Response.json({ calendars: { primary: { busy: [] } } }),
    });
    expect((await getBusy(me.id, ...week)).status).toBe("ok");
    expect(String(calls[0].init?.body)).toContain("grant_type=refresh_token");
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe("Bearer new");
    const [row] = await db.select().from(account).where(eq(account.userId, me.id));
    expect(row.accessToken).toBe("new");
  });

  it("when Google says access was revoked, the tokens are forgotten", async () => {
    const me = await makeUser("Yousef");
    await connect(me.id, { accessToken: null, accessTokenExpiresAt: null });
    google({ "oauth2.googleapis.com/token": () => Response.json({ error: "invalid_grant" }, { status: 400 }) });
    expect((await getBusy(me.id, ...week)).status).toBe("not_connected");
    const [row] = await db.select().from(account).where(eq(account.userId, me.id));
    expect(row.refreshToken).toBeNull();
    expect(await calendarConnected(me.id)).toBe(false);
  });

  it("a Google outage reads as an error, not as free time everywhere, and is not cached", async () => {
    const me = await makeUser("Yousef");
    await connect(me.id);
    const calls = google({ "freeBusy": () => new Response("down", { status: 503 }) });
    expect((await getBusy(me.id, ...week)).status).toBe("error");
    await getBusy(me.id, ...week);
    expect(calls).toHaveLength(2);
  });

  it("disconnecting drops the tokens and the calendar permission", async () => {
    const me = await makeUser("Yousef");
    await connect(me.id);
    const calls = google({ "oauth2.googleapis.com/revoke": () => new Response("{}", { status: 200 }) });
    await disconnectCalendar(me.id);
    expect(calls[0].url).toContain("revoke?token=ref");
    expect(await calendarConnected(me.id)).toBe(false);
    const [row] = await db.select().from(account).where(and(eq(account.userId, me.id)));
    expect(row.scope).toBe("openid,email,profile");
  });

  it("busy time from Google removes free time on the plan", async () => {
    const me = await makeUser("Yousef");
    const { profile: p } = await import("@/db/schema");
    await db.update(p).set({ timezone: ZONE }).where(eq(p.userId, me.id));
    await db.insert(freeWindow).values({ userId: me.id, weekday: 5, startMin: 1200, endMin: 1380 });
    await connect(me.id);
    google({ "freeBusy": () => Response.json({ calendars: { primary: { busy: [{ start: at("2026-10-16", "21:00").toISOString(), end: at("2026-10-16", "22:00").toISOString() }] } } }) });
    const plan = await loadPlan(me.id, { timezone: ZONE, weeklyGoalMinutes: 360 }, "2026-10-16", NOW);
    expect(plan.calendar).toBe("ok");
    expect(plan.items.map((i) => (i.kind === "free" ? i.minutes : -1))).toEqual([60, 60]);
  });
});
