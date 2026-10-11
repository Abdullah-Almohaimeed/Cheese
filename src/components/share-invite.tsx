"use client";

import { useState } from "react";

export function ShareInvite({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="stack">
      <input className="input" readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
      <div className="row">
        <a className="ch-btn ch-btn--primary grow" href={whatsapp} target="_blank" rel="noopener noreferrer">
          Share to WhatsApp
        </a>
        <button className="ch-btn ch-btn--ghost" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {canShare && (
        <button className="ch-btn ch-btn--pill" style={{ alignSelf: "flex-start" }} onClick={() => navigator.share({ text: message, url }).catch(() => undefined)}>
          More ways to share
        </button>
      )}
    </div>
  );
}
