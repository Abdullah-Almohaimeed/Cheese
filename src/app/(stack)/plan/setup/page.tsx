import Link from "next/link";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { resetCalendarLink } from "@/app/actions/plan";
import { Icon } from "@/components/icons";
import { db } from "@/db";
import { freeWindow } from "@/db/schema";
import { googleConfigured } from "@/lib/auth";
import { calendarConnected } from "@/lib/google-calendar";
import { requireUser } from "@/lib/session";
import { CalendarConnect } from "./calendar-connect";
import { CopyLink } from "./copy-link";
import { FreeTimeEditor } from "./free-time-editor";
import { GoalForm } from "./goal-form";

export const metadata = { title: "Free time" };

export default async function SetupPage() {
  const { user, profile } = await requireUser();
  const [windows, connected, h] = await Promise.all([db.select().from(freeWindow).where(eq(freeWindow.userId, user.id)), calendarConnected(user.id), headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = process.env.BETTER_AUTH_URL ?? `${proto}://${host}`;
  const feed = `${origin.replace(/\/$/, "")}/api/calendar/${profile.icsToken}.ics`;

  return (
    <>
      <header className="head">
        <h1 className="ch-title">Free time</h1>
        <Link href="/plan" className="iconbtn" aria-label="Back to Plan">
          <Icon name="back" />
        </Link>
      </header>

      <section className="sec">
        <p className="ch-overline">Weekly goal</p>
        <GoalForm hours={Math.round((profile.weeklyGoalMinutes / 60) * 10) / 10} />
      </section>

      <section className="sec">
        <p className="ch-overline">Usually free</p>
        <p className="hint">Times shown in {profile.timezone}. You can change a single day from the Plan screen.</p>
        <FreeTimeEditor initial={windows.map((w) => ({ weekday: w.weekday, startMin: w.startMin, endMin: w.endMin }))} />
      </section>

      <section className="sec">
        <p className="ch-overline">Google Calendar</p>
        <CalendarConnect connected={connected} googleReady={googleConfigured} />
      </section>

      <section className="sec">
        <p className="ch-overline">Calendar link</p>
        <p className="hint">Add this link to Apple Calendar, Google Calendar or Outlook as a subscribed calendar to see your sessions there. Anyone with the link can see them, so keep it private.</p>
        <CopyLink url={feed} />
        <form action={resetCalendarLink}>
          <button className="ch-btn ch-btn--pill">Make a new link</button>
        </form>
      </section>
    </>
  );
}
