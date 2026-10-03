import Link from "next/link";
import { CheckCircle2, Clock, Hourglass, Lock } from "lucide-react";
import { GRACE_MS, getAttempt, getPolicy, getStudentByToken } from "@/db/challenge";
import { getStudentToken } from "@/lib/student-session";
import { MAX_UPLOAD_MB } from "@/lib/uploads";
import { CHALLENGE_RUBRIC } from "@/lib/rubric";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Markdown } from "@/components/site/markdown";
import { Badge } from "@/components/ui/badge";
import { Runner } from "@/components/challenge/runner";
import { StartButton } from "@/components/challenge/start-button";
import { RecoverForm } from "@/components/challenge/recover-form";
import { ScoreWatcher } from "@/components/challenge/score-watcher";
import { ProofShare } from "@/components/challenge/proof-share";
import { getOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your challenge — Build60", robots: { index: false } };

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className={`mx-auto px-5 py-10 md:py-14 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>{children}</main>
      <SiteFooter />
    </>
  );
}

export default async function ChallengePage() {
  const student = await getStudentByToken(await getStudentToken());

  // 1 — not recognised on this browser
  if (!student) {
    return (
      <Shell>
        <Badge className="bg-card">
          <Lock className="size-3" /> Private
        </Badge>
        <h1 className="mt-4 text-5xl md:text-6xl">Find your challenge.</h1>
        <p className="mt-3 text-ink/75">
          Your challenge belongs to you, so this browser needs to know who you are. Enter the email and WhatsApp number you registered with — both have to match.
        </p>
        <div className="paper-card hard mt-8 p-6">
          <RecoverForm />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Not registered yet?{" "}
          <Link href="/#register" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">
            Save your seat
          </Link>
        </p>
      </Shell>
    );
  }

  const [attempt, policy] = await Promise.all([getAttempt(student.id), getPolicy()]);
  const first = student.name.split(/\s+/)[0];

  // 2 — registered, hasn't started
  if (!attempt) {
    return (
      <Shell>
        <Badge className="bg-marker">Ready when you are</Badge>
        <h1 className="mt-4 text-5xl md:text-6xl">Hi {first}. Ready to build?</h1>
        <div className="paper-card hard mt-8 space-y-4 p-6">
          <ul className="space-y-3 text-[0.95rem]">
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-flame" />
              <span>
                You&apos;ll get one challenge and <strong>{policy.durationMinutes} minutes</strong>. The clock starts the moment you press the button and can&apos;t be paused.
              </span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-flame" />
              <span>You&apos;ll submit your code (a GitHub link or a zip), and sometimes a hosted link or a short video — the challenge tells you exactly what.</span>
            </li>
            <li className="flex gap-3">
              <Hourglass className="mt-0.5 size-5 shrink-0 text-flame" />
              <span>Use any tools you like, AI included. Have your laptop, a stable connection and your accounts ready first.</span>
            </li>
          </ul>
          <div className="pt-2">
            <StartButton minutes={policy.durationMinutes} />
          </div>
        </div>
      </Shell>
    );
  }

  // 3 — submitted: confirmation + score
  if (attempt.status === "submitted" && attempt.submission) {
    const s = attempt.submission;
    const scored = s.total !== null;
    const lines = (s.feedback ?? "").split("\n").filter(Boolean);
    return (
      <Shell>
        <Badge className="bg-marker">
          <CheckCircle2 className="size-3" /> Submitted
        </Badge>
        <h1 className="mt-4 text-5xl md:text-6xl">Nicely done, {first}.</h1>
        <p className="mt-3 text-ink/75">
          Your work for <strong>{attempt.assessment.title}</strong> is in. {scored ? "It has been scored." : "It's being scored now."}
        </p>

        <section className="paper-card mt-8 p-6">
          <p className="label-mono text-flame">What you submitted</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {s.repoUrl && <li>Repo: <span className="break-all font-mono">{s.repoUrl}</span></li>}
            {s.zipName && <li>Zip: <span className="font-mono">{s.zipName}</span></li>}
            {s.hostedUrl && <li>Hosted: <span className="break-all font-mono">{s.hostedUrl}</span></li>}
            {s.videoUrl && <li>Video: <span className="break-all font-mono">{s.videoUrl}</span></li>}
            {s.videoFileName && <li>Video file: <span className="font-mono">{s.videoFileName}</span></li>}
            {s.notes && <li className="pt-1 text-muted-foreground">&ldquo;{s.notes}&rdquo;</li>}
          </ul>
        </section>

        {!policy.showScores ? (
          <p className="paper-card mt-6 p-5 text-sm text-muted-foreground">Results will be shared by the organisers.</p>
        ) : scored ? (
          <section className="paper-card hard-flame mt-6 p-6" aria-live="polite">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-mono text-flame">Your score</p>
                <p className="font-display text-7xl leading-none">
                  {s.total}
                  <span className="text-3xl text-muted-foreground">/100</span>
                </p>
              </div>
              <Badge className={s.scoreMode === "ai" ? "bg-marker" : "bg-card"}>{s.scoreMode === "ai" ? "AI reviewed" : "Basic check"}</Badge>
            </div>
            <ul className="mt-6 space-y-3">
              {CHALLENGE_RUBRIC.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="font-mono">{s.scores?.[c.key] ?? 0}/20</span>
                  </div>
                  <div className="mt-1 h-2.5 border-[1.5px] border-ink bg-card">
                    <div className="h-full bg-flame" style={{ width: `${((s.scores?.[c.key] ?? 0) / 20) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-ink/20 pt-4 text-sm">
              {lines.map((line, i) =>
                line.startsWith("- ") ? (
                  <p key={i} className="flex gap-2">
                    <span className="text-flame">→</span>
                    {line.slice(2)}
                  </p>
                ) : (
                  <p key={i} className="font-display text-xl leading-snug">
                    {line}
                  </p>
                ),
              )}
            </div>
            <div className="mt-6 border-t border-ink/20 pt-5">
              <p className="label-mono mb-3 text-flame">Share your result</p>
              <ProofShare origin={await getOrigin()} initialSlug={s.shareSlug} title={attempt.assessment.title} minutes={attempt.submittedAt ? Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000)) : null} />
            </div>
          </section>
        ) : s.scoreError ? (
          <p className="paper-card mt-6 p-5 text-sm">Automatic scoring hit a problem, so a person will review your work. You don&apos;t need to do anything.</p>
        ) : (
          <>
            <ScoreWatcher />
            <p className="paper-card mt-6 flex items-center gap-3 p-5 text-sm" aria-live="polite">
              <span className="size-3 animate-pulse rounded-full bg-flame" /> Scoring your work. This page updates by itself.
            </p>
          </>
        )}
      </Shell>
    );
  }

  // 4 — ran out of time
  if (attempt.status === "expired" || attempt.status === "submitted") {
    return (
      <Shell>
        <Badge className="bg-card">
          <Hourglass className="size-3" /> Time&apos;s up
        </Badge>
        <h1 className="mt-4 text-5xl md:text-6xl">The timer ran out.</h1>
        <p className="mt-3 text-ink/75">The submission window closed before anything was submitted, so there&apos;s nothing to score. If something went wrong on our side, reply to the organisers on WhatsApp.</p>
      </Shell>
    );
  }

  // 5 — running
  return (
    <Shell wide>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge className="bg-flame text-white">Live</Badge>
        <h1 className="text-4xl leading-none md:text-5xl">{attempt.assessment.title}</h1>
      </div>
      <Runner
        deadlineAt={attempt.deadlineAt.toISOString()}
        serverNow={new Date().toISOString()}
        graceSeconds={GRACE_MS / 1000}
        requirements={attempt.assessment.requirements}
        maxUploadMb={MAX_UPLOAD_MB}
        attachment={attempt.assessment.attachment ? { id: attempt.assessment.attachment.id, filename: attempt.assessment.attachment.filename } : null}
      >
        <Markdown>{attempt.assessment.brief}</Markdown>
      </Runner>
    </Shell>
  );
}
