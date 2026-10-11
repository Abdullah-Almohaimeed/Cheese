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
    test.use({ colorScheme: scheme, timezoneId: "Asia/Riyadh" });

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

      // Plan: usual evenings free, a booked session, and a gap to fill, three days ahead.
      const { DateTime } = await import("luxon");
      const { db } = await import("@/db");
      const { freeWindow, planSession } = await import("@/db/schema");
      const day = DateTime.now().plus({ days: 3 }).toISODate() as string;
      await db.insert(freeWindow).values(Array.from({ length: 7 }, (_, weekday) => ({ userId: me, weekday, startMin: 19 * 60, endMin: 23 * 60 })));
      await db.insert(planSession).values([
        { userId: me, itemId: seeded["Frieren"].itemId, title: "Frieren · 2 episodes", category: "anime", startsAt: new Date(`${day}T16:30:00Z`), durationMin: 48, units: 2 },
        { userId: me, itemId: seeded["Elden Ring"].itemId, title: "Elden Ring", category: "game", startsAt: new Date(`${day}T18:30:00Z`), durationMin: 90, units: 90 },
      ]);
      await page.goto(`/plan?day=${day}`);
      await shot(page, "plan", scheme);
      await page.goto("/plan/setup");
      await shot(page, "plan-setup", scheme, true);
      await page.goto(`/plan/book?day=${day}&start=19:00&gap=90`);
      await shot(page, "plan-book", scheme);

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
