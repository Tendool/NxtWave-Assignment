import Link from "next/link";
import { aiEnabled } from "@/lib/ai";
import { requireAdminPage } from "@/lib/admin-auth";
import { getPolicy, listAssessmentsAdmin } from "@/db/challenge";
import { REQUIREMENT_LABELS } from "@/lib/challenge-types";
import { AdminNav } from "@/components/admin/admin-nav";
import { AssessmentManager } from "@/components/admin/assessment-manager";
import { AssessmentRowActions } from "@/components/admin/assessment-row-actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assessments — Build60", robots: { index: false } };

const SOURCE: Record<string, string> = { manual: "Written", upload: "Uploaded", ai: "AI" };

export default async function AssessmentsPage() {
  await requireAdminPage();
  const [list, policy, aiOn] = await Promise.all([listAssessmentsAdmin(), getPolicy(), aiEnabled()]);
  const pool = list.filter((a) => !a.generatedForId);
  const personal = list.filter((a) => a.generatedForId);
  const activePool = pool.filter((a) => a.active).length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <AdminNav active="/admin/assessments" />
      <p className="label-mono mt-8 text-flame">The challenge</p>
      <h1 className="mt-1 text-5xl">Assessments</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Write or upload a question, or have the AI write one — or several variants. When a student starts their timer, they&apos;re given one:{" "}
        <strong>{policy.mode === "pool" ? "at random from the pool" : "a unique one generated just for them"}</strong>.
      </p>

      <div className="mt-8">
        <AssessmentManager policy={policy} aiOn={aiOn} />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-3xl">The pool</h2>
          <p className="label-mono text-muted-foreground">
            {activePool} active · {pool.length} total{personal.length > 0 && ` · ${personal.length} generated per student`}
          </p>
        </div>

        {pool.length === 0 ? (
          <p className="paper-card mt-4 p-6 text-sm text-muted-foreground">
            Nothing here yet. Until you add one, students are given a built-in default challenge so the flow still works.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pool.map((a) => (
              <li key={a.id} className={`paper-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${a.active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/assessments/${a.id}`} className="font-display text-2xl leading-tight underline-offset-4 hover:underline">
                      {a.title}
                    </Link>
                    <Badge className="bg-card">{SOURCE[a.source] ?? a.source}</Badge>
                    {!a.active && <Badge className="bg-card">Inactive</Badge>}
                  </div>
                  <p className="label-mono mt-1.5 text-muted-foreground">
                    {a.durationMinutes} min · {(Object.keys(a.requirements) as (keyof typeof a.requirements)[]).filter((k) => a.requirements[k] !== "off").map((k) => `${REQUIREMENT_LABELS[k]}${a.requirements[k] === "required" ? "*" : ""}`).join(" · ")}
                    {a.hasAttachment && " · attachment"}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>{a.assigned}</strong> assigned{a.avgScore !== null && <> · avg score <strong>{a.avgScore}</strong></>}
                  </p>
                </div>
                <AssessmentRowActions id={a.id} active={a.active} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
