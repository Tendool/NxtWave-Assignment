import Link from "next/link";
import { Nav } from "@/components/site/nav";
import { WORKSHOP } from "@/lib/constants";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="font-display text-2xl leading-none">
            Build<span className="text-flame">60</span>
          </span>
          <span className="label-mono hidden text-muted-foreground sm:inline">by NxtWave</span>
        </Link>
        <Nav />
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  { href: "/#register", label: "Save your seat" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/gallery", label: "Project gallery" },
  { href: "/kit", label: "Campus kit" },
  { href: "/evaluate", label: "Score your project" },
  { href: "/challenge", label: "My challenge" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-[1.5px] border-ink bg-band text-band-fg">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="font-display text-4xl leading-none">
            Build<span className="text-flame">60</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-band-fg/70">
            {WORKSHOP.title}. A free live workshop for final-year engineering students — you leave with something deployed.
          </p>
          <p className="label-mono mt-6 text-band-fg/50">Questions? Ask in the workshop WhatsApp group.</p>
        </div>
        <nav aria-label="Footer">
          <p className="label-mono text-marker">Explore</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-band-fg/80 transition-colors hover:text-marker">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-band-fg/15">
        <p className="label-mono mx-auto max-w-6xl px-5 py-4 text-band-fg/40">Free workshop · Final-year engineering students · India</p>
      </div>
    </footer>
  );
}
