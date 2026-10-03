import { CHALLENGE_RUBRIC } from "./rubric";

/**
 * Share-card artwork, drawn with the same palette as the site. These are rendered by `ImageResponse`
 * (Satori), which supports flexbox and a CSS subset only — so every container is `display: flex`.
 */
const C = { paper: "#f3eee3", card: "#fbf8f1", ink: "#16120e", flame: "#ff4a1c", marker: "#ffe14d", muted: "#6b6256" };

export type CardSize = { width: number; height: number; story: boolean };
export const LANDSCAPE: CardSize = { width: 1200, height: 630, story: false };
export const STORY: CardSize = { width: 1080, height: 1920, story: true };

const scale = (s: CardSize) => (s.story ? 1.35 : 1);

function Frame({ size, children }: { size: CardSize; children: React.ReactNode }) {
  const u = scale(size);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: C.paper, padding: 36 * u }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: C.card,
          border: `${4 * u}px solid ${C.ink}`,
          boxShadow: `${12 * u}px ${12 * u}px 0 ${C.ink}`,
          padding: 48 * u,
          color: C.ink,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ text, u, bg = C.marker }: { text: string; u: number; bg?: string }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", background: bg, border: `${3 * u}px solid ${C.ink}`, padding: `${6 * u}px ${16 * u}px`, fontSize: 22 * u, letterSpacing: 2 * u, textTransform: "uppercase" }}>
      {text}
    </div>
  );
}

function Ticks({ filled, total, u }: { filled: number; total: number; u: number }) {
  return (
    <div style={{ display: "flex", gap: 5 * u }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: 20 * u, height: 34 * u, border: `${3 * u}px solid ${C.ink}`, background: i < filled ? C.flame : C.card }} />
      ))}
    </div>
  );
}


/** Headline built word-by-word: the renderer won't wrap a few big text spans, but it wraps flex items fine. */
function Headline({ parts, fontSize }: { parts: { text: string; color?: string }[]; fontSize: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: "100%", fontSize, lineHeight: 1.08, letterSpacing: -1 }}>
      {parts.flatMap((p, i) =>
        // A highlighted phrase stays on one line; plain text breaks word by word.
        (p.color && p.text.length <= 24 ? [p.text] : p.text.split(" ").filter(Boolean)).map((w, j) => (
          <span key={`${i}-${j}`} style={{ color: p.color ?? C.ink, marginRight: 0.26 * fontSize, display: "flex", whiteSpace: "nowrap" }}>
            {w}
          </span>
        )),
      )}
    </div>
  );
}

const Brand = ({ u }: { u: number }) => (
  <div style={{ display: "flex", fontSize: 30 * u, letterSpacing: 1 }}>
    <span>Build60</span>
    <span style={{ color: C.muted, marginLeft: 14 * u, fontSize: 20 * u, alignSelf: "flex-end" }}>by NxtWave</span>
  </div>
);

/** The card a referral link unfurls to. Uses only a first name and a college — both already public on the thanks page. */
export function RefCard({ size, firstName, college, claimed, target }: { size: CardSize; firstName: string | null; college: string | null; claimed: number; target: number }) {
  const u = scale(size);
  const left = Math.max(0, target - claimed);
  const ticks = 20;
  const filled = Math.min(ticks, Math.round((claimed / target) * ticks));
  return (
    <Frame size={size}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 * u, width: "100%" }}>
        <Chip text="Free live workshop · 60 min" u={u} />
        <Headline
          fontSize={(size.story ? (firstName ? 108 : 118) : firstName ? 70 : 82) * u}
          parts={
            firstName
              ? [{ text: `${firstName} is building a first` }, { text: "AI project", color: C.flame }, { text: "in 60 minutes." }]
              : [{ text: "Build your first" }, { text: "AI project", color: C.flame }, { text: "in 60 minutes." }]
          }
        />
        <div style={{ display: "flex", fontSize: (size.story ? 40 : 32) * u, color: C.muted }}>{firstName && college ? `${college} · join the free workshop` : "A free live workshop for final-year engineering students."}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 * u }}>
        <div style={{ display: "flex", flexDirection: size.story ? "column" : "row", alignItems: size.story ? "flex-start" : "center", justifyContent: "space-between", gap: 16 * u }}>
          <Ticks filled={filled} total={ticks} u={u} />
          <div style={{ display: "flex", fontSize: 28 * u }}>
            <span style={{ color: C.flame, marginRight: 10 * u }}>{left}</span>
            <span>of {target} seats left</span>
          </div>
        </div>
        <Brand u={u} />
      </div>
    </Frame>
  );
}

/** A student's opt-in "proof of work" card. */
export function ProofCard({
  size,
  firstName,
  college,
  title,
  minutes,
  total,
  scores,
}: {
  size: CardSize;
  firstName: string;
  college: string;
  title: string;
  minutes: number | null;
  total: number | null;
  scores: Record<string, number> | null;
}) {
  const u = scale(size);
  // Explicit pixel widths: Satori does not resolve percentage/flex widths reliably in nested rows.
  const innerW = size.width - (36 * 2 + 48 * 2 + 8) * u;
  const barsW = size.story ? innerW : innerW - (390 + 28) * u;
  const trackW = barsW - (170 + 14) * u;
  // Cut long titles at a word boundary, not mid-word.
  const short = title.length > 40 ? `${title.slice(0, 40).replace(/\s+\S*$/, "")}…` : title;
  return (
    <Frame size={size}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 * u, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Chip text="Built in the 60-minute AI challenge" u={u} />
          {!size.story && <Brand u={u} />}
        </div>
        <Headline
          fontSize={(size.story ? 92 : 54) * u}
          parts={[{ text: `${firstName} shipped` }, { text: short, color: C.flame }, { text: minutes ? `in ${minutes} min.` : "." }]}
        />
        <div style={{ display: "flex", fontSize: (size.story ? 36 : 28) * u, color: C.muted }}>{college}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 * u, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: size.story ? "column" : "row", alignItems: size.story ? "stretch" : "flex-end", justifyContent: "space-between", gap: 28 * u, width: "100%" }}>
          {total !== null && scores ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 * u, width: barsW }}>
                {CHALLENGE_RUBRIC.map((c) => (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 14 * u, width: barsW }}>
                    <div style={{ display: "flex", width: 170 * u, fontSize: 20 * u }}>{c.label}</div>
                    <div style={{ display: "flex", width: trackW, height: 16 * u, border: `${3 * u}px solid ${C.ink}`, background: C.card }}>
                      <div style={{ display: "flex", width: `${((scores[c.key] ?? 0) / 20) * 100}%`, background: C.flame }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", alignSelf: size.story ? "flex-start" : "flex-end", marginLeft: size.story ? 0 : 36 * u, background: C.marker, border: `${4 * u}px solid ${C.ink}`, padding: `${8 * u}px ${24 * u}px`, boxShadow: `${6 * u}px ${6 * u}px 0 ${C.ink}` }}>
                <span style={{ fontSize: (size.story ? 120 : 92) * u, lineHeight: 1 }}>{total}</span>
                <span style={{ fontSize: 34 * u, marginBottom: 10 * u, marginLeft: 6 * u }}>/100</span>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", fontSize: 40 * u }}>Challenge completed ✓</div>
          )}
        </div>
        {size.story && <Brand u={u} />}
      </div>
    </Frame>
  );
}
