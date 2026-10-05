import { AUTHOR } from "@/lib/constants";
import { Signature } from "@/components/site/signature";

/** A rubber-stamp seal with the author's name around the rim. Barely visible until hovered. */
function Stamp() {
  const rim = `${AUTHOR.toUpperCase()} · BUILD60 · 2026 · `;
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Stamp: designed and built by ${AUTHOR}`}
      data-stamp="author"
      className="size-16 shrink-0 -rotate-12 text-marker opacity-[0.12] transition-opacity duration-500 hover:opacity-90"
    >
      <title>{`Designed and built by ${AUTHOR}`}</title>
      <defs>
        <path id="stamp-rim" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fill="currentColor" fontSize="9.6" letterSpacing="1.4" fontFamily="var(--font-label), monospace">
        <textPath href="#stamp-rim">{rim}</textPath>
      </text>
      <text x="60" y="66" textAnchor="middle" fill="currentColor" fontSize="19" fontFamily="var(--font-display), serif">
        STS
      </text>
    </svg>
  );
}

/** The last thing on every page: who made it. */
export function Credit() {
  return (
    <div className="border-t border-band-fg/15 bg-band text-band-fg" data-author={AUTHOR}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <p className="label-mono text-band-fg/60">
          Designed &amp; built by <span className="text-band-fg">{AUTHOR}</span>
        </p>
        <Stamp />
      </div>
      <Signature />
    </div>
  );
}
