import Link from "next/link";
import { Code2, ExternalLink, FileArchive, Video } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";
import { funnelStats, listAttemptsAdmin } from "@/db/challenge";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Submissions — Build60", robots: { index: false } };

const mins = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / 60_000));

export default async function SubmissionsPage() {
  await requireAdminPage();
  const [rows, f] = await Promise.all([listAttemptsAdmin(), funnelStats()]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <AdminNav active="/admin/submissions" />
      <p className="label-mono mt-8 text-flame">Everything students sent</p>
      <h1 className="mt-1 text-5xl">Submissions</h1>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Registered", v: f.regs, sub: "" },
          { k: "Started the timer", v: f.started, sub: f.regs ? `${Math.round((f.started / f.regs) * 100)}% of registered` : "" },
          { k: "Submitted", v: f.submitted, sub: f.started ? `${Math.round((f.submitted / f.started) * 100)}% of started` : "" },
          { k: "Scored", v: f.scored, sub: "" },
        ].map((c) => (
          <div key={c.k} className="paper-card hard-sm p-4">
            <p className="label-mono text-muted-foreground">{c.k}</p>
            <p className="mt-1 font-display text-4xl leading-none">{c.v}</p>
            {c.sub && <p className="mt-1.5 text-xs text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </section>

      <div className="paper-card mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="label-mono">Student</TableHead>
              <TableHead className="label-mono">Challenge</TableHead>
              <TableHead className="label-mono">Status</TableHead>
              <TableHead className="label-mono">Sent</TableHead>
              <TableHead className="label-mono text-right">Score</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nobody has started the timer yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const st = r.status;
              return (
                <TableRow key={r.attemptId}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{r.studentName}</span>
                    <span className="block text-xs text-muted-foreground">{r.college}</span>
                  </TableCell>
                  <TableCell className="max-w-[16rem] whitespace-normal text-sm">{r.assessmentTitle}</TableCell>
                  <TableCell>
                    <Badge className={st === "submitted" ? "bg-marker" : "bg-card"}>{st}</Badge>
                    {r.submittedAt && <span className="label-mono mt-1 block text-muted-foreground">{mins(r.startedAt, r.submittedAt)} min</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      {r.repoUrl && <Code2 className="size-4" aria-label="Repo" />}
                      {r.hasZip && <FileArchive className="size-4" aria-label="Zip" />}
                      {r.hostedUrl && <ExternalLink className="size-4" aria-label="Hosted link" />}
                      {(r.videoUrl || r.hasVideoFile) && <Video className="size-4" aria-label="Video" />}
                      {!r.submissionId && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-display text-2xl">{r.total ?? "—"}</span>
                    {r.humanChecked && <span className="label-mono mt-0.5 block text-moss">human</span>}
                    {r.needsReview && !r.humanChecked && <span className="label-mono mt-0.5 block text-destructive">⚠ review</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/submissions/${r.attemptId}`} className="label-mono underline decoration-flame decoration-2 underline-offset-4">
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
