import { DateTime } from "luxon";

/** A span of time in epoch milliseconds. `end` is exclusive. */
export type Interval = { start: number; end: number };
export type MinuteWindow = { startMin: number; endMin: number };

const MIN = 60_000;

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** `base` minus `remove`. Both lists are merged first. */
export function subtractIntervals(base: Interval[], remove: Interval[]): Interval[] {
  const cuts = mergeIntervals(remove);
  const out: Interval[] = [];
  for (const b of mergeIntervals(base)) {
    let cursor = b.start;
    for (const c of cuts) {
      if (c.end <= cursor) continue;
      if (c.start >= b.end) break;
      if (c.start > cursor) out.push({ start: cursor, end: c.start });
      cursor = Math.max(cursor, c.end);
    }
    if (cursor < b.end) out.push({ start: cursor, end: b.end });
  }
  return out;
}

/** Epoch ms of a local clock time on a local calendar day, e.g. "2026-10-16" and 1140 = 19:00 there. */
export function localInstant(zone: string, day: string, minutesAfterMidnight: number): number {
  const [y, m, d] = day.split("-").map(Number);
  if (minutesAfterMidnight >= 1440) {
    return DateTime.fromObject({ year: y, month: m, day: d }, { zone }).plus({ days: 1 }).toMillis();
  }
  return DateTime.fromObject({ year: y, month: m, day: d, hour: Math.floor(minutesAfterMidnight / 60), minute: minutesAfterMidnight % 60 }, { zone }).toMillis();
}

export function dayBounds(zone: string, day: string): Interval {
  return { start: localInstant(zone, day, 0), end: localInstant(zone, day, 1440) };
}

export type FreeInput = {
  zone: string;
  /** Local calendar date, YYYY-MM-DD. */
  day: string;
  /** The person's usual free windows for this weekday. */
  windows: MinuteWindow[];
  /** Extra free windows added for this date only. */
  adds?: MinuteWindow[];
  /** Times blocked for this date only. */
  blocks?: MinuteWindow[];
  /** Anything else that is taken: calendar events, booked sessions. */
  busy?: Interval[];
  /** Shortest gap worth showing, in minutes. */
  minGapMin?: number;
  /** Nothing before this moment is offered. Pass "now" so past time is not shown as free. */
  notBefore?: number;
};

export function freeGapsForDay(input: FreeInput): Interval[] {
  const { zone, day } = input;
  const toInterval = (w: MinuteWindow): Interval => ({ start: localInstant(zone, day, w.startMin), end: localInstant(zone, day, w.endMin) });
  const bounds = dayBounds(zone, day);
  let free = mergeIntervals([...input.windows, ...(input.adds ?? [])].map(toInterval));
  free = subtractIntervals(free, (input.blocks ?? []).map(toInterval));
  free = subtractIntervals(free, input.busy ?? []);
  const min = (input.minGapMin ?? 20) * MIN;
  const from = input.notBefore != null ? Math.ceil(input.notBefore / (5 * MIN)) * 5 * MIN : -Infinity;
  return free
    .map((i) => ({ start: Math.max(i.start, bounds.start, from), end: Math.min(i.end, bounds.end) }))
    .filter((i) => i.end - i.start >= min);
}

export const minutesOf = (i: Interval) => Math.round((i.end - i.start) / MIN);

/** The seven local dates of the week that contains `day`. weekStartDay: 0 = Sunday. */
export function weekDays(day: string, zone: string, weekStartDay = 0): string[] {
  const d = DateTime.fromISO(day, { zone });
  const back = ((d.weekday % 7) - weekStartDay + 7) % 7;
  const start = d.minus({ days: back });
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }).toISODate() as string);
}

export function todayIn(zone: string, now = new Date()): string {
  return DateTime.fromJSDate(now, { zone }).toISODate() as string;
}

export function isDay(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value).isValid);
}

/** "19:00" to 1140. Returns null for anything that is not a time of day. */
export function parseClock(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

export function clockOf(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Local "YYYY-MM-DD" plus "HH:mm" to an instant in the given zone. Null when invalid. */
export function parseLocal(zone: string, day: string, clock: string): Date | null {
  const mins = parseClock(clock);
  if (!isDay(day) || mins == null || mins >= 1440) return null;
  return new Date(localInstant(zone, day, mins));
}
