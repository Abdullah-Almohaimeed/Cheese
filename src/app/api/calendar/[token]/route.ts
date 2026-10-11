import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { buildCalendar } from "@/lib/ics";
import { sessionsForFeed } from "@/lib/sessions";

export const dynamic = "force-dynamic";

/** A private calendar feed. The long random token in the address is the only credential. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const raw = (await params).token;
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
  const p = token ? await db.query.profile.findFirst({ where: eq(profile.icsToken, token) }) : null;
  if (!p) return new Response("Not found", { status: 404 });

  const sessions = await sessionsForFeed(p.userId);
  const body = buildCalendar(
    "Cheese",
    sessions.map((s) => ({
      uid: `${s.id}@cheese`,
      start: s.startsAt,
      end: new Date(s.startsAt.getTime() + s.durationMin * 60_000),
      summary: s.title,
      description: s.note,
      stamp: s.createdAt,
    })),
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="cheese.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
