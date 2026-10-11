/** Cover art: the real image when we have one, otherwise a flat colour with the title. */
export function artClass(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return `ch-art-${(Math.abs(h) % 8) + 1}`;
}

export function Cover({ src, title }: { src?: string | null; title: string }) {
  return (
    <div className={`ch-cover ${artClass(title)}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="ch-cover__t">{title}</span>
      )}
    </div>
  );
}
