import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CategoryTag, StatusBadge } from "@/components/badges";
import { Cover } from "@/components/cover";
import { Icon } from "@/components/icons";
import { getOwnEntry } from "@/lib/entries";
import { CATEGORY_LABEL, formatMinutes, totalMinutes } from "@/lib/length";
import { requireUser } from "@/lib/session";
import { ItemControls, RemoveButton, type ItemState } from "./item-controls";

export const metadata = { title: "Item" };

function lengthLine(it: { unit: string; totalUnits: number | null; unitSeconds: number | null }, override: number | null) {
  const total = override ?? it.totalUnits;
  if (total == null) return null;
  const mins = totalMinutes(it as Parameters<typeof totalMinutes>[0], override);
  switch (it.unit) {
    case "watch":
      return mins ? formatMinutes(mins) : null;
    case "episode":
      return `${total} episodes${it.unitSeconds ? ` · ${Math.round(it.unitSeconds / 60)} min each` : ""}`;
    case "chapter":
      return `${total} chapters`;
    case "page":
      return `${total} pages`;
    case "minute":
      return `About ${formatMinutes(total)} to finish`;
    default:
      return null;
  }
}

export default async function ItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rate?: string }> }) {
  const { user } = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const row = await getOwnEntry(user.id, id);
  if (!row) notFound();
  const { entry: e, item: it } = row;
  const { rate } = await searchParams;

  const state: ItemState = {
    entryId: e.id,
    status: e.status,
    progress: e.progress,
    totalOverride: e.totalOverride,
    ratingHalf: e.ratingHalf,
    review: e.review ?? "",
    priority: e.priority,
    together: e.together,
    hidden: e.hidden,
    wouldRedo: e.wouldRedo,
    platform: e.platform ?? "",
    isGame: it.category === "game",
    platforms: it.platforms,
    sized: { unit: it.unit, totalUnits: it.totalUnits, unitSeconds: it.unitSeconds },
    title: it.title,
    justFinished: rate === "1",
  };
  const length = lengthLine(it, e.totalOverride);
  const sub = [it.year, it.creator].filter(Boolean).join(" · ");

  return (
    <>
      <header className="head">
        <Link href="/library" className="iconbtn" aria-label="Back to library">
          <Icon name="back" />
        </Link>
        <span className="ch-caption">{CATEGORY_LABEL[it.category]}</span>
        <span style={{ width: "var(--size-tap)" }} />
      </header>

      <section style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end" }}>
        <div style={{ width: 104, flex: "none" }}>
          <Cover src={it.coverUrl} title={it.title} />
        </div>
        <div className="stack" style={{ gap: "var(--space-2)", paddingBottom: 4, minWidth: 0 }}>
          <h1 className="ch-title">{it.title}</h1>
          <div className="row">
            <CategoryTag category={it.category} />
          </div>
          {sub && <span className="ch-caption">{sub}</span>}
          {length && <span className="ch-caption">{length}</span>}
          <div className="row">
            <StatusBadge status={e.status} />
          </div>
        </div>
      </section>

      {it.summary && (
        <section>
          <p className="hint">{it.summary}</p>
        </section>
      )}

      <ItemControls initial={state} />
      <section>
        <Link className="ch-btn ch-btn--primary ch-btn--block" href={`/plan/book?entry=${e.id}`}>
          Book a time
        </Link>
      </section>
      <RemoveButton entryId={e.id} />
    </>
  );
}
