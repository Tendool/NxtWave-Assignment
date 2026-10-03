import { getAttempt, getFile, getStudentByToken } from "@/db/challenge";
import { getStudentToken } from "@/lib/student-session";

/** Serves the assessment's attachment — only to the student who was actually assigned that assessment. */
export async function GET() {
  const student = await getStudentByToken(await getStudentToken());
  if (!student) return new Response("Unauthorized", { status: 401 });
  const attempt = await getAttempt(student.id);
  const id = attempt?.assessment.attachment?.id;
  if (!id) return new Response("Not found", { status: 404 });
  const file = await getFile(id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.mime,
      "content-disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
