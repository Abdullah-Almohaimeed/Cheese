import { describe, expect, it } from "vitest";
import { chunkFor, fitSuggestions, nextUpText, pickForMe, type Candidate } from "@/lib/suggest";
import { hoursLabel, weekBounds } from "@/lib/time";

const NOW = new Date("2026-10-11T18:00:00Z");

function cand(over: Partial<Candidate> & Pick<Candidate, "title" | "unit">): Candidate {
  return {
    entryId: over.title, itemId: over.title, category: "anime", coverUrl: null, status: "want", priority: "someday",
    progress: 0, totalUnits: null, unitSeconds: null, lastProgressAt: null, ...over,
  };
}

const frieren = cand({ title: "Frieren", unit: "episode", category: "anime", totalUnits: 28, unitSeconds: 1440, status: "in_progress", progress: 7, lastProgressAt: new Date("2026-10-10T18:00:00Z") });
const dune = cand({ title: "Dune", unit: "page", category: "book", totalUnits: 604, status: "in_progress", progress: 120, lastProgressAt: new Date("2026-10-01T18:00:00Z") });
const elden = cand({ title: "Elden Ring", unit: "minute", category: "game", totalUnits: 3300, unitSeconds: 60, status: "in_progress", progress: 840, lastProgressAt: new Date("2026-09-20T18:00:00Z") });
const interstellar = cand({ title: "Interstellar", unit: "watch", category: "movie", totalUnits: 1, unitSeconds: 169 * 60, priority: "must" });
const berserk = cand({ title: "Berserk", unit: "chapter", category: "manga", totalUnits: 364 });

describe("chunkFor", () => {
  it("episodes: as many as fit, up to a cap", () => {
    expect(chunkFor(frieren, 90)).toEqual({ units: 3, minutes: 72, label: "3 episodes" });
    expect(chunkFor(frieren, 30)).toEqual({ units: 1, minutes: 24, label: "1 episode" });
    expect(chunkFor(frieren, 20)).toBeNull();
    expect(chunkFor(frieren, 600)?.units).toBe(6);
  });
  it("episodes: never more than what is left", () => {
    expect(chunkFor({ ...frieren, progress: 27 }, 120)?.units).toBe(1);
  });
  it("movies fit only when the whole movie fits", () => {
    expect(chunkFor(interstellar, 120)).toBeNull();
    expect(chunkFor(interstellar, 180)).toEqual({ units: 1, minutes: 169, label: "The whole movie" });
  });
  it("books: pages at 90 seconds each, rounded to fives", () => {
    expect(chunkFor(dune, 90)).toEqual({ units: 60, minutes: 90, label: "About 60 pages" });
    expect(chunkFor(dune, 10)).toBeNull();
  });
  it("games need a real slot and are capped", () => {
    expect(chunkFor(elden, 20)).toBeNull();
    expect(chunkFor(elden, 100)).toEqual({ units: 90, minutes: 90, label: "A 1h 30m session" });
    expect(chunkFor(elden, 600)?.minutes).toBe(180);
  });
  it("manga chapters, with the default eight minutes each", () => {
    expect(chunkFor(berserk, 40)).toEqual({ units: 5, minutes: 40, label: "5 chapters" });
  });
  it("done and dropped never come up", () => {
    expect(chunkFor({ ...frieren, status: "done" }, 90)).toBeNull();
    expect(chunkFor({ ...frieren, status: "dropped" }, 90)).toBeNull();
  });
  it("a book with 5 pages left can still be suggested", () => {
    expect(chunkFor({ ...dune, progress: 599 }, 60)?.units).toBe(5);
  });
});

