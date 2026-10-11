"use client";

import { useActionState } from "react";
import { bookFromForm } from "@/app/actions/plan";

type Props = {
  entryId?: string;
  title?: string;
  label?: string;
  units?: number;
  day: string;
  start: string;
  durationMin: number;
  /** When true the person can change the day, time and length. Otherwise they are fixed and only the button shows. */
  editable?: boolean;
  submitLabel: string;
  pill?: boolean;
};

export function BookForm(p: Props) {
  const [state, action, pending] = useActionState(bookFromForm, undefined);
  const id = `${p.entryId ?? "x"}-${p.start}`;
  return (
    <form action={action} className={p.editable ? "stack" : undefined} style={p.editable ? undefined : { display: "contents" }}>
      {p.entryId && <input type="hidden" name="entryId" value={p.entryId} />}
      {p.title && <input type="hidden" name="title" value={p.title} />}
      {p.label && <input type="hidden" name="label" value={p.label} />}
      {p.units != null && <input type="hidden" name="units" value={p.units} />}
      {p.editable ? (
        <>
          <div className="field">
            <label htmlFor={`day-${id}`}>Day</label>
            <input id={`day-${id}`} name="day" type="date" className="input" defaultValue={p.day} required />
          </div>
          <div className="row">
            <div className="field grow">
              <label htmlFor={`start-${id}`}>Starts</label>
              <input id={`start-${id}`} name="start" type="time" step={300} className="input" defaultValue={p.start} required />
            </div>
            <div className="field grow">
              <label htmlFor={`dur-${id}`}>Minutes</label>
              <input id={`dur-${id}`} name="durationMin" type="number" inputMode="numeric" min={5} max={720} className="input" defaultValue={p.durationMin} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`note-${id}`}>Note (optional)</label>
            <input id={`note-${id}`} name="note" className="input" maxLength={500} />
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="day" value={p.day} />
          <input type="hidden" name="start" value={p.start} />
          <input type="hidden" name="durationMin" value={p.durationMin} />
        </>
      )}
      {state?.error && <p className="error" role="alert" style={p.editable ? undefined : { gridColumn: "1 / -1" }}>{state.error}</p>}
      <button className={p.pill ? "ch-btn ch-btn--pill is-accent" : "ch-btn ch-btn--primary ch-btn--block"} disabled={pending}>
        {pending ? "Booking" : p.submitLabel}
      </button>
    </form>
  );
}
