import Link from "next/link";
import { ExternalLink, Code2 } from "lucide-react";
import { allEvaluations } from "@/lib/db";
import { firstNameInitial } from "@/lib/stats";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project gallery — Build60" };

export default async function Gallery() {
  const items = (await allEvaluations()).slice(0, 30);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <p className="label-mono text-flame">Built in 60 minutes</p>
        <h1 className="mt-2 text-5xl md:text-6xl">The gallery.</h1>
        <p className="mt-3 max-w-xl text-ink/75">
          Projects from workshop attendees, ranked by score. Built something? <Link href="/evaluate" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">Submit yours.</Link>
        </p>

        {items.length === 0 ? (
          <div className="paper-card mt-10 p-10 text-center text-muted-foreground">
            No projects yet. The first ones land right after the session.
          </div>
        ) : (
          <ol className="mt-10 grid gap-5 sm:grid-cols-2">
            {items.map((p, i) => {
              let host = p.project_url;
              try {
                host = new URL(p.project_url).hostname;
              } catch {}
              return (
                <li key={p.id} className="paper-card hard-sm flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <span className="font-display text-5xl leading-none">{p.total}</span>
                    <Badge className={i === 0 ? "bg-marker" : "bg-card"}>#{i + 1}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed">{p.description}</p>
                  <p className="label-mono mt-4 text-muted-foreground">by {firstNameInitial(p.name)}</p>
                  <div className="mt-auto flex gap-3 pt-4 text-sm font-semibold">
                    <a href={p.project_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline decoration-flame decoration-2 underline-offset-4">
                      <ExternalLink className="size-4" /> {host}
                    </a>
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1">
                        <Code2 className="size-4" /> Code
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
