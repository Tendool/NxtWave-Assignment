export function CollegeMarquee({ colleges }: { colleges: string[] }) {
  if (colleges.length < 3) return null;
  const row = [...colleges, ...colleges];
  return (
    <div className="overflow-hidden border-y-[1.5px] border-ink bg-ink py-3 text-paper" aria-label="Colleges registered so far">
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
  );
}
