import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="page page--tabs">{children}</main>
      <TabBar />
    </>
  );
}
