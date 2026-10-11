import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/cheese_test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      BETTER_AUTH_URL: "http://localhost:3999",
      ENABLE_DEV_LOGIN: "1",
    },
  },
});
