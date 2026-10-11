"use client";

const STAR = "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z";

/** Half-star rating. `value` is in half stars: 0 or null = none, 10 = five stars. Tapping the left half of a star gives a half. */
export function StarRating({
  value,
  onChange,
  large,
  label = "Rating",
}: {
  value: number | null;
  onChange?: (half: number | null) => void;
  large?: boolean;
  label?: string;
}) {
  const half = value ?? 0;
  const stars = half / 2;
  const interactive = Boolean(onChange);

  function setHalf(next: number) {
    if (!onChange) return;
    const clamped = Math.max(0, Math.min(10, next));
    onChange(clamped === 0 ? null : clamped);
  }

  return (
    <div
      className={`ch-stars${large ? " ch-stars--lg" : ""}`}
      role={interactive ? "slider" : "img"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 5 : undefined}
      aria-valuenow={interactive ? stars : undefined}
      aria-valuetext={stars ? `${stars} out of 5` : "Not rated"}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          setHalf(half + 1);
          e.preventDefault();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          setHalf(half - 1);
          e.preventDefault();
        }
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = half >= (i + 1) * 2 ? 100 : half >= i * 2 + 1 ? 50 : 0;
        return (
          <span
            key={i}
            className="ch-star"
            style={{ ["--fill" as string]: `${fill}%` }}
            onClick={(e) => {
              if (!interactive) return;
              const r = e.currentTarget.getBoundingClientRect();
              const next = i * 2 + (e.clientX - r.left < r.width / 2 ? 1 : 2);
              setHalf(next === half ? 0 : next);
            }}
          >
            <svg className="ch-star__bg" viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} />
            </svg>
            <svg className="ch-star__fg" viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} />
            </svg>
          </span>
        );
      })}
    </div>
  );
}
