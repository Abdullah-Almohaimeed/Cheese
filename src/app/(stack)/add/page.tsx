import Link from "next/link";
import { Icon } from "@/components/icons";
import { AddSearch } from "./add-search";

export const metadata = { title: "Add" };

export default function AddPage() {
  return (
    <>
      <header className="head">
        <h1 className="ch-title">Add</h1>
        <Link href="/" className="iconbtn" aria-label="Close">
          <Icon name="x" />
        </Link>
      </header>
      <AddSearch />
    </>
  );
}
