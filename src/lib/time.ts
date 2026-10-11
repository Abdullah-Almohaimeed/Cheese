import { DateTime } from "luxon";

export function isValidZone(zone: string): boolean {
  return DateTime.local().setZone(zone).isValid;
}

/** The week containing `now`, in the person's timezone. weekStartDay: 0 = Sunday ... 6 = Saturday. */
export function weekBounds(now: Date, zone: string, weekStartDay = 0): { start: Date; end: Date } {
  const local = DateTime.fromJSDate(now, { zone });
  const dow = local.weekday % 7; // Luxon: Monday = 1 ... Sunday = 7. This makes Sunday 0.
  const back = (dow - weekStartDay + 7) % 7;
  const start = local.startOf("day").minus({ days: back });
  return { start: start.toJSDate(), end: start.plus({ days: 7 }).toJSDate() };
}

/** "4.5" or "4": hours with at most one decimal, no trailing zero. */
export function hoursLabel(minutes: number): string {
  const h = Math.round((Math.max(0, minutes) / 60) * 10) / 10;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

/** "Fri 16 Oct" style, in the person's timezone. */
export function dayLabel(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("ccc d LLL");
}

/** "9:00 pm" style, in the person's timezone. */
export function timeLabel(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("h:mm a").toLowerCase();
}

/** 24-hour "19:00", for the timeline column. */
export function clock24(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("HH:mm");
}

/** "Today", "Tomorrow", or "Fri 16 Oct" relative to now. */
export function relativeDay(d: Date, now: Date, zone: string): string {
  const a = DateTime.fromJSDate(d, { zone }).startOf("day");
  const b = DateTime.fromJSDate(now, { zone }).startOf("day");
  const diff = Math.round(a.diff(b, "days").days);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return dayLabel(d, zone);
}

/** "12 Oct", or "12 Oct 2025" when it is not this year. */
export function shortDate(d: Date, zone: string, now = new Date()): string {
  const local = DateTime.fromJSDate(d, { zone });
  const sameYear = local.year === DateTime.fromJSDate(now, { zone }).year;
  return local.toFormat(sameYear ? "d LLL" : "d LLL yyyy");
}
