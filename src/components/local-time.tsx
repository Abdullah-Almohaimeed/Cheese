"use client";

import { useEffect, useState } from "react";

function format(iso: string, zone: string | undefined, part: "day" | "time"): string {
  const d = new Date(iso);
  if (part === "day") {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: zone }).format(d).replace(",", "");
  }
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: zone }).format(d).replace(/\s?(AM|PM)$/i, (m) => ` ${m.trim().toLowerCase()}`);
}

/**
 * A moment shown in the viewer's own timezone. The server renders it in the host's timezone first
 * (so the page is complete without JavaScript), then the browser swaps in the local time.
 */
export function LocalTime({ iso, hostZone, part }: { iso: string; hostZone: string; part: "day" | "time" }) {
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => {
    setLocal(format(iso, undefined, part));
  }, [iso, part]);
  return (
    <time dateTime={iso} title={local ? undefined : `Shown in ${hostZone}`}>
      {local ?? format(iso, hostZone, part)}
    </time>
  );
}
