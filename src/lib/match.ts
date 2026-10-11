// Pure rules for finding what a group has in common and how alike two people's tastes are.

export type ListItem = {
  itemId: string;
  /** This person wants to do it with friends (open to doing it together, not hidden). */
  wants: boolean;
  /** Their rating in half stars, 1 to 10, or null. */
  ratingHalf: number | null;
};

/** Smoothing so that two people who each added one thing and share it do not read as a perfect match. */
const SMOOTHING = 3;
const MIN_RATED_IN_COMMON = 2;

/**
 * How alike two people are, from 0 to 100, or null when there is nothing to compare.
 * It blends how much their wish lists overlap with how closely they rate the things they both rated.
 */
export function pairMatch(a: ListItem[], b: ListItem[]): number | null {
  const aWants = new Set(a.filter((i) => i.wants).map((i) => i.itemId));
  const bWants = new Set(b.filter((i) => i.wants).map((i) => i.itemId));
  const smaller = Math.min(aWants.size, bWants.size);

  let shared = 0;
  for (const id of aWants) if (bWants.has(id)) shared++;
  const overlap = smaller === 0 ? null : shared / (smaller + SMOOTHING);

  const bRatings = new Map(b.filter((i) => i.ratingHalf != null).map((i) => [i.itemId, i.ratingHalf as number]));
  const diffs: number[] = [];
  for (const i of a) {
    const rb = bRatings.get(i.itemId);
    if (i.ratingHalf != null && rb != null) diffs.push(Math.abs(i.ratingHalf - rb));
  }
  const agreement = diffs.length >= MIN_RATED_IN_COMMON ? 1 - diffs.reduce((n, d) => n + d, 0) / diffs.length / 9 : null;

  if (overlap == null && agreement == null) return null;
  const score = overlap == null ? (agreement as number) : agreement == null ? overlap : 0.6 * overlap + 0.4 * agreement;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

/** Average match across every pair in a group. Null when no pair has anything to compare. */
export function groupMatch(lists: ListItem[][]): number | null {
  const scores: number[] = [];
  for (let i = 0; i < lists.length; i++) {
    for (let j = i + 1; j < lists.length; j++) {
      const m = pairMatch(lists[i], lists[j]);
      if (m != null) scores.push(m);
    }
  }
  if (!scores.length) return null;
  return Math.round(scores.reduce((n, s) => n + s, 0) / scores.length);
}

export type Want = { userId: string; itemId: string; priority: "must" | "someday"; platform: string | null };

export type Common = { itemId: string; userIds: string[]; count: number; mustCount: number; platforms: (string | null)[] };

/** Items that at least two people want. Most wanted first, then the ones marked must do. */
export function commonItems(wants: Want[], minPeople = 2): Common[] {
  const byItem = new Map<string, Want[]>();
  for (const w of wants) {
    const list = byItem.get(w.itemId) ?? [];
    if (!list.some((x) => x.userId === w.userId)) list.push(w);
    byItem.set(w.itemId, list);
  }
  const out: Common[] = [];
  for (const [itemId, list] of byItem) {
    if (list.length < minPeople) continue;
    out.push({
      itemId,
      userIds: list.map((w) => w.userId),
      count: list.length,
      mustCount: list.filter((w) => w.priority === "must").length,
      platforms: list.map((w) => w.platform),
    });
  }
  return out.sort((a, b) => b.count - a.count || b.mustCount - a.mustCount || a.itemId.localeCompare(b.itemId));
}

/** True when everyone who named a platform named the same one. People who have not said are not in the way. */
export function samePlatform(platforms: (string | null)[]): boolean {
  return new Set(platforms.filter((p): p is string => Boolean(p))).size <= 1;
}
