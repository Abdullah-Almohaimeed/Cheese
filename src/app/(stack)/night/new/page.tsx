import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { z } from "zod";
import { CategoryTag } from "@/components/badges";
import { Cover } from "@/components/cover";
import { Icon } from "@/components/icons";
import { getGroup } from "@/lib/friends";
import { lookupItem } from "@/lib/common";
import { totalMinutes } from "@/lib/length";
import { suggestOptions } from "@/lib/nights";
import { requireUser } from "@/lib/session";
import { NightForm } from "./night-form";

export const metadata = { title: "Plan a night" };

export default async function NewNightPage({ searchParams }: { searchParams: Promise<{ group?: string; item?: string }> }) {
  const { user, profile } = await requireUser();
  const sp = await searchParams;
  if (!z.uuid().safeParse(sp.group).success || !z.uuid().safeParse(sp.item).success) notFound();
  const [group, it] = await Promise.all([getGroup(user.id, sp.group as string), lookupItem(sp.item as string)]);
  if (!group || !it) notFound();

  // A sensible length and amount for each kind of thing.
  let units: number | null = null;
  let durationMin = 120;
  let unitLabel = "";
  switch (it.unit) {
    case "watch":
      durationMin = Math.ceil((totalMinutes(it) ?? 120) / 5) * 5;
      units = 1;
      break;
    case "episode":
      units = 2;
      unitLabel = "Episodes";
      durationMin = Math.ceil(((it.unitSeconds ?? 1440) * 2) / 60 / 5) * 5;
      break;
    case "chapter":
      units = 3;
      unitLabel = "Chapters";
      durationMin = 30;
      break;
    case "page":
      durationMin = 60;
      break;
    case "minute":
      durationMin = 120;
      break;
  }

  const starts = await suggestOptions(user.id, profile.timezone, durationMin);
  const rows = starts.map((d) => {
    const t = DateTime.fromJSDate(d, { zone: profile.timezone });
    return { day: t.toISODate() as string, start: t.toFormat("HH:mm") };
  });

  return (
    <>
      <header className="head">
        <h1 className="ch-title">Plan a night</h1>
        <Link href={`/friends/item/${it.id}?group=${group.id}`} className="iconbtn" aria-label="Back">
          <Icon name="back" />
        </Link>
      </header>

      <section>
        <div className="ch-list">
          <div className="ch-lrow" style={{ gridTemplateColumns: "auto 1fr" }}>
            <Cover src={it.coverUrl} title={it.title} />
            <div className="ch-lrow__body">
              <p className="ch-row-title">{it.title}</p>
              <CategoryTag category={it.category} />
              <p className="ch-lrow__meta">With {group.name} · {group.members.length} people</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <NightForm groupId={group.id} itemId={it.id} rows={rows} durationMin={durationMin} units={units} unitLabel={unitLabel} canSetUnits={it.unit === "episode" || it.unit === "chapter"} />
      </section>
    </>
  );
}
