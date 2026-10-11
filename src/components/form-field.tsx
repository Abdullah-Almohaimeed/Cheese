"use client";

import { useActionState } from "react";

type State = { message?: string; error?: string } | undefined;

/** A small form that posts to a server action and shows its message or error underneath. */
export function ActionForm({
  action,
  children,
  submit,
  ghost,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  children: React.ReactNode;
  submit: string;
  ghost?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="stack">
      {children}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {state?.message && <p className="hint" role="status">{state.message}</p>}
      <button className={`ch-btn ${ghost ? "ch-btn--ghost" : "ch-btn--primary"} ch-btn--block`} disabled={pending}>
        {pending ? "One moment" : submit}
      </button>
    </form>
  );
}
