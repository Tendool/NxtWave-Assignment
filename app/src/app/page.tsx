import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock, FileText, Gift, Globe, Share2, Sparkles, Trophy } from "lucide-react";
import { collegeCount, getCount, getPublicCardData, latestSignup, topColleges, topEvaluations } from "@/db/queries";
import { getCampaign } from "@/db/campaign";
import { getOrigin } from "@/lib/origin";
import { HOST, REWARD_TIERS, TARGET, TOP_PRIZES } from "@/lib/constants";
import { RegisterForm } from "@/components/site/register-form";
import { SeatMeter } from "@/components/site/seat-meter";
import { CollegeMarquee } from "@/components/site/college-marquee";
import { Faq } from "@/components/site/faq";
import { VisitBeacon } from "@/components/site/visit-beacon";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { BlurFade } from "@/components/fx/blur-fade";
import { BorderBeam, Shine } from "@/components/fx/border-beam";
import { HeroOrb } from "@/components/fx/hero-orb";
import { NumberTicker } from "@/components/fx/number-ticker";
import { SpotlightCard } from "@/components/fx/spotlight-card";
import { WordRotate } from "@/components/fx/word-rotate";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const STEPS = [
  { t: "00–10", h: "Pick your idea", p: "Choose from five starter ideas — a resume screener, a notes summariser, a doubt-solver bot and two more. Or bring your own." },
  { t: "10–40", h: "Build it, live", p: "We build alongside you using an AI coding assistant. You write the prompts, read the code and fix what breaks." },
  { t: "40–55", h: "Put it on the internet", p: "Deploy to a public link anyone can open — the part most college projects never get to." },
  { t: "55–60", h: "Submit and get scored", p: "Drop your link in. You get written feedback, and the best builds are featured on the gallery." },
];

const IDEAS = ["resume screener", "notes summariser", "doubt-solver bot", "interview coach", "study planner"];

