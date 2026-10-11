"use client";

import { useState, useTransition } from "react";
import { saveGoal } from "@/app/actions/plan";

export function GoalForm({ hours }: { hours: number }) {
  const [value, setValue] = useState(String(hours));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveGoal(Number(value));
          setMsg(r.ok ? "Saved." : (r.error ?? "Could not save."));
        });
      }}
    >
      <div className="row">
        <div className="field grow">
          <label htmlFor="goal" className="sr-only">Hours per week</label>
          <input id="goal" className="input" type="number" inputMode="decimal" min={0.5} max={70} step={0.5} value={value} onChange={(e) => { setValue(e.target.value); setMsg(null); }} />
        </div>
        <span className="muted">hours a week</span>
        <button className="ch-btn ch-btn--ghost" disabled={pending}>Save</button>
      </div>
      {msg && <p className="hint" role="status">{msg}</p>}
    </form>
  );
}
