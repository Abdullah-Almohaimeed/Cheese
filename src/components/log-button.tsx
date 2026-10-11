"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logProgress } from "@/app/actions/entry";
import type { Unit } from "@/db/schema";
import { STEP, stepLabel } from "@/lib/progress";

/** The one-tap progress button: +1 ep, +10 pages and so on. Opens the rating prompt when the last unit is logged. */
export function LogButton({ entryId, unit, className = "ch-plus1" }: { entryId: string; unit: Unit; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <button
      className={className}
      disabled={pending}
      aria-label={error ? "Could not save. Try again." : stepLabel(unit)}
      onClick={() =>
        start(async () => {
          setError(false);
          const r = await logProgress(entryId, { add: STEP[unit] });
          if (!r.ok) return setError(true);
          if (r.finishedNow) router.push(`/item/${entryId}?rate=1`);
        })
      }
    >
      {error ? "Try again" : stepLabel(unit)}
    </button>
  );
}
