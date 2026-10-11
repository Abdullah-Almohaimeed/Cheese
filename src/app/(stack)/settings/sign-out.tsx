"use client";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      className="ch-btn ch-btn--ghost ch-btn--block"
      onClick={async () => {
        await authClient.signOut();
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
