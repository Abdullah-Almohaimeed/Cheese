import type { Category, Priority, Status, Unit } from "@/db/schema";
import { formatMinutes, unitSeconds } from "./length";

export type Candidate = {
  entryId: string;
  itemId: string;
  title: string;
  category: Category;
  coverUrl: string | null;
  status: Status;
  priority: Priority;
  progress: number;
  unit: Unit;
  totalUnits: number | null;
  unitSeconds: number | null;
  lastProgressAt: Date | null;
};

export type Chunk = { units: number; minutes: number; label: string };

export type Suggestion = {
  entryId: string;
  itemId: string;
  title: string;
  category: Category;
  coverUrl: string | null;
  status: Status;
  chunk: Chunk;
  /** Short reason shown under the title, for example "Finishes it". */
  reason: string | null;
  score: number;
};

// Most we suggest in one sitting, so a long free evening does not turn into a marathon.
const MAX_EPISODES = 6;
const MAX_CHAPTERS = 12;
const MAX_GAME_MINUTES = 180;
const MIN_PAGES = 10;
const MIN_GAME_MINUTES = 30;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** How much of this item fits in `available` minutes, or null if nothing sensible does. */
export function chunkFor(c: Candidate, available: number): Chunk | null {
  if (c.status === "done" || c.status === "dropped") return null;
  const per = unitSeconds(c) / 60; // minutes per unit
  const remaining = c.totalUnits == null ? Infinity : Math.max(0, c.totalUnits - c.progress);
  if (remaining <= 0) return null;

  switch (c.unit) {
    case "watch": {
      const minutes = Math.round(per);
      return minutes <= available ? { units: 1, minutes, label: "The whole movie" } : null;
    }
    case "episode": {
      const n = Math.min(Math.floor(available / per), remaining, MAX_EPISODES);
      if (n < 1) return null;
      return { units: n, minutes: Math.round(n * per), label: plural(n, "episode") };
    }
    case "chapter": {
      const n = Math.min(Math.floor(available / per), remaining, MAX_CHAPTERS);
      if (n < 1) return null;
      return { units: n, minutes: Math.round(n * per), label: plural(n, "chapter") };
    }
    case "page": {
      let pages = Math.min(Math.floor(available / per), remaining);
      if (pages >= 20 && pages < remaining) pages = Math.floor(pages / 5) * 5; // round to a friendlier number
      if (pages < Math.min(MIN_PAGES, remaining)) return null;
      return { units: pages, minutes: Math.round(pages * per), label: `About ${pages} pages` };
    }
    case "minute": {
      const minutes = Math.min(Math.floor(available / 15) * 15, remaining, MAX_GAME_MINUTES);
      if (minutes < Math.min(MIN_GAME_MINUTES, remaining)) return null;
      return { units: minutes, minutes, label: `A ${formatMinutes(minutes)} session` };
    }
  }
}

function remainingMinutes(c: Candidate): number | null {
  if (c.totalUnits == null) return null;
  return Math.max(0, ((c.totalUnits - c.progress) * unitSeconds(c)) / 60);
}

export function score(c: Candidate, chunk: Chunk, available: number, now: Date): { score: number; reason: string | null } {
  let s = c.status === "in_progress" ? 100 : c.status === "paused" ? 25 : 40;
  let reason: string | null = null;
  if (c.priority === "must") s += 25;
  if (c.status === "in_progress" && c.lastProgressAt) {
    const days = (now.getTime() - c.lastProgressAt.getTime()) / 86_400_000;
    if (days <= 3) s += 15;
    else if (days <= 14) s += 8;
  }
  s += (chunk.minutes / Math.max(available, 1)) * 20;
  const left = remainingMinutes(c);
  if (left != null && left > 0 && left <= chunk.minutes + 1) {
    s += 15;
    reason = c.unit === "watch" ? null : "Finishes it";
  } else if (c.priority === "must") {
    reason = "Marked must do";
  }
  return { score: s, reason };
}

/** The best few things that fit in `available` minutes, spread across categories where possible. */
export function fitSuggestions(cands: Candidate[], available: number, opts: { limit?: number; now?: Date } = {}): Suggestion[] {
  const limit = opts.limit ?? 3;
  const now = opts.now ?? new Date();
  const scored: Suggestion[] = [];
  for (const c of cands) {
    const chunk = chunkFor(c, available);
    if (!chunk) continue;
    const { score: sc, reason } = score(c, chunk, available, now);
    scored.push({ entryId: c.entryId, itemId: c.itemId, title: c.title, category: c.category, coverUrl: c.coverUrl, status: c.status, chunk, reason, score: sc });
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const picked: Suggestion[] = [];
  const seen = new Set<Category>();
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (!seen.has(s.category)) {
      picked.push(s);
      seen.add(s.category);
    }
  }
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export type PickOptions = {
  category?: Category;
  /** Only things that can be done in a sitting of this many minutes. */
  fitMinutes?: number;
  exclude?: string;
  rand?: () => number;
  now?: Date;
};

/** A weighted random pick: better-scoring items are likelier, but anything eligible can come up. */
export function pickForMe(cands: Candidate[], opts: PickOptions = {}): Suggestion | null {
  const rand = opts.rand ?? Math.random;
  const now = opts.now ?? new Date();
  const pool: Suggestion[] = [];
  for (const c of cands) {
    if (opts.category && c.category !== opts.category) continue;
    if (opts.exclude && c.entryId === opts.exclude) continue;
    if (c.status === "done" || c.status === "dropped") continue;
    const available = opts.fitMinutes ?? 240;
    const chunk = chunkFor(c, available) ?? defaultChunk(c);
    if (!chunk) continue;
    if (opts.fitMinutes && chunk.minutes > opts.fitMinutes) continue;
    const { score: sc, reason } = score(c, chunk, available, now);
    pool.push({ entryId: c.entryId, itemId: c.itemId, title: c.title, category: c.category, coverUrl: c.coverUrl, status: c.status, chunk, reason, score: sc });
  }
  if (!pool.length) return null;
  const total = pool.reduce((n, p) => n + p.score, 0);
  let r = rand() * total;
  for (const p of pool) {
    r -= p.score;
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}

/** A neutral "next bit" for items that did not fit the requested window. */
function defaultChunk(c: Candidate): Chunk | null {
  return chunkFor(c, 1_000_000) ? chunkFor(c, 120) ?? chunkFor(c, 1_000_000) : null;
}

/** "Episode 8 · 24 min", "Chapter 55", "Pick up at page 121". What the next tap would be about. */
export function nextUpText(c: Pick<Candidate, "unit" | "progress" | "totalUnits" | "unitSeconds">): string {
  const mins = Math.round(unitSeconds(c) / 60);
  switch (c.unit) {
    case "watch":
      return formatMinutes(mins);
    case "episode":
      return `Episode ${c.progress + 1}${c.unitSeconds ? ` · ${mins} min` : ""}`;
    case "chapter":
      return `Chapter ${c.progress + 1}`;
    case "page":
      return c.progress > 0 ? `Pick up at page ${c.progress + 1}` : "Start at page 1";
    case "minute":
      return c.progress > 0 ? `${formatMinutes(c.progress)} in` : "Not started";
  }
}
