import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";

const PORT = 3101;
const DB = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/cheese_test";
process.env.DATABASE_URL = DB; // the test process talks to the same database as the server

const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
const dir = existsSync(root) ? readdirSync(root).find((d) => d.startsWith("chromium-") && !d.includes("headless")) : undefined;
const executablePath = dir ? `${root}/${dir}/chrome-linux/chrome` : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath },
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: DB,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123",
      ENABLE_DEV_LOGIN: "1",
      // The search APIs are answered by scripts/mock-apis.mjs, so these keys only need to exist.
      TMDB_API_KEY: "mock",
      TWITCH_CLIENT_ID: "mock",
      TWITCH_CLIENT_SECRET: "mock",
      NODE_OPTIONS: "--import ./scripts/mock-apis.mjs",
    },
  },
});
