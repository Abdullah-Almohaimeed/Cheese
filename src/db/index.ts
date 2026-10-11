import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __cheesePool: Pool | undefined;
  var __cheeseDb: ReturnType<typeof create> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  // Reuse the pool across hot reloads in development so connections do not pile up.
  const pool = globalThis.__cheesePool ?? new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
  if (process.env.NODE_ENV !== "production") globalThis.__cheesePool = pool;
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof create>;

function get(): Db {
  if (!globalThis.__cheeseDb || process.env.NODE_ENV === "production") globalThis.__cheeseDb ??= create();
  return globalThis.__cheeseDb as Db;
}

/** The database. The connection is opened on first use, so building the app does not need a database. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = get() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
