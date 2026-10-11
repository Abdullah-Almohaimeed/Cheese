import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { entry, item, type Category, type Status } from "@/db/schema";
import { DEFAULT_UNIT_SECONDS, UNIT_FOR_CATEGORY } from "./length";
import type { ItemDraft, Ref } from "./providers/types";
import { fetchDetails } from "./providers";

export const hitKey = (h: { source: string; externalId: string | null }) => `${h.source}:${h.externalId}`;

/** Inserts the item, or refreshes the stored copy when the same source id already exists. */
export async function upsertItem(draft: ItemDraft, createdBy: string | null = null) {
  const values = {
    category: draft.category,
    source: draft.source,
    externalId: draft.externalId,
    title: draft.title,
    creator: draft.creator,
    year: draft.year,
    coverUrl: draft.coverUrl,
    summary: draft.summary,
    unit: draft.unit,
    totalUnits: draft.totalUnits,
    unitSeconds: draft.unitSeconds,
    genres: draft.genres,
    platforms: draft.platforms,
    createdBy,
  };
  if (draft.externalId === null) {
    const [row] = await db.insert(item).values(values).returning();
    return row;
  }
  const [row] = await db
    .insert(item)
    .values(values)
    .onConflictDoUpdate({
      target: [item.source, item.externalId],
      targetWhere: sql`${item.externalId} is not null`,
      set: {
        title: values.title,
        creator: values.creator,
        year: values.year,
        coverUrl: values.coverUrl,
        summary: values.summary,
        totalUnits: values.totalUnits,
        unitSeconds: values.unitSeconds,
        genres: values.genres,
        platforms: values.platforms,
      },
    })
    .returning();
  return row;
}

/** Puts an item in someone's library as "Want to". Does nothing if it is already there. */
export async function addEntry(userId: string, itemId: string) {
  const [created] = await db.insert(entry).values({ userId, itemId }).onConflictDoNothing().returning();
  if (created) return { entry: created, created: true };
  const existing = await db.query.entry.findFirst({ where: and(eq(entry.userId, userId), eq(entry.itemId, itemId)) });
  return { entry: existing!, created: false };
}

/** Looks the item up at its source, stores it, and adds it to the library. The browser only sends a reference. */
export async function addFromRef(userId: string, ref: Ref) {
  const draft = await fetchDetails(ref);
  const row = await upsertItem(draft);
  const { entry: e, created } = await addEntry(userId, row.id);
  return { entryId: e.id, itemId: row.id, created };
}

export type ManualInput = {
  category: Category;
  title: string;
  creator?: string | null;
  /** Episodes, chapters or pages. Not used for movies and games. */
  count?: number | null;
  /** Movies: runtime in minutes. Series and anime: minutes per episode. */
  minutes?: number | null;
  /** Games: hours to finish the main story. */
  hours?: number | null;
};

export function manualDraft(input: ManualInput): ItemDraft {
  const unit = UNIT_FOR_CATEGORY[input.category];
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new Error("Title is required");
  const positive = (n: number | null | undefined) => (n && Number.isFinite(n) && n > 0 ? Math.round(n) : null);
  const minutes = positive(input.minutes);
  let totalUnits: number | null = null;
  let unitSeconds: number | null = null;
  switch (input.category) {
    case "movie":
      totalUnits = 1;
      unitSeconds = minutes ? minutes * 60 : DEFAULT_UNIT_SECONDS.watch;
      break;
    case "series":
    case "anime":
      totalUnits = positive(input.count);
      unitSeconds = minutes ? minutes * 60 : null;
      break;
    case "manga":
    case "book":
      totalUnits = positive(input.count);
      break;
    case "game": {
      const hours = positive(input.hours);
      totalUnits = hours ? hours * 60 : null; // games are counted in minutes
      unitSeconds = 60;
      break;
    }
  }
  return {
    category: input.category,
    source: "manual",
    externalId: null,
    title,
    creator: input.creator?.trim().slice(0, 120) || null,
    year: null,
    coverUrl: null,
    summary: null,
    unit,
    totalUnits,
    unitSeconds,
    genres: [],
    platforms: [],
  };
}

export async function addManual(userId: string, input: ManualInput) {
  const row = await upsertItem(manualDraft(input), userId);
  const { entry: e } = await addEntry(userId, row.id);
  return { entryId: e.id, itemId: row.id };
}

/** For search results: which hits are already in this person's library, and with what status. */
export async function libraryStatuses(userId: string, hits: ItemDraft[]): Promise<Record<string, { entryId: string; status: Status }>> {
  const withIds = hits.filter((h) => h.externalId !== null);
  if (!withIds.length) return {};
  const rows = await db
    .select({ source: item.source, externalId: item.externalId, entryId: entry.id, status: entry.status })
    .from(entry)
    .innerJoin(item, eq(entry.itemId, item.id))
    .where(and(eq(entry.userId, userId), inArray(item.externalId, withIds.map((h) => h.externalId as string))));
  const out: Record<string, { entryId: string; status: Status }> = {};
  for (const r of rows) out[hitKey(r)] = { entryId: r.entryId, status: r.status };
  return out;
}
