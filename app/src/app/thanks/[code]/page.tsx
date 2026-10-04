import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Check, Download, Gift, MessageCircle, Trophy } from "lucide-react";
import { getRegistrationView } from "@/db/queries";
import { getAttempt, getPolicy, getStudentByToken } from "@/db/challenge";
import { getStudentToken } from "@/lib/student-session";
import { getOrigin } from "@/lib/origin";
import { getCampaign } from "@/db/campaign";
import { googleCalendarUrl } from "@/lib/calendar";
import { REWARD_TIERS, TOP_PRIZES, WORKSHOP, nextReward } from "@/lib/constants";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { ShareConfetti } from "@/components/site/share-panel";
import { ShareHub, type ChallengeState } from "@/components/site/share-hub";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/fx/blur-fade";
import { NumberTicker } from "@/components/fx/number-ticker";
import { ProgressBar } from "@/components/fx/progress-bar";

export const dynamic = "force-dynamic";

export default async function Thanks({ params, searchParams }: PageProps<"/thanks/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  const again = sp.again === "1";

  const me = await getRegistrationView(code);
  if (!me) notFound();
  const mine = me.friends;
  const rank = me.rank;
  const collegeCount = me.collegeCount;

  // The referral code is public, so only the person whose cookie matches gets share + challenge controls.
  const student = await getStudentByToken(await getStudentToken());
  const isOwner = student?.refCode === me.refCode;
  let state: ChallengeState = "none";
  let minutes = (await getPolicy()).durationMinutes;
  if (isOwner) {
    const attempt = await getAttempt(student!.id);
    if (attempt) {
      state = attempt.status === "running" ? "running" : attempt.status === "submitted" ? "submitted" : "expired";
      minutes = attempt.assessment.durationMinutes;
    }
  }

  const [origin, campaign] = await Promise.all([getOrigin(), getCampaign()]);
  const group = campaign.whatsappGroupUrl;
  const when = new Date(campaign.startsAt).toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const calendarUrl = googleCalendarUrl({
    title: WORKSHOP.title,
    start: new Date(campaign.startsAt),
    minutes: WORKSHOP.durationMinutes,
    details: "Free live workshop by NxtWave. Bring a laptop. The joining link is shared before the session.",
    url: group ?? origin,
  });
  const upcoming = nextReward(mine);
  const link = `${origin}/?ref=${me.refCode}`;
  const firstName = me.name.split(/\s+/)[0];
  const message = `I just registered for a free workshop — "Build Your First AI Project in 60 Minutes". You end up with a deployed project for your resume. Seats are limited, register here:`;

  return (
    <>
      <SiteHeader />
      <ShareConfetti enabled={!again && isOwner} />
      <main className="mx-auto max-w-2xl px-5 py-12 md:py-16">
        <div className="rise">
        <Badge className="bg-marker">{again ? "Already registered" : "You're in"}</Badge>
        <h1 className="mt-5 text-5xl leading-[1] md:text-6xl">
          {again ? `Welcome back, ${firstName}.` : `Seat saved, ${firstName}.`}
        </h1>
        </div>
        <p className="rise mt-4 text-lg text-ink/80" style={{ "--d": "0.08s" } as React.CSSProperties}>
          {when} IST.{" "}
          {group
            ? "The joining link and reminders go out in the workshop WhatsApp group — join it now so you don't miss them."
            : "Add it to your calendar so your phone reminds you. The joining link is shared before the session."}
        </p>

        {isOwner && (
          <section className="rise paper-card hard-sm mt-6 p-5" style={{ "--d": "0.14s" } as React.CSSProperties}>
            <p className="label-mono text-flame">Don&apos;t miss it</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {group && (
                <a
                  href={group}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-ink bg-[#25D366] px-4 font-semibold text-[#0b2e17] transition-transform hover:-translate-y-0.5"
                >
                  <MessageCircle className="size-4" /> Join the WhatsApp group
                </a>
              )}
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-ink bg-card px-4 font-semibold transition-transform hover:-translate-y-0.5"
              >
                <CalendarPlus className="size-4" /> Google Calendar
              </a>
              <a
                href="/workshop.ics"
                className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-ink bg-card px-4 font-semibold transition-transform hover:-translate-y-0.5"
              >
                <Download className="size-4" /> Apple / Outlook (.ics)
              </a>
            </div>
          </section>
        )}

        <section className="rise paper-card hard mt-10 p-6 sm:p-8" style={{ "--d": "0.2s" } as React.CSSProperties}>
          <p className="label-mono text-flame">Your personal link</p>
          <h2 className="mt-1 mb-5 text-3xl">Bring three friends. Put your college on top.</h2>
          {isOwner ? (
            <>
              <ShareHub link={link} text={message} state={state} minutes={minutes} refCode={me.refCode} />
              <p className="mt-4 text-sm text-muted-foreground">
                Post it in your class group, your hostel group and one coding group. That is usually where it spreads.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This is {firstName}&apos;s page. To get your own link and take the challenge, <Link href="/#register" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">register here</Link>
              {again ? " — or, if that was you, use the same email and WhatsApp number you registered with." : "."}
            </p>
          )}
        </section>

        <section className="mt-6 grid grid-cols-3 gap-3">
          {[
            { k: "Friends joined", v: mine as number | null, text: null },
            { k: "Your rank", v: rank, text: rank ? null : "—", prefix: "#" },
            { k: `${me.college.length > 14 ? "Your college" : me.college}`, v: collegeCount as number | null, text: null },
          ].map((s, i) => (
            <BlurFade key={s.k} delay={i * 0.06} className="paper-card hard-sm p-4">
              <p className="font-display text-4xl leading-none">
                {s.text ?? (
                  <>
                    {s.prefix}
                    <NumberTicker value={s.v ?? 0} delay={0.1 + i * 0.08} />
                  </>
                )}
              </p>
              <p className="label-mono mt-2 line-clamp-2 text-muted-foreground">{s.k}</p>
            </BlurFade>
          ))}
        </section>

        {isOwner && (
          <BlurFade as="section" className="paper-card mt-6 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-flame" />
              <h2 className="text-2xl">What your friends unlock</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {upcoming
                ? `${upcoming.needed} more ${upcoming.needed === 1 ? "friend" : "friends"} to unlock ${upcoming.tier.title}.`
                : "Every tier unlocked. Now go for the top three."}{" "}
              A friend counts once they register through your link.
            </p>
            <ProgressBar value={mine} max={REWARD_TIERS[REWARD_TIERS.length - 1].friends} marks={REWARD_TIERS.map((t) => t.friends)} className="mt-4" />
            <ul className="mt-4 space-y-3">
              {REWARD_TIERS.map((t) => {
                const done = mine >= t.friends;
                return (
                  <li key={t.friends} className="flex gap-3">
                    <span
                      className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink font-mono text-xs ${done ? "bg-marker text-[#16120e]" : "bg-card"}`}
                    >
                      {done ? <Check className="size-3.5" /> : t.friends}
                    </span>
                    <span>
                      <span className="font-semibold">{t.title}</span>{" "}
                      <span className="text-sm text-muted-foreground">
                        · {t.friends} {t.friends === 1 ? "friend" : "friends"} — {t.detail}
                      </span>
                    </span>
                  </li>
                );
              })}
              <li className="flex gap-3 border-t border-ink/15 pt-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink bg-flame text-white">
                  <Trophy className="size-3.5" />
                </span>
                <span>
                  <span className="font-semibold">{TOP_PRIZES.title}</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    · {TOP_PRIZES.amounts.join(" / ")} — {TOP_PRIZES.detail}
                    {rank ? ` You're #${rank} right now.` : ""}
                  </span>
                </span>
              </li>
            </ul>
          </BlurFade>
        )}

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/leaderboard" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">
            See the leaderboard
          </Link>
          <span className="text-muted-foreground">Your code: </span>
          <code className="font-mono font-medium">{me.refCode}</code>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
