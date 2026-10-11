"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack">
      <input className="input" readOnly value={url} aria-label="Calendar link" onFocus={(e) => e.currentTarget.select()} />
      <button
        className="ch-btn ch-btn--ghost ch-btn--block"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
