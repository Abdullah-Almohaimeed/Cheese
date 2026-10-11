// Pure rules for progress, status and display. No database access here, so client components can import it.
import type { Status, Unit } from "@/db/schema";
import { formatMinutes, remainingMinutes, type Sized } from "./length";

export type EntryState = {
  status: Status;
  progress: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  lastProgressAt: Date | null;
};

/** How much one tap on the progress button adds, per unit. */
export const STEP: Record<Unit, number> = { watch: 1, episode: 1, chapter: 1, page: 10, minute: 30 };

export function stepLabel(unit: Unit): string {
  switch (unit) {
    case "watch":
      return "Watched";
    case "episode":
      return "+1 ep";
    case "chapter":
      return "+1 ch";
    case "page":
      return "+10 pages";
    case "minute":
      return "+30 min";
  }
}

/** The state after progress changes to `next`. `total` is the length in units, or null when unknown. */
export function withProgress(state: EntryState, total: number | null, next: number, now = new Date()): EntryState {
  let progress = Math.max(0, Math.round(next));
  if (total != null) progress = Math.min(progress, total);
  let { status, startedAt, finishedAt } = state;

  if (total != null && total > 0 && progress >= total) {
    status = "done";
    startedAt = startedAt ?? now;
    finishedAt = finishedAt ?? now;
  } else {
    if (status === "done") {
      status = progress > 0 ? "in_progress" : "want";
      finishedAt = null;
    } else if (progress > 0 && (status === "want" || status === "paused" || status === "dropped")) {
      status = "in_progress";
    }
    if (progress > 0) startedAt = startedAt ?? now;
  }
  return {
    status,
    progress,
    startedAt,
    finishedAt,
    lastProgressAt: progress !== state.progress ? now : state.lastProgressAt,
  };
}

/** The state after the person picks a status by hand. */
export function withStatus(state: EntryState, total: number | null, status: Status, now = new Date()): EntryState {
  const next: EntryState = { ...state, status };
  switch (status) {
    case "done":
      next.progress = total ?? state.progress;
      next.startedAt = state.startedAt ?? now;
      next.finishedAt = state.finishedAt ?? now;
      next.lastProgressAt = now;
      break;
    case "in_progress":
      if (state.status === "done") {
        // Starting again after finishing: count from the beginning.
        next.progress = 0;
        next.startedAt = now;
      } else {
        next.startedAt = state.startedAt ?? now;
      }
      next.finishedAt = null;
      break;
    default:
      next.finishedAt = null;
  }
  return next;
}

export function describeProgress(
  it: Sized,
  progress: number,
  totalOverride?: number | null,
): { primary: string; secondary: string | null } {
  const total = totalOverride ?? it.totalUnits;
  const left = remainingMinutes(it, progress, totalOverride);
  const secondary = left != null && left > 0 ? `About ${formatMinutes(left)} left` : null;
  switch (it.unit) {
    case "watch":
      return { primary: progress >= 1 ? "Watched" : "Not watched yet", secondary: null };
    case "episode":
      return { primary: total != null ? `${progress} of ${total} episodes` : `${progress} episodes`, secondary };
    case "chapter":
      return { primary: total != null ? `${progress} of ${total} chapters` : `${progress} chapters`, secondary };
    case "page":
      return { primary: total != null ? `${progress} of ${total} pages` : `${progress} pages`, secondary };
    case "minute": {
      const played = formatMinutes(progress);
      return { primary: total != null ? `${played} of about ${formatMinutes(total)}` : `${played} played`, secondary };
    }
  }
}

/** Short progress line for tiles: "ep 8", "p.120", "14h". */
export function shortProgress(unit: Unit, progress: number): string {
  switch (unit) {
    case "watch":
      return progress >= 1 ? "Watched" : "";
    case "episode":
      return `ep ${progress}`;
    case "chapter":
      return `ch ${progress}`;
    case "page":
      return `p.${progress}`;
    case "minute":
      return formatMinutes(progress);
  }
}

export function percent(progress: number, total: number | null): number | null {
  if (total == null || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((progress / total) * 100)));
}

export function halfToStars(half: number | null | undefined): number | null {
  return half == null ? null : half / 2;
}
