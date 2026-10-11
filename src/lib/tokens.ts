import { randomBytes } from "node:crypto";

/** URL-safe random string. 18 bytes gives 144 bits, enough for unguessable links. */
export function randomToken(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

/** Shorter code that is easy to type, for friend invite links. */
export function inviteCode(): string {
  return randomBytes(6).toString("base64url").replace(/[-_]/g, "x").toLowerCase();
}
