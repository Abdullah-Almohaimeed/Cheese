import { TabBar } from "@/components/tab-bar";
import { requireUser } from "@/lib/session";

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <main className="page page--tabs">{children}</main>
      <TabBar />
    </>
  );
}
