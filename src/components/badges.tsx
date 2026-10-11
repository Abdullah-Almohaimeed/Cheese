import type { Category, Status } from "@/db/schema";
import { CATEGORY_LABEL } from "@/lib/length";
import { Icon, type IconName } from "./icons";

export function CategoryTag({ category }: { category: Category }) {
  return <span className={`ch-tag ch-tag--${category}`}>{CATEGORY_LABEL[category]}</span>;
}

export const STATUS_LABEL: Record<Status, string> = {
  want: "Want to",
  in_progress: "In progress",
  paused: "Paused",
  done: "Done",
  dropped: "Dropped",
};

const STATUS_ICON: Record<Status, IconName> = {
  want: "bookmark",
  in_progress: "play",
  paused: "pause",
  done: "check",
  dropped: "x",
};

const STATUS_CLASS: Record<Status, string> = {
  want: "want",
  in_progress: "progress",
  paused: "paused",
  done: "done",
  dropped: "dropped",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`ch-status ch-status--${STATUS_CLASS[status]}`}>
      <Icon name={STATUS_ICON[status]} small />
      {STATUS_LABEL[status]}
    </span>
  );
}
