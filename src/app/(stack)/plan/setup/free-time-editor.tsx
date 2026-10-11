"use client";

import { useState, useTransition } from "react";
import { saveFreeWindows } from "@/app/actions/plan";
import { clockOf, parseClock } from "@/lib/freetime";

type Win = { weekday: number; start: string; end: string };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PRESETS: { label: string; windows: Win[] }[] = [
  { label: "Every evening", windows: DAYS.map((_, weekday) => ({ weekday, start: "20:00", end: "23:00" })) },
  { label: "Weeknights", windows: [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: "20:00", end: "23:00" })) },
  { label: "Weekend afternoons", windows: [5, 6].map((weekday) => ({ weekday, start: "14:00", end: "19:00" })) },
];

export function FreeTimeEditor({ initial }: { initial: { weekday: number; startMin: number; endMin: number }[] }) {
  const [wins, setWins] = useState<Win[]>(initial.map((w) => ({ weekday: w.weekday, start: clockOf(w.startMin), end: clockOf(w.endMin) })));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (i: number, patch: Partial<Win>) => {
    setMsg(null);
    setWins((w) => w.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };
  const add = (weekday: number) => {
    setMsg(null);
    setWins((w) => [...w, { weekday, start: "20:00", end: "23:00" }]);
  };
  const remove = (i: number) => {
    setMsg(null);
    setWins((w) => w.filter((_, j) => j !== i));
  };
  const applyPreset = (p: Win[]) => {
    setMsg(null);
    setWins((w) => [...w, ...p.filter((x) => !w.some((y) => y.weekday === x.weekday && y.start === x.start && y.end === x.end))]);
  };

  function save() {
    const payload = wins.map((w) => ({ weekday: w.weekday, startMin: parseClock(w.start), endMin: parseClock(w.end) }));
    if (payload.some((w) => w.startMin == null || w.endMin == null)) return setMsg({ ok: false, text: "Fill in every start and end time." });
    start(async () => {
      const r = await saveFreeWindows(payload);
      setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Could not save." });
    });
  }

  return (
    <div className="stack">
      <div className="ch-chips" role="group" aria-label="Quick fill" style={{ paddingInline: 0, flexWrap: "wrap", overflow: "visible" }}>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="ch-chip" aria-pressed="false" onClick={() => applyPreset(p.windows)}>
            + {p.label}
          </button>
        ))}
      </div>

      {DAYS.map((name, weekday) => {
        const mine = wins.map((w, i) => ({ w, i })).filter(({ w }) => w.weekday === weekday);
        return (
          <div className="card week-day-card" key={name}>
            <div className="row row--between">
              <p className="ch-row-title">{name}</p>
              <button type="button" className="ch-btn ch-btn--pill" onClick={() => add(weekday)} aria-label={`Add free time on ${name}`}>
                Add
              </button>
            </div>
            {mine.length === 0 && <p className="hint">Not free.</p>}
            {mine.map(({ w, i }) => (
              <div className="window-row" key={i}>
                <input aria-label={`${name} from`} type="time" step={300} className="input" value={w.start} onChange={(e) => update(i, { start: e.target.value })} />
                <span aria-hidden="true">to</span>
                <input aria-label={`${name} to`} type="time" step={300} className="input" value={w.end} onChange={(e) => update(i, { end: e.target.value })} />
                <button type="button" className="iconbtn" aria-label={`Remove ${name} ${w.start} to ${w.end}`} onClick={() => remove(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {msg && (
        <p className={msg.ok ? "hint" : "error"} role="status">
          {msg.text}
        </p>
      )}
      <button type="button" className="ch-btn ch-btn--primary ch-btn--block" onClick={save} disabled={pending}>
        {pending ? "Saving" : "Save free time"}
      </button>
    </div>
  );
}
