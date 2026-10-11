"use client";

import { useActionState, useState } from "react";
import { addManualItem } from "@/app/actions/library";
import { CATEGORIES, type Category } from "@/db/schema";
import { CATEGORY_LABEL } from "@/lib/length";

const LENGTH_FIELDS: Record<Category, { name: "count" | "minutes" | "hours"; label: string; hint?: string }[]> = {
  movie: [{ name: "minutes", label: "Runtime in minutes" }],
  series: [
    { name: "count", label: "Episodes" },
    { name: "minutes", label: "Minutes per episode" },
  ],
  anime: [
    { name: "count", label: "Episodes" },
    { name: "minutes", label: "Minutes per episode" },
  ],
  manga: [{ name: "count", label: "Chapters" }],
  book: [{ name: "count", label: "Pages" }],
  game: [{ name: "hours", label: "Hours to finish" }],
};

export function ManualForm() {
  const [state, action, pending] = useActionState(addManualItem, undefined);
  const [category, setCategory] = useState<Category>("movie");

  return (
    <form action={action} className="stack">
      <div className="field">
        <span className="lbl" id="cat-label">
          Type
        </span>
        <div className="ch-chips" role="radiogroup" aria-labelledby="cat-label" style={{ paddingInline: 0, flexWrap: "wrap", overflow: "visible" }}>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              role="radio"
              aria-checked={category === c}
              key={c}
              className="ch-chip"
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
      </div>

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" className="input" required maxLength={200} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="creator">{category === "book" ? "Author" : category === "game" ? "Studio" : "Creator"} (optional)</label>
        <input id="creator" name="creator" className="input" maxLength={120} autoComplete="off" />
      </div>
      {LENGTH_FIELDS[category].map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={f.name}>{f.label} (optional)</label>
          <input id={f.name} name={f.name} type="number" inputMode="numeric" min={1} max={100000} className="input" />
        </div>
      ))}
      <p className="hint">Length is used to fit things into your free time. You can change it later.</p>
      {state?.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="ch-btn ch-btn--primary ch-btn--block" disabled={pending}>
        {pending ? "Adding" : "Add to my list"}
      </button>
    </form>
  );
}
