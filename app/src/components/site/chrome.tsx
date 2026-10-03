import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b-[1.5px] border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none">Build60</span>
          <span className="label-mono hidden text-muted-foreground sm:inline">by NxtWave</span>
        </Link>
        <nav className="label-mono flex items-center gap-5">
          <Link href="/leaderboard" className="hover:text-flame">
            Leaderboard
          </Link>
          <Link href="/gallery" className="hover:text-flame">
            Gallery
          </Link>
          <Link
            href="/#register"
            className="rounded-sm border-[1.5px] border-ink bg-ink px-3 py-1.5 text-paper hover:bg-flame"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t-[1.5px] border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-2xl">Build60</p>
        <p className="label-mono text-paper/60">
          Free workshop · Final-year engineering students · Questions? Reply on WhatsApp.
        </p>
      </div>
    </footer>
  );
}
