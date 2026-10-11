import { TabBar } from "@/components/tab-bar";
import { TimezoneSync } from "@/components/timezone-sync";
import { requireUser } from "@/lib/session";

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return (
    <>
      <main className="page page--tabs">{children}</main>
      <TabBar />
      <TimezoneSync saved={profile.timezone} />
    </>
  );
}