/** A shared link unfurls into a card with the sharer's first name and college. No pronouns: a first name is all we know. */
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const ref = first((await searchParams).ref);
  const valid = ref && /^[A-Za-z0-9-]{3,20}$/.test(ref) ? ref.toUpperCase() : null;
  const who = valid ? await getPublicCardData(valid) : null;
  const origin = await getOrigin();
  const title = who ? `${who.firstName} from ${who.college} is building a first AI project — join the free workshop` : "Build Your First AI Project in 60 Minutes — Free Workshop";
  const description = "A free live workshop for final-year engineering students. Walk out with a deployed AI project you can put on your resume.";
  const image = `${origin}/og/ref/${encodeURIComponent(valid ?? "default")}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function SectionHead({ kicker, title, className }: { kicker: string; title: string; className?: string }) {
  return (
    <BlurFade className={className}>
      <p className="label-mono text-flame">{kicker}</p>
      <h2 className="mt-2 max-w-2xl text-4xl md:text-5xl">{title}</h2>
    </BlurFade>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const ref = first(sp.ref);
  const src = first(sp.src);

  const [claimed, latest, marquee, campaign, builds, colleges] = await Promise.all([
    getCount(),
    latestSignup(),
    topColleges(24),
    getCampaign(),
    topEvaluations(3),
    collegeCount(),
  ]);
  const when = new Date(campaign.startsAt).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const left = Math.max(0, TARGET - claimed);

  return (
    <>
      <SiteHeader />
      <VisitBeacon source={src ?? null} referred={!!ref} />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <HeroOrb className="absolute top-[-20px] left-[calc(50%-560px)] z-0 hidden h-[640px] w-[640px] lg:block" />
          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            <div className="flex flex-col justify-center">
              <div className="rise flex flex-wrap items-center gap-2">
                <Badge className="bg-marker">
                  <span className="relative mr-0.5 flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-flame opacity-75 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-flame" />
                  </span>
                  Free live workshop
                </Badge>
                <Badge className="bg-card">
                  <Clock className="size-3" /> 60 min
                </Badge>
                <Badge className="bg-card">
                  <CalendarDays className="size-3" /> {when} IST
                </Badge>
              </div>

              <div className="rise" style={{ "--d": "0.05s" } as React.CSSProperties}>
                <h1 className="mt-6 text-[2.9rem] leading-[0.98] sm:text-6xl md:text-7xl">
                  Build your first <em className="text-flame">AI project</em> in <span className="hl">60&nbsp;minutes.</span>
                </h1>
              </div>

              <div className="rise" style={{ "--d": "0.1s" } as React.CSSProperties}>
                <p className="mt-6 font-display text-2xl leading-snug text-ink/90 md:text-3xl">
                  Yours could be a <WordRotate words={IDEAS} className="text-flame italic" />
                </p>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/75">
                  A live session for final-year engineering students. You bring a laptop. You leave with something deployed on a public link —
                  the kind of project that actually gets asked about in interviews.
                </p>
              </div>

              {ref && (
                <div className="rise" style={{ "--d": "0.15s" } as React.CSSProperties}>
                  <p className="paper-card hard-sm mt-6 inline-flex w-fit items-center gap-2 px-3 py-2 text-sm">
                    <span className="label-mono text-flame">Invited</span> A friend saved you a spot. Register to claim it.
                  </p>
                </div>
              )}

              <div className="rise mt-10 hidden lg:block" style={{ "--d": "0.2s" } as React.CSSProperties}>
                <SeatMeter claimed={claimed} target={TARGET} />
                {latest && (
                  <p className="label-mono mt-4 text-muted-foreground">
                    Latest: {latest.name} · {latest.college}
                  </p>
                )}
              </div>
            </div>

            {/* FORM */}
            <div className="rise" style={{ "--d": "0.1s" } as React.CSSProperties}>
              <div id="register" className="scroll-mt-20">
                <div className="paper-card hard relative p-5 sm:p-7">
                  <BorderBeam duration={10} size={180} />
                  <div className="mb-5 flex items-baseline justify-between">
                    <h2 className="text-3xl">Save your seat</h2>
                    <span className="label-mono text-muted-foreground">~30 sec</span>
                  </div>
                  <RegisterForm refCode={ref} source={src} />
                </div>
                <div className="mt-8 lg:hidden">
                  <SeatMeter claimed={claimed} target={TARGET} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <CollegeMarquee colleges={marquee.map((c) => c.name)} />

        {/* NUMBERS */}
        <section className="mx-auto max-w-6xl px-5 pt-16">
          <BlurFade>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-md border-[1.5px] border-ink bg-ink md:grid-cols-4">
            {[
              { v: claimed, k: "students registered" },
              { v: colleges, k: "colleges so far" },
              { v: 60, k: "minutes, start to deployed" },
              { v: 0, k: "rupees it costs you", prefix: "₹" },
            ].map((s, i) => (
              <li key={s.k} className="bg-card p-5 md:p-6">
                <p className="font-display text-5xl leading-none md:text-6xl">
                  {s.prefix}
                  <NumberTicker value={s.v} delay={i * 0.08} />
                </p>
                <p className="label-mono mt-2 text-muted-foreground">{s.k}</p>
              </li>
            ))}
          </ul>
          </BlurFade>
        </section>

        {/* THE 60 MINUTES */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead kicker="The session" title="Sixty minutes, four moves." />
          <div className="relative mt-10">
            {/* A minute ruler above the four steps, so the split of the hour is visible at a glance. */}
            <div className="mb-3 hidden grid-cols-[10fr_30fr_15fr_5fr] gap-2 md:grid" aria-hidden>
              {STEPS.map((s, i) => (
                <BlurFade key={s.t} delay={i * 0.08}>
                  <div className={cn("h-2 rounded-full border-[1.5px] border-ink", i === 1 ? "bg-flame" : i === 3 ? "bg-marker" : "bg-ink")} />
                </BlurFade>
              ))}
            </div>
            <ol className="grid gap-4 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <BlurFade as="li" key={s.t} delay={i * 0.08}>
                  <SpotlightCard className="paper-card hard-sm h-full p-6">
                    <div className="flex items-center justify-between">
                      <p className="label-mono text-muted-foreground">{s.t} min</p>
                      <span className="font-display text-4xl leading-none text-ink/15">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-3 text-2xl leading-tight">{s.h}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/75">{s.p}</p>
                  </SpotlightCard>
                </BlurFade>
              ))}
            </ol>
          </div>
        </section>

        {/* WHAT YOU'LL SHIP */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <BlurFade>
              <p className="label-mono text-flame">What you&apos;ll ship</p>
              <h2 className="mt-2 text-4xl md:text-5xl">Something real, on a link you own.</h2>
              <p className="mt-4 max-w-lg text-ink/75">
                Not a notebook nobody opens. A small tool another student can use: you paste something in, an AI model does the work, and it
                runs on a public URL with your name on the repo.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {["A live link you can put on your resume", "A GitHub repo with a proper README", "Code you wrote and can explain in an interview"].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Check className="size-4 text-flame" /> {x}
                  </li>
                ))}
              </ul>
            </BlurFade>

            {/* An illustration of a starter idea, labelled as one, so nobody mistakes it for a testimonial. */}
            <BlurFade delay={0.1}>
              <figure className="paper-card hard relative overflow-hidden transition-transform duration-300 hover:-rotate-[0.6deg]">
                <div className="flex items-center gap-2 border-b-[1.5px] border-ink bg-secondary/70 px-4 py-2.5">
                  <span className="size-2.5 rounded-full border border-ink bg-flame" />
                  <span className="size-2.5 rounded-full border border-ink bg-marker" />
                  <span className="size-2.5 rounded-full border border-ink bg-card" />
                  <span className="label-mono ml-2 truncate text-muted-foreground">your-name-notes.vercel.app</span>
                  <span className="label-mono ml-auto flex items-center gap-1 text-moss">
                    <span className="size-1.5 rounded-full bg-moss" /> live
                  </span>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="label-mono text-muted-foreground">Paste your lecture notes</p>
                    <div className="mt-2 h-36 overflow-hidden rounded-md border-[1.5px] border-ink/40 bg-card p-3 font-mono text-[11px] leading-relaxed text-ink/70">
                      Unit 3 — Normalisation. 1NF: atomic values, no repeating groups. 2NF: no partial dependency on a composite key. 3NF: no
                      transitive dependency. BCNF: every determinant is a candidate key…
                    </div>
                  </div>
                  <div>
                    <p className="label-mono flex items-center gap-1 text-flame">
                      <Sparkles className="size-3" /> AI summary
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm leading-snug">
                      <li>• 1NF: one value per cell</li>
                      <li>• 2NF: every column needs the whole key</li>
                      <li>• 3NF: columns depend only on the key</li>
                      <li className="pt-1 text-muted-foreground">+ 3 likely exam questions</li>
                    </ul>
                  </div>
                </div>
                <figcaption className="label-mono border-t-[1.5px] border-ink px-4 py-2 text-muted-foreground">
                  Example · the notes-summariser starter, one of five ideas
                </figcaption>
              </figure>
            </BlurFade>
          </div>

          {builds.length > 0 && (
            <div className="mt-14">
              <BlurFade className="flex items-baseline justify-between gap-4">
                <h3 className="text-2xl md:text-3xl">Built by attendees</h3>
                <Link href="/gallery" className="label-mono inline-flex items-center gap-1 hover:text-flame">
                  Gallery <ArrowRight className="size-3" />
                </Link>
              </BlurFade>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {builds.map((b, i) => (
                  <BlurFade as="li" key={b.id} delay={i * 0.06}>
                    <SpotlightCard className="paper-card hard-sm h-full p-4">
                      <p className="font-display text-4xl leading-none">
                        <NumberTicker value={b.total} />
                        <span className="text-lg text-muted-foreground">/100</span>
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm">{b.description}</p>
                      <p className="label-mono mt-3 text-muted-foreground">by {b.name}</p>
                    </SpotlightCard>
                  </BlurFade>
                ))}
              </ul>
            </div>
          )}

          {HOST.name && (
            <BlurFade className="paper-card mt-14 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              {HOST.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={HOST.photo} alt="" className="size-20 shrink-0 rounded-full border-[1.5px] border-ink object-cover" />
              )}
              <div>
                <p className="label-mono text-flame">Your host</p>
                <p className="mt-1 text-2xl">{HOST.name}</p>
                {HOST.role && <p className="label-mono mt-1 text-muted-foreground">{HOST.role}</p>}
                {HOST.line && <p className="mt-2 max-w-2xl text-ink/80">{HOST.line}</p>}
              </div>
            </BlurFade>
          )}
        </section>

        {/* WHAT YOU GET — bento */}
        <section className="border-y-[1.5px] border-ink bg-secondary/60">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <SectionHead kicker="What you walk away with" title="Proof, not a certificate of attendance." />
            <div className="mt-10 grid auto-rows-[minmax(150px,auto)] gap-4 md:grid-cols-3">
              <BlurFade className="md:col-span-2 md:row-span-2">
                <SpotlightCard className="paper-card hard flex h-full flex-col justify-between p-6" size={380}>
                  <div>
                    <Globe className="size-6 text-flame" strokeWidth={1.75} />
                    <h3 className="mt-4 text-3xl leading-tight">A deployed project</h3>
                    <p className="mt-2 max-w-md text-sm text-ink/75">A live link plus a GitHub repo you can open in an interview and walk someone through.</p>
                  </div>
                  <div className="mt-8 space-y-2 font-mono text-xs" aria-hidden>
                    {[
                      ["$ git push origin main", "text-ink/70"],
                      ["→ Building… done in 41s", "text-ink/70"],
                      ["→ Deployed to https://your-project.vercel.app", "text-moss"],
                      ["→ 200 OK · live for everyone", "text-flame"],
                    ].map(([line, cls], i) => (
                      <BlurFade key={line} delay={0.2 + i * 0.25} y={4}>
                        <p className={cn("rounded-sm border border-ink/15 bg-paper/70 px-3 py-1.5", cls)}>{line}</p>
                      </BlurFade>
                    ))}
                  </div>
                </SpotlightCard>
              </BlurFade>
              <BlurFade delay={0.08}>
                <SpotlightCard className="paper-card hard-sm h-full p-5">
                  <FileText className="size-6 text-flame" strokeWidth={1.75} />
                  <h3 className="mt-3 text-xl leading-tight">Resume-ready write-up</h3>
                  <p className="mt-1 text-sm text-ink/75">What you built and how, ready to paste.</p>
                </SpotlightCard>
              </BlurFade>
              <BlurFade delay={0.14}>
                <SpotlightCard className="paper-card hard-sm h-full p-5">
                  <Trophy className="size-6 text-flame" strokeWidth={1.75} />
                  <h3 className="mt-3 text-xl leading-tight">Feedback on your build</h3>
                  <div className="mt-3 space-y-1.5" aria-hidden>
                    {[82, 64, 90, 55, 73].map((w, i) => (
                      <div key={i} className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-flame" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </BlurFade>
              <BlurFade delay={0.2} className="md:col-span-3">
                <SpotlightCard className="paper-card hard-sm flex h-full flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Share2 className="size-6 shrink-0 text-flame" strokeWidth={1.75} />
                    <div>
                      <h3 className="text-xl leading-tight">A result card to share</h3>
                      <p className="text-sm text-ink/75">After the 60-minute challenge, one tap makes a card with your project and score for LinkedIn or Instagram.</p>
                    </div>
                  </div>
                  <span className="label-mono shrink-0 rounded-sm border-[1.5px] border-ink bg-marker px-2 py-1">Opt-in · nothing public until you share</span>
                </SpotlightCard>
              </BlurFade>
            </div>
          </div>
        </section>

        {/* REFERRAL CALLOUT */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <BlurFade>
            <div className="paper-card hard-flame grid items-center gap-6 bg-band p-8 text-band-fg md:grid-cols-[1fr_auto] md:p-12">
              <div>
                <p className="label-mono text-marker">College leaderboard</p>
                <h2 className="mt-2 text-3xl md:text-5xl">Which college shows up the most?</h2>
                <p className="mt-3 max-w-xl text-band-fg/75">
                  After you register you get a personal link. Every friend who registers through it counts for you — and for your college on
                  the board.
                </p>
                <ul className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                  {REWARD_TIERS.map((t) => (
                    <li key={t.friends} className="rounded-md border-[1.5px] border-band-fg/30 p-3 transition-colors hover:border-marker">
                      <p className="label-mono text-marker">
                        {t.friends} {t.friends === 1 ? "friend" : "friends"}
                      </p>
                      <p className="mt-1 font-semibold">{t.title}</p>
                      <p className="mt-1 text-xs text-band-fg/70">{t.detail}</p>
                    </li>
                  ))}
                  <li className="relative overflow-hidden rounded-md border-[1.5px] border-marker p-3">
                    <p className="label-mono flex items-center gap-1 text-marker">
                      <Gift className="size-3" /> {TOP_PRIZES.title}
                    </p>
                    <p className="mt-1 font-semibold">{TOP_PRIZES.amounts.join(" / ")}</p>
                    <p className="mt-1 text-xs text-band-fg/70">Amazon vouchers when registration closes.</p>
                  </li>
                </ul>
              </div>
              <Link
                href="/leaderboard"
                className="inline-flex h-12 items-center justify-center rounded-md border-[1.5px] border-band-fg bg-marker px-6 font-semibold transition-transform hover:-translate-y-0.5"
              >
                See the board
              </Link>
            </div>
          </BlurFade>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 pb-20">
          <SectionHead kicker="Questions" title="Before you register." className="mb-8" />
          <BlurFade delay={0.05}>
            <Faq />
          </BlurFade>
        </section>

        {/* LAST CALL */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <BlurFade>
            <div className="paper-card hard relative overflow-hidden p-8 text-center md:p-14">
              <BorderBeam duration={12} size={220} />
              <p className="label-mono text-flame">{left > 0 ? `${left} seats left` : "Full — join the waitlist"}</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-4xl md:text-6xl">One hour from now, you could have shipped something.</h2>
              <Link href="#register" className={cn(buttonVariants({ variant: "flame", size: "lg" }), "relative mt-8 overflow-hidden")}>
                <Shine />
                Save my free seat <ArrowRight />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">{when} IST · free · laptop required</p>
            </div>
          </BlurFade>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
