import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";
import { attemptDetailAdmin } from "@/db/challenge";
import { AdminNav } from "@/components/admin/admin-nav";
import { Markdown } from "@/components/site/markdown";
import { RescoreButton } from "@/components/admin/rescore-button";
import { ReviewPanel } from "@/components/admin/review-panel";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const kb = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (d: Date | null) => (d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-ink/15 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="label-mono text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

const Ext = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer nofollow"
    className="inline-flex max-w-full items-center gap-1.5 break-all font-mono text-sm underline decoration-flame decoration-2 underline-offset-4"
  >
    {href} <ExternalLink className="size-3.5 shrink-0" />
  </a>
);

const none = <span className="text-muted-foreground">—</span>;

export default async function SubmissionDetail({ params }: PageProps<"/admin/submissions/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await attemptDetailAdmin(id);
  if (!d) notFound();
  const { student: st, assessment: a, submission: s, attempt } = d;
  const lines = (s?.feedback ?? "").split("\n").filter(Boolean);
  const finalTotal = s ? (s.humanTotal ?? s.total) : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <AdminNav active="/admin/submissions" />
      <Link href="/admin/submissions" className="label-mono mt-6 inline-flex items-center gap-1 text-muted-foreground hover:text-flame">
        <ArrowLeft className="size-3.5" /> All submissions
      </Link>
      <h1 className="mt-4 text-5xl leading-tight">{st.name}</h1>
      <p className="mt-1 text-muted-foreground">{st.college}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="paper-card p-5">
          <h2 className="text-2xl">Student</h2>
          <dl className="mt-2">
            <Item label="Email">
              <a className="underline" href={`mailto:${st.email}`}>
                {st.email}
              </a>
            </Item>
            <Item label="WhatsApp">{st.whatsapp}</Item>
            <Item label="Branch · year">
              {st.branch} · {st.year}
            </Item>
            <Item label="Shared via">{d.shares.length ? d.shares.map((x) => `${x.channel} ×${x.n}`).join(", ") : "nothing yet"}</Item>
          </dl>
        </section>

        <section className="paper-card p-5">
          <h2 className="text-2xl">Timing</h2>
          <dl className="mt-2">
            <Item label="Started">{when(attempt.startedAt)}</Item>
            <Item label="Deadline">{when(attempt.deadlineAt)}</Item>
            <Item label="Submitted">
              {attempt.submittedAt
                ? `${when(attempt.submittedAt)} (${Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000))} min in)`
                : "Not submitted"}
            </Item>
            <Item label="Challenge">
              <Link className="underline" href={`/admin/assessments/${a.id}`}>
                {a.title}
              </Link>
            </Item>
          </dl>
        </section>
      </div>

      <section className="paper-card mt-6 p-5">
        <h2 className="text-2xl">What they submitted</h2>
        {!s ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing submitted.</p>
        ) : (
          <dl className="mt-2">
            <Item label="GitHub repo">{s.repoUrl ? <Ext href={s.repoUrl} /> : none}</Item>
            <Item label="Zip">
              {d.zip ? (
                <a
                  href={`/admin/files/${d.zip.id}`}
                  className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-ink bg-secondary px-3 py-1.5 font-semibold hover:bg-marker hover:text-[#16120e]"
                >
                  <Download className="size-4" /> {d.zip.filename} <span className="font-normal opacity-70">({kb(d.zip.size)})</span>
                </a>
              ) : (
                none
              )}
            </Item>
            <Item label="Hosted link">{s.hostedUrl ? <Ext href={s.hostedUrl} /> : none}</Item>
            <Item label="Video">
              <div className="space-y-3">
                {s.videoUrl ? <Ext href={s.videoUrl} /> : null}
                {d.videoFile ? (
                  <div>
                    <video controls preload="metadata" className="w-full max-w-xl rounded-md border-[1.5px] border-ink bg-black" src={`/admin/files/${d.videoFile.id}`} />
                    <p className="label-mono mt-1 text-muted-foreground">
                      {d.videoFile.filename} · {kb(d.videoFile.size)}
                    </p>
                  </div>
                ) : null}
                {!s.videoUrl && !d.videoFile && none}
              </div>
            </Item>
            <Item label="Notes">{s.notes ? <p className="whitespace-pre-wrap">{s.notes}</p> : none}</Item>
          </dl>
        )}
      </section>

      {s && (
        <section className="paper-card hard-flame mt-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl">Score</h2>
              {finalTotal !== null ? (
                <div>
                  <p className="font-display text-6xl leading-none">
                    {finalTotal}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </p>
                  {s.humanTotal !== null && s.total !== null && (
                    <p className="label-mono mt-1 text-muted-foreground">AI said {s.total} · a person set {s.humanTotal}</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{s.scoreError ? `Scoring failed: ${s.scoreError}` : "Not scored yet."}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {s.humanTotal !== null && <Badge className="bg-moss text-white">Human-checked</Badge>}
              {s.needsReview && s.humanTotal === null && <Badge className="bg-destructive text-white">Needs review</Badge>}
              {s.scoreMode && <Badge className={s.scoreMode === "ai" ? "bg-marker" : "bg-card"}>{s.scoreMode === "ai" ? "AI reviewed" : "Basic check"}</Badge>}
              <RescoreButton submissionId={s.id} />
            </div>
          </div>
          {(s.scores || s.humanScores) && (
            <div className="mt-5">
              <ReviewPanel
                submissionId={s.id}
                reviews={s.reviews ?? []}
                consensus={s.scores}
                needsReview={s.needsReview}
                human={s.humanTotal !== null && s.humanScores ? { scores: s.humanScores, total: s.humanTotal, note: s.humanNote, at: s.humanAt ? s.humanAt.toISOString() : null } : null}
              />
            </div>
          )}
          {lines.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-ink/20 pt-4 text-sm">
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
          )}
          {s.scoreModel && (
            <p className="label-mono mt-4 text-muted-foreground">
              Scored by {s.scoreModel}
              {s.scoredAt ? ` · ${when(s.scoredAt)}` : ""}
            </p>
          )}
        </section>
      )}

      <details className="paper-card mt-6 p-5">
        <summary className="cursor-pointer font-display text-2xl">The question they were given</summary>
        <div className="mt-4">
          <Markdown>{a.brief}</Markdown>
        </div>
      </details>
    </main>
  );
}
