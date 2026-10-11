/** Only allow same-site relative paths as post-login redirects. */
export function safeNext(value: string | undefined | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
