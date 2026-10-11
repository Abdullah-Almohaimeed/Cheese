import Link from "next/link";
import { Icon } from "@/components/icons";
import { ManualForm } from "./manual-form";

export const metadata = { title: "Add it yourself" };

export default function ManualPage() {
  return (
    <>
      <header className="head">
        <h1 className="ch-title">Add it yourself</h1>
        <Link href="/add" className="iconbtn" aria-label="Back to search">
          <Icon name="back" />
        </Link>
      </header>
      <section>
        <ManualForm />
      </section>
    </>
  );
}
