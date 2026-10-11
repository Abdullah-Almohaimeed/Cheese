import type { Person } from "@/lib/friends";

export function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function Avatar({ person, size }: { person: Pick<Person, "displayName" | "avatarTone">; size?: "sm" | "lg" }) {
  return (
    <span className={`ch-av ch-av-${person.avatarTone}${size ? ` ch-av--${size}` : ""}`} title={person.displayName}>
      {initial(person.displayName)}
    </span>
  );
}

/** Overlapping initials. Shows up to `max` people and a "+N" for the rest. */
export function AvatarStack({ people, size, max = 5, onSurface = true }: { people: Pick<Person, "userId" | "displayName" | "avatarTone">[]; size?: "sm" | "lg"; max?: number; onSurface?: boolean }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className={`ch-avatars${onSurface ? " on-surface" : ""}`} role="img" aria-label={people.map((p) => p.displayName).join(", ")}>
      {shown.map((p) => (
        <Avatar key={p.userId} person={p} size={size} />
      ))}
      {extra > 0 && <span className={`ch-av ch-av--more${size ? ` ch-av--${size}` : ""}`}>+{extra}</span>}
    </div>
  );
}
