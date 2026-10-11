import { ProviderError } from "./types";

export async function fetchJson<T>(provider: string, url: string, init: RequestInit, signal: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal });
  } catch (e) {
    throw new ProviderError(provider, e instanceof Error ? e.message : "network error");
  }
  if (!res.ok) throw new ProviderError(provider, `HTTP ${res.status}`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ProviderError(provider, "response was not JSON");
  }
}

export function clip(text: string | null | undefined, max = 400): string | null {
  if (!text) return null;
  const t = text.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export function yearOf(date: string | null | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}
