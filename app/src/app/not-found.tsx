import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";

export const metadata = { title: "Not found — Build60" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="rise mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center px-5 py-20">
        <p className="label-mono text-flame">404 · nothing here</p>
        <h1 className="mt-3 text-6xl leading-[0.95] md:text-8xl">
          This page didn&apos;t <span className="hl">ship.</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-ink/75">
          The link may be mistyped, or the page was never shared. Referral and result links only work exactly as they were sent.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-ink bg-flame px-5 font-semibold text-white hard-sm transition-transform hover:-translate-y-0.5">
            Go to the workshop <ArrowRight className="size-4" />
          </Link>
          <Link href="/leaderboard" className="inline-flex h-11 items-center rounded-md border-[1.5px] border-ink bg-card px-5 font-semibold transition-colors hover:bg-marker">
            See the leaderboard
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
