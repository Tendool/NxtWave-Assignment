import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock, Gift, Laptop, Sparkles, Trophy } from "lucide-react";
import { getCount, getPublicCardData, latestSignup, topColleges, topEvaluations } from "@/db/queries";
import { getCampaign } from "@/db/campaign";
import { getOrigin } from "@/lib/origin";
import { HOST, REWARD_TIERS, TARGET, TOP_PRIZES } from "@/lib/constants";
import { RegisterForm } from "@/components/site/register-form";
import { SeatMeter } from "@/components/site/seat-meter";
import { CollegeMarquee } from "@/components/site/college-marquee";
import { Faq } from "@/components/site/faq";
import { VisitBeacon } from "@/components/site/visit-beacon";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const STEPS = [
  { t: "00–10", h: "Pick your idea", p: "Choose from five starter ideas — a resume screener, a notes summariser, a doubt-solver bot and two more. Or bring your own." },
  { t: "10–40", h: "Build it, live", p: "We build alongside you using an AI coding assistant. You write the prompts, read the code and fix what breaks." },
  { t: "40–55", h: "Put it on the internet", p: "Deploy to a public link anyone can open — the part most college projects never get to." },
  { t: "55–60", h: "Submit and get scored", p: "Drop your link in. You get written feedback, and the best builds are featured on the gallery." },
];

