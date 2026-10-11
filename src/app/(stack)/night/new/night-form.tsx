"use client";

import { useActionState } from "react";
import { proposeNight } from "@/app/actions/nights";

type Row = { day: string; start: string };

export function NightForm({ groupId, itemId, rows, durationMin, units, unitLabel, canSetUnits }: { groupId: string; itemId: string; rows: Row[]; durationMin: number; units: number | null; unitLabel: string; canSetUnits: boolean }) {
  const [state, action, pending] = useActionState(proposeNight, undefined);
  const padded = [...rows, ...Array.from({ length: Math.max(0, 4 - rows.length) }, () => ({ day: "", start: "" }))];
  return (
    <form action={action} className="stack">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="itemId" value={itemId} />

      <div className="stack">
        <p className="ch-overline">Times to vote on</p>
        {padded.map((r, i) => (
          <div className="row" key={i}>
            <div className="field grow">
              <label htmlFor={`day${i + 1}`} className="sr-only">Day {i + 1}</label>
              <input id={`day${i + 1}`} name={`day${i + 1}`} type="date" className="input" defaultValue={r.day} />
            </div>
            <div className="field" style={{ width: 130 }}>
              <label htmlFor={`start${i + 1}`} className="sr-only">Time {i + 1}</label>
              <input id={`start${i + 1}`} name={`start${i + 1}`} type="time" step={300} className="input" defaultValue={r.start} />
            </div>
          </div>
        ))}
        <p className="hint">Leave a row empty to skip it. Your friends vote on whichever times work for them.</p>
      </div>

      <div className="row">
        <div className="field grow">
          <label htmlFor="durationMin">Length in minutes</label>
          <input id="durationMin" name="durationMin" type="number" inputMode="numeric" min={5} max={720} className="input" defaultValue={durationMin} required />
        </div>
        {canSetUnits && (
          <div className="field grow">
            <label htmlFor="units">{unitLabel}</label>
            <input id="units" name="units" type="number" inputMode="numeric" min={1} max={1000} className="input" defaultValue={units ?? undefined} />
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="note">Note (optional)</label>
        <input id="note" name="note" className="input" maxLength={500} placeholder="Snacks are on me" />
      </div>

      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="ch-btn ch-btn--primary ch-btn--block" disabled={pending}>
        {pending ? "Sending" : "Send for voting"}
      </button>
    </form>
  );
}
