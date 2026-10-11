"use client";

import { useActionState } from "react";
import { joinNight } from "@/app/actions/nights";

export function GuestForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(joinNight.bind(null, token), undefined);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" className="input" maxLength={30} autoComplete="given-name" required />
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="ch-btn ch-btn--primary ch-btn--block" disabled={pending}>
        {pending ? "One moment" : "Continue"}
      </button>
    </form>
  );
}
