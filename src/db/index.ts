import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __cheesePool: Pool | undefined;
}

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  return new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
}

// Reuse the pool across hot reloads in development so connections do not pile up.
const pool = globalThis.__cheesePool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__cheesePool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
