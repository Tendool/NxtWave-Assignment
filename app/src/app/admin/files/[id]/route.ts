import { isAdmin } from "@/lib/admin-auth";
import { getFile } from "@/db/challenge";

const UUID = /^[0-9a-f-]{36}$/i;

/** Admin-only file download/stream, with Range support so uploaded videos can be scrubbed. */
export async function GET(req: Request, ctx: RouteContext<"/admin/files/[id]">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const f = await getFile(id);
  if (!f) return new Response("Not found", { status: 404 });

  const inline = f.mime.startsWith("video/") || f.mime === "application/pdf" || f.mime.startsWith("image/");
  const headers: Record<string, string> = {
    "content-type": f.mime, // set by the server from the validated file type, never from the uploader
    "content-disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(f.filename)}"`,
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = f.data.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    const part = f.data.subarray(start, end + 1);
    return new Response(new Uint8Array(part), {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(part.length) },
    });
  }
  return new Response(new Uint8Array(f.data), { headers: { ...headers, "content-length": String(f.data.length) } });
}
