import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";
import { scoresOverview } from "@/db/challenge";
import { CHALLENGE_RUBRIC } from "@/lib/rubric";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scores — Build60", robots: { index: false } };

export default async function ScoresPage() {
  await requireAdminPage();
  const { rows, byAssessment, calibration, reviewers } = await scoresOverview();
  const flagged = rows.filter((r) => r.needsReview && r.humanTotal === null).length;
  const scored = rows.filter((r) => r.total !== null);
  const totals = scored.map((r) => r.total as number).sort((a, b) => a - b);
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
  const median = totals.length ? totals[Math.floor(totals.length / 2)] : null;
  const spread = byAssessment.length > 1 ? Math.max(...byAssessment.map((b) => b.avg ?? 0)) - Math.min(...byAssessment.map((b) => b.avg ?? 0)) : 0;

  const cards = [
    { k: "Scored", v: scored.length, sub: rows.length > scored.length ? `${rows.length - scored.length} pending or failed` : "all done" },
    { k: "Average", v: avg ?? "—", sub: "" },
    { k: "Median", v: median ?? "—", sub: "" },
    { k: "Top score", v: totals.length ? totals[totals.length - 1] : "—", sub: "" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <AdminNav active="/admin/scores" />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono text-flame">Scores given by the AI reviewer</p>
          <h1 className="mt-1 text-5xl">Scores</h1>
        </div>
        <a href="/admin/scores/export" className="inline-flex">
          <Button variant="outline">
            <Download /> Export CSV
          </Button>
        </a>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.k} className="paper-card hard-sm p-4">
            <p className="label-mono text-muted-foreground">{c.k}</p>
            <p className="mt-1 font-display text-4xl leading-none">{c.v}</p>
            {c.sub && <p className="mt-1.5 text-xs text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </section>

      <section className="paper-card mt-6 p-5">
        <h2 className="text-2xl">Can the AI grading be trusted?</h2>
        {calibration ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Measured on the {calibration.n} submission{calibration.n > 1 ? "s" : ""} a person has re-scored.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: "Average gap", v: `${calibration.mae} pts`, sub: "AI vs person, out of 100" },
                { k: "Within 10 pts", v: `${calibration.within10}%`, sub: "of re-scored work" },
                { k: "AI bias", v: `${calibration.bias > 0 ? "+" : ""}${calibration.bias}`, sub: calibration.bias > 1 ? "more generous than people" : calibration.bias < -1 ? "harsher than people" : "about neutral" },
                { k: "Re-scored", v: calibration.n, sub: "so far" },
              ].map((c) => (
                <div key={c.k} className="rounded-md border-[1.5px] border-ink/40 p-3">
                  <p className="label-mono text-muted-foreground">{c.k}</p>
                  <p className="mt-1 font-display text-3xl leading-none">{c.v}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
                </div>
              ))}
            </div>
            {calibration.perModel.length > 1 && (
              <ul className="mt-4 space-y-1 text-sm">
                {calibration.perModel.map((m) => (
                  <li key={m.model} className="flex justify-between border-b border-ink/10 pb-1">
                    <span className="font-mono text-xs">{m.model}</span>
                    <span className="font-mono">avg gap {m.mae} pts · {m.n} compared</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No person has re-scored anything yet. Open a submission and set a human score to start measuring how close the AI is. Every submission scored by two models is also checked for disagreement, and quotes are verified against what the student sent.
          </p>
        )}
        {reviewers.length > 0 && (
          <div className="mt-5">
            <p className="label-mono text-muted-foreground">Do the reviewers cite real evidence?</p>
            <ul className="mt-2 space-y-2">
              {reviewers.map((m) => (
                <li key={m.model}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-mono text-xs">{m.model}</span>
                    <span className="font-mono">
                      {m.evidenceRate === null ? "—" : `${m.evidenceRate}% of quotes verified`} · {m.scored} scored{m.failed > 0 && <span className="text-destructive"> · {m.failed} failed</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 border-[1.5px] border-ink bg-card">
                    <div className="h-full bg-moss" style={{ width: `${m.evidenceRate ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">A quote counts as verified only if it appears word-for-word in the student&apos;s submission. Commentary, paraphrase, or lines copied from the brief don&apos;t count.</p>
          </div>
        )}
        {flagged > 0 && (
          <p className="mt-4 flex gap-2 rounded-md border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm font-medium">
            <span aria-hidden>⚠</span> {flagged} submission{flagged > 1 ? "s need" : " needs"} a person to look — reviewers disagreed or the evidence didn&apos;t check out.
          </p>
        )}
      </section>

      {byAssessment.length > 1 && (
        <section className="paper-card mt-6 p-5">
          <h2 className="text-2xl">By variant</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A fairness check: if one variant&apos;s average is far from the others, it may be easier or harder.
            {spread >= 15 && <strong className="text-destructive"> The spread here is {spread} points — worth a look before comparing students across variants.</strong>}
          </p>
          <ul className="mt-4 space-y-3">
            {byAssessment.map((b) => (
              <li key={b.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/admin/assessments/${b.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                    {b.title}
                  </Link>
                  <span className="shrink-0 font-mono">
                    avg {b.avg ?? "—"} · {b.n} submitted
                  </span>
                </div>
                <div className="mt-1 h-2.5 border-[1.5px] border-ink bg-card">
                  <div className="h-full bg-flame" style={{ width: `${b.avg ?? 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="paper-card mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="label-mono">#</TableHead>
              <TableHead className="label-mono">Student</TableHead>
              <TableHead className="label-mono">Challenge</TableHead>
              {CHALLENGE_RUBRIC.map((c) => (
                <TableHead key={c.key} className="label-mono text-right" title={c.hint}>
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="label-mono text-right">Total</TableHead>
              <TableHead className="label-mono">Scored by</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No submissions yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={r.submissionId}>
                <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{r.studentName}</span>
                  <span className="block text-xs text-muted-foreground">{r.college}</span>
                </TableCell>
                <TableCell className="max-w-[12rem] whitespace-normal text-xs">{r.assessmentTitle}</TableCell>
                {CHALLENGE_RUBRIC.map((c) => (
                  <TableCell key={c.key} className="text-right font-mono">
                    {r.scores?.[c.key] ?? "—"}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <span className="font-display text-2xl">{r.total ?? "—"}</span>
                  {r.humanTotal !== null && <span className="label-mono mt-0.5 block text-moss">human</span>}
                  {r.needsReview && r.humanTotal === null && <span className="label-mono mt-0.5 block text-destructive">⚠ review</span>}
                </TableCell>
                <TableCell>
                  {r.scoreMode ? (
                    <Badge className={r.scoreMode === "ai" ? "bg-marker" : "bg-card"}>{r.scoreMode === "ai" ? "AI" : "basic"}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{r.scoreError ? "failed" : "pending"}</span>
                  )}
                  {r.scoreModel && <span className="label-mono mt-1 block max-w-[10rem] truncate text-muted-foreground">{r.scoreModel}</span>}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/submissions/${r.attemptId}`} className="label-mono underline decoration-flame decoration-2 underline-offset-4">
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
