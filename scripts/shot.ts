// Usage: npx tsx scripts/shot.ts <baseUrl> <outDir> <path[,path...]> [cookie]
// Takes phone-size screenshots of each path in light and dark.
import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync } from "node:fs";

const [base, out, pathsArg, cookie] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
const chromiumDir = readdirSync(root).find((d) => d.startsWith("chromium-") && !d.includes("headless"));
const executablePath = chromiumDir ? `${root}/${chromiumDir}/chrome-linux/chrome` : undefined;

const browser = await chromium.launch({ executablePath });
for (const scheme of ["light", "dark"] as const) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  if (cookie) {
    const [name, ...v] = cookie.split("=");
    await ctx.addCookies([{ name, value: v.join("="), url: base }]);
  }
  const page = await ctx.newPage();
  for (const p of pathsArg.split(",")) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    const name = (p === "/" ? "home" : p.replace(/^\//, "").replace(/[\/?=&]/g, "-")) + `-${scheme}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: false });
    console.log(`${out}/${name}`);
  }
  await ctx.close();
}
await browser.close();
