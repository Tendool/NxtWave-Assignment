import { isAdmin } from "@/lib/admin-auth";
import { scoresOverview } from "@/db/challenge";
import { CHALLENGE_RUBRIC } from "@/lib/rubric";

// Spreadsheet apps execute cells that start with = + - @ ; neutralise those.
const cell = (v: unknown) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { rows } = await scoresOverview();
  const head = ["student", "college", "challenge", ...CHALLENGE_RUBRIC.map((c) => c.key), "total", "ai_total", "human_total", "needs_review", "scored_by", "model", "submitted_at"];
  const lines = rows.map((r) =>
    [r.studentName, r.college, r.assessmentTitle, ...CHALLENGE_RUBRIC.map((c) => r.scores?.[c.key] ?? ""), r.total ?? "", r.aiTotal ?? "", r.humanTotal ?? "", r.needsReview ? "yes" : "", r.scoreMode ?? "", r.scoreModel ?? "", r.submittedAt ?? ""].map(cell).join(","),
  );
  return new Response([head.join(","), ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="scores-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
