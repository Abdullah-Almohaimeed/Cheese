// Renders the app icon to the PNG sizes phones need. Run: npx tsx scripts/make-icons.ts
import { chromium } from "@playwright/test";
import { existsSync, readdirSync, writeFileSync } from "node:fs";

const CORAL = "#ff5a36";
const INK = "#1b1c20";

/** A flat cheese wedge. `scale` shrinks the artwork toward the centre for maskable icons. */
function svg(size: number, opts: { rounded: boolean; scale: number }) {
  const s = opts.scale;
  const t = `translate(${256 - 256 * s} ${256 - 256 * s - 23 * s}) scale(${s})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" ${opts.rounded ? 'rx="112"' : ""} fill="${CORAL}"/>
  <g transform="${t}">
    <path d="M92 352 L420 190 Q436 182 436 200 V352 Q436 368 420 368 H108 Q92 368 92 352 Z" fill="${INK}"/>
    <circle cx="214" cy="326" r="20" fill="${CORAL}"/>
    <circle cx="300" cy="290" r="14" fill="${CORAL}"/>
    <circle cx="372" cy="324" r="22" fill="${CORAL}"/>
    <circle cx="352" cy="252" r="9" fill="${CORAL}"/>
  </g>
</svg>`;
}

const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
const dir = existsSync(root) ? readdirSync(root).find((d) => d.startsWith("chromium-") && !d.includes("headless")) : undefined;
const browser = await chromium.launch({ executablePath: dir ? `${root}/${dir}/chrome-linux/chrome` : undefined });

async function render(file: string, size: number, opts: { rounded: boolean; scale: number }) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, opts)}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log("wrote", file);
}

await render("public/icons/icon-192.png", 192, { rounded: true, scale: 1 });
await render("public/icons/icon-512.png", 512, { rounded: true, scale: 1 });
await render("public/icons/icon-maskable-512.png", 512, { rounded: false, scale: 0.78 });
await render("src/app/apple-icon.png", 180, { rounded: false, scale: 0.9 });
writeFileSync("src/app/icon.svg", svg(512, { rounded: true, scale: 1 }));
await browser.close();
