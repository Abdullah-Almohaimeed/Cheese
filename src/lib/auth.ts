import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { ensureProfile } from "./profile";

/** Email and password sign-in exists only for local development and tests. Never in production. */
export const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

// A weak or missing secret in production would let anyone forge a login session.
if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be a random string of at least 32 characters in production.");
}

export const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: devLoginEnabled, autoSignIn: true, minPasswordLength: 8 },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          // Offline access gives us a refresh token if the person later connects their calendar.
          accessType: "offline",
          prompt: "select_account",
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureProfile({ id: user.id, name: user.name, email: user.email });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
