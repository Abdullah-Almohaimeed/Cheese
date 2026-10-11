"use client";

import { useActionState } from "react";
import { addOverride } from "@/app/actions/plan";

export function AdjustForm({ day }: { day: string }) {
  const [state, action, pending] = useActionState(addOverride, undefined);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="day" value={day} />
      <div className="ch-seg" role="radiogroup" aria-label="Kind">
        <label style={{ flex: 1 }}>
          <input type="radio" name="kind" value="add" defaultChecked className="sr-only" />
          <span className="adjust-opt">Free more</span>
        </label>
        <label style={{ flex: 1 }}>
          <input type="radio" name="kind" value="block" className="sr-only" />
          <span className="adjust-opt">Block time</span>
        </label>
      </div>
      <div className="row">
        <div className="field grow">
          <label htmlFor="adj-start">From</label>
          <input id="adj-start" name="start" type="time" step={300} className="input" defaultValue="18:00" required />
        </div>
        <div className="field grow">
          <label htmlFor="adj-end">To</label>
          <input id="adj-end" name="end" type="time" step={300} className="input" defaultValue="20:00" required />
        </div>
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="ch-btn ch-btn--ghost ch-btn--block" disabled={pending}>
        Add to this day
      </button>
    </form>
  );
}
