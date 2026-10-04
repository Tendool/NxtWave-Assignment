import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getProof } from "@/db/challenge";
import { getOrigin } from "@/lib/origin";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { buttonVariants } from "@/components/ui/button";
import { BorderBeam, Shine } from "@/components/fx/border-beam";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/proof/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProof(slug);
  if (!p) return { title: "Build60" };
  const origin = await getOrigin();
  // No pronouns: a first name is all we know.
  const title = `${p.firstName} shipped “${p.title}” in the 60-minute AI challenge`;
  const description = `${p.college} · Free workshop: build your first AI project in 60 minutes.`;
  const image = `${origin}/og/proof/${slug}`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProofPage({ params }: PageProps<"/proof/[slug]">) {
  const { slug } = await params;
  const p = await getProof(slug);
  if (!p) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 md:py-14">
        <div className="rise">
        <p className="label-mono text-flame">Proof of work</p>
        <h1 className="mt-2 text-4xl leading-tight md:text-5xl">
          {p.firstName} built <span className="hl">{p.title}</span>
          {p.minutes ? ` in ${p.minutes} minutes` : ""}.
        </h1>
        <p className="mt-3 text-muted-foreground">{p.college}</p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/og/proof/${slug}`} alt={`Result card: ${p.firstName} — ${p.title}`} className="rise paper-card hard mt-8 w-full transition-transform duration-500 hover:-rotate-1 hover:scale-[1.01]" style={{ "--d": "0.1s" } as React.CSSProperties} width={1200} height={630} />

        <div className="paper-card relative mt-8 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <BorderBeam duration={8} size={150} />
          <div>
            <p className="font-display text-3xl leading-none">Want one of these?</p>
            <p className="mt-1 text-sm text-muted-foreground">A free live workshop, then a 60-minute challenge. Build something real and put it on your resume.</p>
          </div>
          <Link href={`/?ref=${encodeURIComponent(p.refCode)}&src=proof`} className={`${buttonVariants({ variant: "flame", size: "lg" })} relative overflow-hidden`}>
            <Shine />
            Save your seat <ArrowRight />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
