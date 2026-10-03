/** Upload limits and file checks. The size cap is the *server* limit; Vercel functions reject bodies over ~4.5 MB. */
export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || (process.env.VERCEL ? 4 : 25);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

type Kind = "zip" | "video" | "attachment";

const VIDEO_MIME: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska" };
const ATTACH_MIME: Record<string, string> = { pdf: "application/pdf", zip: "application/zip", md: "text/markdown", txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";
const startsWith = (b: Buffer, sig: number[], at = 0) => sig.every((x, i) => b[at + i] === x);

/**
 * Validates an uploaded file by extension AND magic bytes, and returns the content-type to serve it with.
 * The client-supplied MIME type is never trusted.
 */
export function checkUpload(kind: Kind, filename: string, data: Buffer): { ok: true; mime: string } | { ok: false; error: string } {
  if (data.length === 0) return { ok: false, error: "That file is empty." };
  if (data.length > MAX_UPLOAD_BYTES) return { ok: false, error: `File is too large (limit ${MAX_UPLOAD_MB} MB). Share a link instead.` };
  const e = ext(filename);

  if (kind === "zip") {
    if (e !== "zip") return { ok: false, error: "Code must be a .zip file." };
    if (!(startsWith(data, [0x50, 0x4b, 0x03, 0x04]) || startsWith(data, [0x50, 0x4b, 0x05, 0x06]))) return { ok: false, error: "That doesn't look like a valid zip." };
    return { ok: true, mime: "application/zip" };
  }
  if (kind === "video") {
    const mime = VIDEO_MIME[e];
    if (!mime) return { ok: false, error: "Video must be mp4, mov, webm or mkv." };
    const isMp4Family = data.length > 12 && data.toString("latin1", 4, 8) === "ftyp";
    const isMatroska = startsWith(data, [0x1a, 0x45, 0xdf, 0xa3]);
    if (!isMp4Family && !isMatroska) return { ok: false, error: "That doesn't look like a valid video file." };
    return { ok: true, mime };
  }
  const mime = ATTACH_MIME[e];
  if (!mime) return { ok: false, error: "Attach a pdf, zip, md, txt or image." };
  if (e === "pdf" && !startsWith(data, [0x25, 0x50, 0x44, 0x46])) return { ok: false, error: "That doesn't look like a valid PDF." };
  if (e === "zip" && !startsWith(data, [0x50, 0x4b])) return { ok: false, error: "That doesn't look like a valid zip." };
  return { ok: true, mime };
}
