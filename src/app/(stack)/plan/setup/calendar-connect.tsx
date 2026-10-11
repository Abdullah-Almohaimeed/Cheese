"use client";

import { useState, useTransition } from "react";
import { disconnectGoogleCalendar } from "@/app/actions/plan";
import { authClient } from "@/lib/auth-client";
import { FREEBUSY_SCOPE } from "@/lib/google-scope";

export function CalendarConnect({ connected, googleReady }: { connected: boolean; googleReady: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function connect() {
    setError(null);
    const res = await authClient.linkSocial({
      provider: "google",
      scopes: [FREEBUSY_SCOPE],
      callbackURL: "/plan/setup",
      errorCallbackURL: "/plan/setup?calendar=failed",
      additionalParams: { prompt: "consent" },
    });
    if (res?.error) setError(res.error.message ?? "Could not start the Google connection.");
  }

  if (!googleReady) return <p className="hint">Google sign-in is not set up on this server, so the calendar cannot be connected. See SETUP.md.</p>;

  return (
    <div className="stack">
      <p className="hint">
        {connected
          ? "Connected. Cheese skips times when your Google Calendar says you are busy. It never sees event titles or details."
          : "Optional. Cheese will skip times when your Google Calendar says you are busy. It only learns when you are busy, never what for."}
      </p>
      {connected ? (
        <button className="ch-btn ch-btn--ghost ch-btn--block" disabled={pending} onClick={() => start(() => disconnectGoogleCalendar())}>
          Disconnect Google Calendar
        </button>
      ) : (
        <button className="ch-btn ch-btn--primary ch-btn--block" onClick={connect}>
          Connect Google Calendar
        </button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
