"use client";

import { useEffect } from "react";
import { saveTimezone } from "@/app/actions/profile";

/** Tells the server which timezone this device is in, once per session, when it differs from what is saved. */
export function TimezoneSync({ saved }: { saved: string }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === saved) return;
    try {
      if (sessionStorage.getItem("tz-synced") === zone) return;
      sessionStorage.setItem("tz-synced", zone);
    } catch {
      /* storage may be blocked; the server call below is harmless to repeat */
    }
    void saveTimezone(zone);
  }, [saved]);
  return null;
}
