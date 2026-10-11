import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resetDb } from "../helpers";
import { signIn } from "./helpers";

// Takes phone screenshots of each screen in light and dark. Only runs when SHOTS_DIR is set:
//   SHOTS_DIR=/tmp/shots npx playwright test screens
const dir = process.env.SHOTS_DIR;
test.skip(!dir, "set SHOTS_DIR to take screenshots");

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test("add", async ({ page }) => {
      mkdirSync(dir!, { recursive: true });
      await resetDb();
      await signIn(page, "Yousef");
      await page.goto("/add");
      await page.getByRole("searchbox", { name: "Search everything" }).fill("dune");
      await page.getByRole("button", { name: "Add Dune (Movie)" }).waitFor();
      await page.getByRole("button", { name: "Add Dune (Movie)" }).click();
      await page.getByRole("link", { name: "Open Dune" }).waitFor();
      await page.screenshot({ path: `${dir}/add-${scheme}.png` });
    });
  });
}
