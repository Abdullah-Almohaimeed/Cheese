import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureProfile } from "@/lib/profile";
import { user } from "@/db/schema";

/** Empties every table. Call in beforeEach of DB tests. */
export async function resetDb() {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public' and tablename not like '\_\_drizzle%'`,
  );
  const names = rows.rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
}

let counter = 0;

/** Inserts a user and profile directly, without going through the auth API. */
export async function makeUser(name: string) {
  counter += 1;
  const id = `u_${name.toLowerCase()}_${counter}`;
  const email = `${name.toLowerCase()}${counter}@example.com`;
  await db.insert(user).values({ id, name, email, emailVerified: true });
  const profile = await ensureProfile({ id, name, email });
  return { id, name, email, profile };
}