describe("fitSuggestions", () => {
  const all = [frieren, dune, elden, interstellar, berserk];

  it("puts what you are in the middle of first, spread across categories", () => {
    const out = fitSuggestions(all, 90, { now: NOW });
    expect(out.map((s) => s.title)).toEqual(["Frieren", "Dune", "Elden Ring"]);
  });

  it("finds nothing for a very short slot", () => {
    expect(fitSuggestions([interstellar, elden], 15, { now: NOW })).toEqual([]);
  });

  it("with a long evening, a must-do movie competes with in-progress items", () => {
    const out = fitSuggestions(all, 200, { now: NOW, limit: 5 });
    expect(out.map((s) => s.title)).toContain("Interstellar");
    expect(out.length).toBe(5);
  });

  it("says when it would finish something", () => {
    const nearlyDone = { ...frieren, progress: 26 };
    const [s] = fitSuggestions([nearlyDone], 90, { now: NOW });
    expect(s.reason).toBe("Finishes it");
    expect(s.chunk.units).toBe(2);
  });

  it("does not suggest the same category three times when others exist", () => {
    const manyAnime = [frieren, { ...frieren, entryId: "b", title: "B" }, { ...frieren, entryId: "c", title: "C" }, dune];
    const out = fitSuggestions(manyAnime, 90, { now: NOW });
    expect(new Set(out.map((s) => s.category)).size).toBe(2);
  });

  it("fills with the same category when nothing else fits", () => {
    const out = fitSuggestions([frieren, { ...frieren, entryId: "b", title: "B" }], 90, { now: NOW });
    expect(out).toHaveLength(2);
  });
});

describe("pickForMe", () => {
  const pool = [frieren, dune, interstellar];

  it("is a weighted draw from eligible items", () => {
    expect(pickForMe(pool, { rand: () => 0, now: NOW })?.title).toBe("Frieren");
    expect(pickForMe(pool, { rand: () => 0.999, now: NOW })?.title).toBe("Interstellar");
  });
  it("respects the category filter", () => {
    expect(pickForMe(pool, { category: "book", rand: () => 0.5, now: NOW })?.title).toBe("Dune");
  });
  it("can exclude the last pick so Pick again changes", () => {
    for (const r of [0, 0.3, 0.6, 0.99]) expect(pickForMe(pool, { exclude: "Frieren", rand: () => r, now: NOW })?.title).not.toBe("Frieren");
  });
  it("only offers what fits when a time limit is set", () => {
    const out = pickForMe([interstellar, frieren], { fitMinutes: 60, rand: () => 0.5, now: NOW });
    expect(out?.title).toBe("Frieren");
  });
  it("returns null when nothing is eligible", () => {
    expect(pickForMe([{ ...frieren, status: "done" }], { now: NOW })).toBeNull();
    expect(pickForMe([], { now: NOW })).toBeNull();
  });
  it("can still pick a movie when no limit is set", () => {
    expect(pickForMe([interstellar], { rand: () => 0.5, now: NOW })?.chunk.minutes).toBe(169);
  });
});

describe("nextUpText", () => {
  it("describes the next bit per unit", () => {
    expect(nextUpText(frieren)).toBe("Episode 8 · 24 min");
    expect(nextUpText(dune)).toBe("Pick up at page 121");
    expect(nextUpText(elden)).toBe("14h in");
    expect(nextUpText(interstellar)).toBe("2h 49m");
    expect(nextUpText(berserk)).toBe("Chapter 1");
  });
});

describe("weekBounds", () => {
  it("starts the week on Sunday in the person's timezone", () => {
    // Sunday 11 Oct 2026 20:00 in Riyadh (UTC+3) is 17:00 UTC.
    const { start, end } = weekBounds(new Date("2026-10-11T17:00:00Z"), "Asia/Riyadh", 0);
    expect(start.toISOString()).toBe("2026-10-10T21:00:00.000Z"); // Sunday 00:00 in Riyadh
    expect(end.toISOString()).toBe("2026-10-17T21:00:00.000Z");
  });
  it("a Saturday evening still belongs to the week that started the Sunday before", () => {
    const { start } = weekBounds(new Date("2026-10-17T10:00:00Z"), "UTC", 0);
    expect(start.toISOString()).toBe("2026-10-11T00:00:00.000Z");
  });
  it("handles a timezone where the local day differs from UTC", () => {
    // 23:30 UTC on Saturday is already Sunday in Riyadh, so a new week has begun there.
    const { start } = weekBounds(new Date("2026-10-17T23:30:00Z"), "Asia/Riyadh", 0);
    expect(start.toISOString()).toBe("2026-10-17T21:00:00.000Z");
  });
  it("supports a Monday week start", () => {
    const { start } = weekBounds(new Date("2026-10-11T12:00:00Z"), "UTC", 1);
    expect(start.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
});

describe("hoursLabel", () => {
  it("shows hours with at most one decimal", () => {
    expect(hoursLabel(240)).toBe("4");
    expect(hoursLabel(270)).toBe("4.5");
    expect(hoursLabel(0)).toBe("0");
    expect(hoursLabel(-5)).toBe("0");
  });
});
