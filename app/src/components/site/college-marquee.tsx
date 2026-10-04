export function CollegeMarquee({ colleges }: { colleges: string[] }) {
  if (colleges.length < 3) return null;
  const row = [...colleges, ...colleges];
  return (
    <div className="marquee-pause overflow-hidden border-y-[1.5px] border-ink bg-band py-3 text-band-fg" aria-label="Colleges registered so far">
      <div className="fade-x">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {row.map((c, i) => (
          <span key={i} className="label-mono flex items-center gap-10">
            {c}
            <span className="text-flame" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}
