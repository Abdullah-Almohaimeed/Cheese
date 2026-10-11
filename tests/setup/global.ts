import { execSync } from "node:child_process";

// Applies migrations to the test database once before the suite runs.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/cheese_test";
  execSync("npx tsx scripts/migrate.ts", { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
}
