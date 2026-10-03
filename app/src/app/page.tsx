import Link from "next/link";
import { CalendarDays, Clock, Gift, Laptop, Trophy } from "lucide-react";
import { getCount, latestSignup, listColleges, topColleges } from "@/db/queries";
import { TARGET, WORKSHOP } from "@/lib/constants";
import { RegisterForm } from "@/components/site/register-form";
import { SeatMeter } from "@/components/site/seat-meter";
import { CollegeMarquee } from "@/components/site/college-marquee";
import { Faq } from "@/components/site/faq";
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

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const ref = first(sp.ref);
  const src = first(sp.src);

  const [claimed, latest, marquee, collegeOptions] = await Promise.all([getCount(), latestSignup(), topColleges(24), listColleges()]);
  const colleges = marquee.map((c) => c.name);
  const when = new Date(WORKSHOP.startsAt).toLocaleString("en-IN", {
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
              <RegisterForm refCode={ref} source={src} colleges={collegeOptions} />
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
