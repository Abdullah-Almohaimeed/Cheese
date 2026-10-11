import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resetDb } from "../helpers";
import { seedDemo, userIdByName } from "../seed";
import { signIn } from "./helpers";

// Takes phone screenshots of each screen in light and dark. Only runs when SHOTS_DIR is set:
//   SHOTS_DIR=/tmp/shots npx playwright test screens
const dir = process.env.SHOTS_DIR;
test.skip(!dir, "set SHOTS_DIR to take screenshots");

async function shot(page: Page, name: string, scheme: string, fullPage = false) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${dir}/${name}-${scheme}.png`, fullPage });
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test("screens", async ({ page }) => {
      mkdirSync(dir!, { recursive: true });
      await resetDb();
      await signIn(page, "Yousef");
      const me = await userIdByName("Yousef");
      const seeded = await seedDemo(me);

      await page.goto("/add");
      await page.getByRole("searchbox", { name: "Search everything" }).fill("dune");
      await page.getByRole("button", { name: "Add Dune (Movie)" }).waitFor();
      await shot(page, "add", scheme);

      await page.goto("/");
      await shot(page, "home", scheme);
      await page.goto("/fit?minutes=90");
      await shot(page, "fit", scheme);
      await page.goto("/pick?category=movie");
      await shot(page, "pick", scheme);

      await page.goto("/library");
      await shot(page, "library", scheme);
      await page.goto("/library?status=in_progress");
      await shot(page, "library-progress", scheme);

      await page.goto(`/item/${seeded["Frieren"].id}`);
      await shot(page, "item", scheme, true);
      await page.goto(`/item/${seeded["Spirited Away"].id}`);
      await shot(page, "item-done", scheme, true);
    });
  });
}
