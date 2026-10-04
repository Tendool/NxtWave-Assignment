import Link from "next/link";
import { ArrowRight, Code2, ExternalLink, Timer, Trophy } from "lucide-react";
import { topEvaluations } from "@/db/queries";
import { sharedProofs } from "@/db/challenge";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/fx/blur-fade";
import { NumberTicker } from "@/components/fx/number-ticker";
import { SpotlightCard } from "@/components/fx/spotlight-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project gallery — Build60" };

const host = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};

export default async function Gallery() {
  const [items, proofs] = await Promise.all([topEvaluations(30), sharedProofs(24)]);
  const empty = items.length === 0 && proofs.length === 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-12 md:py-16">
        <div className="rise">
          <p className="label-mono text-flame">Built in 60 minutes</p>
          <h1 className="mt-2 text-5xl md:text-6xl">The gallery.</h1>
          <p className="mt-3 max-w-xl text-ink/75">
            Real projects from workshop attendees. Built something?{" "}
            <Link href="/evaluate" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">
              Submit yours
            </Link>
            .
          </p>
        </div>

        {empty && (
          <BlurFade className="paper-card mt-10 flex flex-col items-center px-6 py-16 text-center">
            <Trophy className="size-8 text-flame" strokeWidth={1.5} />
            <p className="mt-4 font-display text-3xl">No projects yet.</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">The first ones land right after the session. Yours could be at the top.</p>
            <Link href="/#register" className="mt-6 inline-flex items-center gap-2 font-semibold underline decoration-flame decoration-2 underline-offset-4">
              Save your seat <ArrowRight className="size-4" />
            </Link>
          </BlurFade>
        )}

        {proofs.length > 0 && (
          <section className="mt-12">
            <BlurFade className="flex items-baseline justify-between gap-4">
              <h2 className="text-3xl">From the 60-minute challenge</h2>
              <span className="label-mono text-muted-foreground">{proofs.length} shared</span>
            </BlurFade>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proofs.map((p, i) => (
                <BlurFade as="li" key={p.slug} delay={Math.min(i, 8) * 0.05}>
                  <Link href={`/proof/${p.slug}`} className="block h-full">
                    <SpotlightCard className="paper-card hard-sm flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-3">
                        {p.total !== null ? (
                          <p className="font-display text-5xl leading-none">
                            <NumberTicker value={p.total} />
                            <span className="text-lg text-muted-foreground">/100</span>
                          </p>
                        ) : (
                          <Trophy className="size-8 text-flame" strokeWidth={1.5} />
                        )}
                        {p.minutes && (
                          <Badge className="bg-card">
                            <Timer className="size-3" /> {p.minutes} min
                          </Badge>
                        )}
                      </div>
                      <p className="mt-4 font-display text-xl leading-snug">{p.title}</p>
                      <p className="label-mono mt-auto pt-4 text-muted-foreground">
                        {p.name} · {p.college}
                      </p>
                    </SpotlightCard>
                  </Link>
                </BlurFade>
              ))}
            </ul>
          </section>
        )}

        {items.length > 0 && (
          <section className="mt-14">
            <BlurFade className="flex items-baseline justify-between gap-4">
              <h2 className="text-3xl">Submitted projects</h2>
              <span className="label-mono text-muted-foreground">ranked by score</span>
            </BlurFade>
            <ol className="mt-5 grid gap-5 sm:grid-cols-2">
              {items.map((p, i) => (
                <BlurFade as="li" key={p.id} delay={Math.min(i, 8) * 0.05}>
                  <SpotlightCard className="paper-card hard-sm flex h-full flex-col p-5">
                    <div className="flex items-start justify-between">
                      <p className="font-display text-5xl leading-none">
                        <NumberTicker value={p.total} />
                        <span className="text-lg text-muted-foreground">/100</span>
                      </p>
                      <Badge className={i === 0 ? "bg-marker" : "bg-card"}>#{i + 1}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed">{p.description}</p>
                    <p className="label-mono mt-4 text-muted-foreground">by {p.name}</p>
                    <div className="mt-auto flex flex-wrap gap-3 pt-4 text-sm font-semibold">
                      <a href={p.projectUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline decoration-flame decoration-2 underline-offset-4">
                        <ExternalLink className="size-4" /> {host(p.projectUrl)}
                      </a>
                      {p.repoUrl && (
                        <a href={p.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:text-flame">
                          <Code2 className="size-4" /> Code
                        </a>
                      )}
                    </div>
                  </SpotlightCard>
                </BlurFade>
              ))}
            </ol>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
