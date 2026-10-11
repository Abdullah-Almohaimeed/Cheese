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

      // Friends: a group of five who share some things.
      const { makeUser } = await import("../helpers");
      const { createGroup, respondToRequest, sendFriendRequest } = await import("@/lib/friends");
      const { addEntry, upsertItem } = await import("@/lib/library");
      const { entry } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const friends = [] as { id: string; name: string; profile: { username: string } }[];
      for (const n of ["Sara", "Omar", "Lina", "Khalid"]) {
        const u = await makeUser(n);
        await sendFriendRequest(me, u.profile.username);
        await respondToRequest(u.id, me, true);
        friends.push(u);
      }
      await seedDemo(friends[0].id);
      await seedDemo(friends[1].id);
      for (const u of friends.slice(2)) {
        for (const ext of ["movie/157336", "movie/976893"]) {
          const it = (await db.query.item.findFirst({ where: (t, { eq: e }) => e(t.externalId, ext) }))!;
          const { entry: en } = await addEntry(u.id, it.id);
          await db.update(entry).set({ together: true }).where(eq(entry.id, en.id));
        }
      }
      await upsertItem; // keep the import used
      const g = await createGroup(me, "Movie nights", friends.map((f) => f.id));
      if (!g.ok) throw new Error(g.error);
      await page.goto(`/friends?group=${g.id}`);
      await shot(page, "friends", scheme);
      await page.goto("/friends/people");
      await shot(page, "friends-people", scheme);
      await page.goto("/friends/add");
      await shot(page, "friends-add", scheme);
      await page.goto(`/friends/u/${friends[0].profile.username}`);
      await shot(page, "friend-profile", scheme, true);
      const prophecy = (await db.query.item.findFirst({ where: (t, { eq: e }) => e(t.externalId, "tv/157741") }))!;
      await page.goto(`/friends/item/${prophecy.id}?group=${g.id}`);
      await shot(page, "friend-item", scheme);
      await page.goto("/settings");
      await shot(page, "settings", scheme);

      // Nights: propose, collect some votes, then lock a time.
      const { createNight, lockIn, nightForMember, toggleVote } = await import("@/lib/nights");
      const inter = (await db.query.item.findFirst({ where: (t, { eq: e }) => e(t.externalId, "movie/157336") }))!;
      await page.goto(`/night/new?group=${g.id}&item=${inter.id}`);
      await shot(page, "night-new", scheme);
      const t1 = new Date(`${DateTime.now().plus({ days: 4 }).toISODate()}T18:00:00Z`);
      const t2 = new Date(`${DateTime.now().plus({ days: 5 }).toISODate()}T16:30:00Z`);
      const t3 = new Date(`${DateTime.now().plus({ days: 6 }).toISODate()}T18:00:00Z`);
      const made = await createNight(me, { groupId: g.id, itemId: inter.id, options: [t1, t2, t3].map((startsAt) => ({ startsAt, durationMin: 170 })) });
      if (!made.ok) throw new Error(made.error);
      const nv = (await nightForMember(me, made.id))!;
      await toggleVote({ nightId: made.id, userId: friends[0].id }, nv.options[0].id);
      await toggleVote({ nightId: made.id, userId: friends[1].id }, nv.options[0].id);
      await toggleVote({ nightId: made.id, userId: friends[0].id }, nv.options[1].id);
      await page.goto(`/night/${made.id}`);
      await shot(page, "night-voting", scheme, true);
      await page.goto(`/n/${nv.night.publicToken}`);
      await shot(page, "night-public", scheme);
      await lockIn(me, made.id, nv.options[0].id);
      await page.goto(`/night/${made.id}`);
      await shot(page, "night-set", scheme, true);

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
