import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAssessmentAdmin } from "@/db/challenge";
import { REQUIREMENT_LABELS } from "@/lib/challenge-types";
import { Markdown } from "@/components/site/markdown";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AssessmentView({ params }: PageProps<"/admin/assessments/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await getAssessmentAdmin(id);
  if (!a) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin/assessments" className="label-mono inline-flex items-center gap-1 text-muted-foreground hover:text-flame">
        <ArrowLeft className="size-3.5" /> Assessments
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-4xl leading-tight md:text-5xl">{a.title}</h1>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="bg-card">{a.source}</Badge>
        <Badge className="bg-card">{a.durationMinutes} min</Badge>
        {!a.active && <Badge className="bg-card">Inactive</Badge>}
        {a.generatedForId && <Badge className="bg-marker">Generated for one student</Badge>}
      </div>
      <p className="label-mono mt-4 text-muted-foreground">
        Students submit: {(Object.keys(a.requirements) as (keyof typeof a.requirements)[]).map((k) => `${REQUIREMENT_LABELS[k]} (${a.requirements[k]})`).join(" · ")}
      </p>
      {a.attachmentFileId && (
        <a href={`/admin/files/${a.attachmentFileId}`} className="mt-4 inline-flex items-center gap-2 rounded-md border-[1.5px] border-ink bg-secondary px-3 py-2 text-sm font-semibold hover:bg-marker hover:text-[#16120e]">
          <Download className="size-4" /> Attachment
        </a>
      )}
      <article className="paper-card mt-8 p-6">
        <Markdown>{a.brief}</Markdown>
      </article>
    </main>
  );
}
