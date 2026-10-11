import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "@/db";
import { freeOverride, freeWindow, item, planSession, type Category } from "@/db/schema";
import { minutesBetween } from "./entries";
import { dayBounds, freeGapsForDay, minutesOf, todayIn, weekDays, type Interval } from "./freetime";
import { getBusy, type BusyResult } from "./google-calendar";
import { loadCandidates } from "./home";
import { fitSuggestions } from "./suggest";
import { weekBounds } from "./time";

export type SessionView = {
  kind: "session";
  id: string;
  title: string;
  category: Category | null;
  start: Date;
  end: Date;
  durationMin: number;
  done: boolean;
  nightId: string | null;
  itemId: string | null;
};

export type FreeView = {
  kind: "free";
  start: Date;
  end: Date;
  minutes: number;
  /** Titles that would fit, best first. */
  fits: string[];
};

export type PlanData = {
  zone: string;
  today: string;
  selected: string;
  days: { day: string; hasPlan: boolean }[];
  items: (SessionView | FreeView)[];
  adjustments: { id: string; kind: "add" | "block"; startMin: number; endMin: number }[];
  hasWindows: boolean;
  calendar: BusyResult["status"];
  goalMinutes: number;
  spentMinutes: number;
  /** Minutes left to reach the weekly goal, counting booked sessions that are not done yet. */
  plannedMinutes: number;
};

export async function loadPlan(
  userId: string,
  profile: { timezone: string; weeklyGoalMinutes: number },
  selected: string,
  now = new Date(),
): Promise<PlanData> {
  const zone = profile.timezone;
  const days = weekDays(selected, zone, 0);
  const weekStart = dayBounds(zone, days[0]).start;
  const weekEnd = dayBounds(zone, days[6]).end;
  const today = todayIn(zone, now);
  const thisWeek = weekBounds(now, zone, 0);

  const [windows, overrides, sessions, busy, candidates, spent] = await Promise.all([
    db.select().from(freeWindow).where(eq(freeWindow.userId, userId)),
    db.select().from(freeOverride).where(and(eq(freeOverride.userId, userId), gte(freeOverride.day, days[0]), lte(freeOverride.day, days[6]))),
    db
      .select({ s: planSession, i: item })
      .from(planSession)
      .leftJoin(item, eq(planSession.itemId, item.id))
      .where(and(eq(planSession.userId, userId), gte(planSession.startsAt, new Date(weekStart)), lt(planSession.startsAt, new Date(weekEnd))))
      .orderBy(asc(planSession.startsAt)),
    getBusy(userId, new Date(weekStart), new Date(weekEnd)),
    loadCandidates(userId),
    minutesBetween(userId, thisWeek.start, thisWeek.end),
  ]);

  const dayOf = (d: Date) => DateTime.fromJSDate(d, { zone }).toISODate() as string;
  const sessionViews: SessionView[] = sessions.map(({ s, i }) => ({
    kind: "session",
    id: s.id,
    title: s.title,
    category: s.category ?? i?.category ?? null,
    start: s.startsAt,
    end: new Date(s.startsAt.getTime() + s.durationMin * 60_000),
    durationMin: s.durationMin,
    done: s.done,
    nightId: s.nightId,
    itemId: s.itemId,
  }));

  const dayWeekday = DateTime.fromISO(selected, { zone }).weekday % 7;
  const dayWindows = windows.filter((w) => w.weekday === dayWeekday);
  const dayOverrides = overrides.filter((o) => o.day === selected);
  const daySessions = sessionViews.filter((s) => dayOf(s.start) === selected);
  const taken: Interval[] = [...busy.busy, ...daySessions.filter((s) => !s.done).map((s) => ({ start: s.start.getTime(), end: s.end.getTime() }))];

  const gaps = freeGapsForDay({
    zone,
    day: selected,
    windows: dayWindows,
    adds: dayOverrides.filter((o) => o.kind === "add"),
    blocks: dayOverrides.filter((o) => o.kind === "block"),
    busy: taken,
    notBefore: selected === today ? now.getTime() : selected < today ? Infinity : undefined,
  });

  const free: FreeView[] = gaps.map((g) => {
    const minutes = minutesOf(g);
    return {
      kind: "free",
      start: new Date(g.start),
      end: new Date(g.end),
      minutes,
      fits: fitSuggestions(candidates, minutes, { limit: 2, now }).map((s) => s.title),
    };
  });

  const items = [...daySessions, ...free].sort((a, b) => a.start.getTime() - b.start.getTime());
  const plannedMinutes = sessionViews.filter((s) => !s.done && s.start.getTime() >= now.getTime()).reduce((n, s) => n + s.durationMin, 0);

  return {
    zone,
    today,
    selected,
    days: days.map((d) => ({ day: d, hasPlan: sessionViews.some((s) => dayOf(s.start) === d) })),
    items,
    adjustments: dayOverrides.map((o) => ({ id: o.id, kind: o.kind, startMin: o.startMin, endMin: o.endMin })),
    hasWindows: windows.length > 0,
    calendar: busy.status,
    goalMinutes: profile.weeklyGoalMinutes,
    spentMinutes: spent,
    plannedMinutes,
  };
}
