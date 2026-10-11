import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { ensureProfile } from "./profile";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Returns the signed-in user and profile, or sends the visitor to /login. Call this in every page and action. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await ensureProfile(session.user);
  return { user: session.user, profile };
}

/** Same as requireUser but returns null instead of redirecting. For route handlers and public pages. */
export async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  const profile = await ensureProfile(session.user);
  return { user: session.user, profile };
}