const GETS = [
  { icon: Laptop, h: "A deployed project", p: "A live link plus a GitHub repo you can show in interviews." },
  { icon: Gift, h: "Resume-ready write-up", p: "A short description of what you built and how, ready to paste." },
  { icon: Trophy, h: "Feedback on your build", p: "Scored against a rubric so you know what to improve next." },
];

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

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const ref = first(sp.ref);
  const src = first(sp.src);

  const [claimed, latest, marquee, campaign, builds] = await Promise.all([getCount(), latestSignup(), topColleges(24), getCampaign(), topEvaluations(3)]);
  const colleges = marquee.map((c) => c.name);
  const when = new Date(campaign.startsAt).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <>
      <SiteHeader />
      <VisitBeacon source={src ?? null} referred={!!ref} />
      <main>
        {/* HERO */}
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-marker">Free live workshop</Badge>
              <Badge className="bg-card">
                <Clock className="size-3" /> 60 min
              </Badge>
              <Badge className="bg-card">
                <CalendarDays className="size-3" /> {when} IST
              </Badge>
            </div>

            <h1 className="mt-6 text-[2.9rem] leading-[0.98] sm:text-6xl md:text-7xl">
              Build your first <em className="text-flame">AI project</em> in <span className="hl">60&nbsp;minutes.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
              A live session for final-year engineering students. You bring a laptop. You leave with something deployed
              on a public link — the kind of project that actually gets asked about in interviews.
            </p>

            {ref && (
              <p className="paper-card hard-sm mt-6 inline-flex w-fit items-center gap-2 px-3 py-2 text-sm">
                <span className="label-mono text-flame">Invited</span> A friend saved you a spot. Register to claim it.
              </p>
            )}

            <div className="mt-10 hidden lg:block">
              <SeatMeter claimed={claimed} target={TARGET} />
              {latest && (
                <p className="label-mono mt-4 text-muted-foreground">
                  Latest: {latest.name} · {latest.college}
                </p>
              )}
            </div>
          </div>

          {/* FORM */}
          <div id="register" className="scroll-mt-6">
            <div className="paper-card hard p-5 sm:p-7">
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
        </section>

        <CollegeMarquee colleges={colleges} />

        {/* THE 60 MINUTES */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="label-mono text-flame">The session</p>
          <h2 className="mt-2 max-w-2xl text-4xl md:text-5xl">Sixty minutes, four moves.</h2>
          <ol className="mt-10 grid gap-0 border-[1.5px] border-ink bg-card md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.t}
                className={`p-6 ${i > 0 ? "border-t-[1.5px] border-ink md:border-t-0 md:border-l-[1.5px]" : ""}`}
              >
                <p className="label-mono text-muted-foreground">{s.t} min</p>
                <h3 className="mt-3 text-2xl leading-tight">{s.h}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">{s.p}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* WHAT YOU'LL SHIP */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="label-mono text-flame">What you&apos;ll ship</p>
              <h2 className="mt-2 text-4xl md:text-5xl">Something real, on a link you own.</h2>
              <p className="mt-4 max-w-lg text-ink/75">
                Not a notebook nobody opens. A small tool another student can use: you paste something in, an AI model
                does the work, and it runs on a public URL with your name on the repo.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {["A live link you can put on your resume", "A GitHub repo with a proper README", "Code you wrote and can explain in an interview"].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Check className="size-4 text-flame" /> {x}
                  </li>
                ))}
              </ul>
            </div>

            {/* An illustration of a starter idea, labelled as one, so nobody mistakes it for a testimonial. */}
            <figure className="paper-card hard overflow-hidden">
              <div className="flex items-center gap-2 border-b-[1.5px] border-ink bg-secondary/70 px-4 py-2.5">
                <span className="size-2.5 rounded-full border border-ink bg-flame" />
                <span className="size-2.5 rounded-full border border-ink bg-marker" />
                <span className="size-2.5 rounded-full border border-ink bg-card" />
                <span className="label-mono ml-2 truncate text-muted-foreground">your-name-notes.vercel.app</span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div>
                  <p className="label-mono text-muted-foreground">Paste your lecture notes</p>
                  <div className="mt-2 h-36 overflow-hidden rounded-md border-[1.5px] border-ink/40 bg-card p-3 font-mono text-[11px] leading-relaxed text-ink/70">
                    Unit 3 — Normalisation. 1NF: atomic values, no repeating groups. 2NF: no partial dependency on a
                    composite key. 3NF: no transitive dependency. BCNF: every determinant is a candidate key…
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
          </div>

          {builds.length > 0 && (
            <div className="mt-14">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-2xl md:text-3xl">Built by attendees</h3>
                <Link href="/gallery" className="label-mono inline-flex items-center gap-1 hover:text-flame">
                  Gallery <ArrowRight className="size-3" />
                </Link>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {builds.map((b) => (
                  <li key={b.id} className="paper-card hard-sm p-4">
                    <p className="font-display text-3xl leading-none">{b.total}</p>
                    <p className="mt-2 line-clamp-2 text-sm">{b.description}</p>
                    <p className="label-mono mt-3 text-muted-foreground">by {b.name}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {HOST.name && (
            <div className="paper-card mt-14 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
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
            </div>
          )}
        </section>

        {/* WHAT YOU GET */}
        <section className="border-y-[1.5px] border-ink bg-secondary/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="label-mono text-flame">What you walk away with</p>
              <h2 className="mt-2 text-4xl md:text-5xl">Proof, not a certificate of attendance.</h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {GETS.map(({ icon: Icon, h, p }) => (
                <li key={h} className="paper-card hard-sm p-5">
                  <Icon className="size-6 text-flame" strokeWidth={1.75} />
                  <h3 className="mt-4 text-xl leading-tight">{h}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* REFERRAL CALLOUT */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="paper-card hard-flame grid items-center gap-6 bg-band p-8 text-band-fg md:grid-cols-[1fr_auto] md:p-12">
            <div>
              <p className="label-mono text-marker">College leaderboard</p>
              <h2 className="mt-2 text-3xl md:text-5xl">Which college shows up the most?</h2>
              <p className="mt-3 max-w-xl text-band-fg/75">
                After you register you get a personal link. Every friend who registers through it counts for you — and
                for your college on the board.
              </p>
              <ul className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                {REWARD_TIERS.map((t) => (
                  <li key={t.friends} className="rounded-md border-[1.5px] border-band-fg/30 p-3">
                    <p className="label-mono text-marker">
                      {t.friends} {t.friends === 1 ? "friend" : "friends"}
                    </p>
                    <p className="mt-1 font-semibold">{t.title}</p>
                    <p className="mt-1 text-xs text-band-fg/70">{t.detail}</p>
                  </li>
                ))}
                <li className="rounded-md border-[1.5px] border-marker p-3">
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
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 pb-24">
          <p className="label-mono text-flame">Questions</p>
          <h2 className="mt-2 mb-8 text-4xl md:text-5xl">Before you register.</h2>
          <Faq />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
