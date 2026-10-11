"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ google, dev, next }: { google: boolean; dev: boolean; next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function withGoogle() {
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (res?.error) {
      setError(res.error.message ?? "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  async function devSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const name = String(f.get("name") || email.split("@")[0]);
    const signedIn = await authClient.signIn.email({ email, password });
    if (signedIn.error) {
      const created = await authClient.signUp.email({ email, password, name });
      if (created.error) {
        setError(created.error.message ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
    }
    window.location.href = next;
  }

  return (
    <div className="stack">
      {google ? (
        <button className="ch-btn ch-btn--primary ch-btn--block" onClick={withGoogle} disabled={busy}>
          Continue with Google
        </button>
      ) : (
        !dev && <p className="error">Google sign-in is not set up yet. See SETUP.md.</p>
      )}
      {dev && (
        <form className="card stack" onSubmit={devSubmit}>
          <p className="ch-overline">Local development only</p>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" className="input" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={8} className="input" required autoComplete="current-password" />
          </div>
          <button className="ch-btn ch-btn--ghost ch-btn--block" disabled={busy}>
            Sign in or create account
          </button>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
