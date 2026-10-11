import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { entry, item, type Priority, type Status } from "@/db/schema";
import { withProgress, withStatus, type EntryState } from "./progress";

/* ---------- Database operations. Every one is scoped to the signed-in user. ---------- */

export async function getOwnEntry(userId: string, entryId: string) {
  const rows = await db
    .select({ entry, item })
    .from(entry)
    .innerJoin(item, eq(entry.itemId, item.id))
    .where(and(eq(entry.id, entryId), eq(entry.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function stateOf(e: typeof entry.$inferSelect): EntryState {
  return { status: e.status, progress: e.progress, startedAt: e.startedAt, finishedAt: e.finishedAt, lastProgressAt: e.lastProgressAt };
}

export async function changeProgress(userId: string, entryId: string, mode: { add: number } | { set: number }) {
  const row = await getOwnEntry(userId, entryId);
  if (!row) return null;
  const total = row.entry.totalOverride ?? row.item.totalUnits;
  const target = "add" in mode ? row.entry.progress + mode.add : mode.set;
  const next = withProgress(stateOf(row.entry), total, target);
  const [updated] = await db.update(entry).set({ ...next, updatedAt: new Date() }).where(eq(entry.id, entryId)).returning();
  return { entry: updated, finishedNow: next.status === "done" && row.entry.status !== "done" };
}

export async function changeStatus(userId: string, entryId: string, status: Status) {
  const row = await getOwnEntry(userId, entryId);
  if (!row) return null;
  const total = row.entry.totalOverride ?? row.item.totalUnits;
  const next = withStatus(stateOf(row.entry), total, status);
  const [updated] = await db.update(entry).set({ ...next, updatedAt: new Date() }).where(eq(entry.id, entryId)).returning();
  return { entry: updated, finishedNow: status === "done" && row.entry.status !== "done" };
}

export type EntryPatch = Partial<{
  priority: Priority;
  together: boolean;
  hidden: boolean;
  wouldRedo: boolean;
  platform: string | null;
  totalOverride: number | null;
  ratingHalf: number | null;
  review: string | null;
}>;

export async function patchEntry(userId: string, entryId: string, patch: EntryPatch) {
  const [updated] = await db
    .update(entry)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(entry.id, entryId), eq(entry.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function removeEntry(userId: string, entryId: string) {
  const res = await db.delete(entry).where(and(eq(entry.id, entryId), eq(entry.userId, userId))).returning({ id: entry.id });
  return res.length > 0;
}

