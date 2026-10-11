import type { Page } from "@playwright/test";

/** Creates (or signs into) a development account through the real login form. */
export async function signIn(page: Page, name: string) {
  const email = `${name.toLowerCase()}@example.com`;
  await page.goto("/login");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "correct horse battery");
  await page.getByRole("button", { name: "Sign in or create account" }).click();
  await page.waitForURL("/");
}
