import { describe, expect, it } from "vitest";
import { commonItems, groupMatch, pairMatch, samePlatform, type ListItem } from "@/lib/match";

const want = (itemId: string, ratingHalf: number | null = null): ListItem => ({ itemId, wants: true, ratingHalf });
const rated = (itemId: string, ratingHalf: number): ListItem => ({ itemId, wants: false, ratingHalf });

describe("pairMatch", () => {
  it("identical wish lists score high but never above 100", () => {
    const a = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((i) => want(i));
    const m = pairMatch(a, a)!;
    expect(m).toBeGreaterThan(70);
    expect(m).toBeLessThanOrEqual(100);
  });

  it("nothing in common is zero", () => {
    expect(pairMatch([want("1"), want("2")], [want("3"), want("4")])).toBe(0);
  });

  it("one shared item between two one-item lists is not a perfect match", () => {
    expect(pairMatch([want("1")], [want("1")])).toBe(25);
  });

  it("is symmetric", () => {
    const a = [want("1"), want("2"), want("3"), rated("9", 8), rated("8", 10)];
    const b = [want("2"), want("3"), want("4"), rated("9", 6), rated("8", 9)];
    expect(pairMatch(a, b)).toBe(pairMatch(b, a));
  });

  it("is null when neither person has a wish list or shared ratings", () => {
    expect(pairMatch([], [])).toBeNull();
    expect(pairMatch([rated("1", 8)], [rated("2", 8)])).toBeNull();
  });

  it("rating the same things alike raises the score; opposite ratings lower it", () => {
    const base = [want("1"), want("2"), want("3")];
    const same = pairMatch([...base, rated("a", 10), rated("b", 2)], [...base, rated("a", 10), rated("b", 2)])!;
    const opposite = pairMatch([...base, rated("a", 10), rated("b", 2)], [...base, rated("a", 2), rated("b", 10)])!;
    expect(same).toBeGreaterThan(opposite);
  });

  it("ratings alone count once there are at least two in common", () => {
    expect(pairMatch([rated("1", 8)], [rated("1", 8)])).toBeNull(); // only one in common
    expect(pairMatch([rated("1", 8), rated("2", 6)], [rated("1", 8), rated("2", 6)])).toBe(100);
  });
});

describe("groupMatch", () => {
  it("averages every pair", () => {
    const a = [want("1"), want("2")];
    const b = [want("1"), want("2")];
    const c = [want("9")];
    const ab = pairMatch(a, b)!;
    const ac = pairMatch(a, c)!;
    const bc = pairMatch(b, c)!;
    expect(groupMatch([a, b, c])).toBe(Math.round((ab + ac + bc) / 3));
  });
  it("is null for a group with nothing to compare", () => {
    expect(groupMatch([[], []])).toBeNull();
    expect(groupMatch([[want("1")]])).toBeNull();
  });
});

describe("commonItems", () => {
  const w = (userId: string, itemId: string, priority: "must" | "someday" = "someday", platform: string | null = null) => ({ userId, itemId, priority, platform });

  it("keeps items wanted by two or more, most wanted first", () => {
    const out = commonItems([w("a", "x"), w("b", "x"), w("c", "x"), w("a", "y"), w("b", "y"), w("a", "z")]);
    expect(out.map((c) => [c.itemId, c.count])).toEqual([["x", 3], ["y", 2]]);
    expect(out[0].userIds).toEqual(["a", "b", "c"]);
  });

  it("breaks ties by how many marked it must do", () => {
    const out = commonItems([w("a", "x"), w("b", "x"), w("a", "y", "must"), w("b", "y")]);
    expect(out.map((c) => c.itemId)).toEqual(["y", "x"]);
  });

  it("counts a person once per item", () => {
    expect(commonItems([w("a", "x"), w("a", "x")])).toEqual([]);
  });

  it("can ask for more people", () => {
    expect(commonItems([w("a", "x"), w("b", "x")], 3)).toEqual([]);
  });
});

describe("samePlatform", () => {
  it("ignores people who have not said", () => {
    expect(samePlatform([null, "PS5", null])).toBe(true);
    expect(samePlatform([null, null])).toBe(true);
    expect(samePlatform(["PS5", "PS5"])).toBe(true);
  });
  it("fails when two people named different platforms", () => {
    expect(samePlatform(["PS5", "PC"])).toBe(false);
  });
});
