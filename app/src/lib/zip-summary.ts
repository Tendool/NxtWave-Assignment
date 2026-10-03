import "server-only";
import { strFromU8, unzipSync } from "fflate";

export type ZipSummary = {
  fileCount: number;
  files: string[];
  readme: string;
  snippets: { name: string; text: string }[];
  error?: string;
};

const SKIP = /(^|\/)(node_modules|\.git|\.next|dist|build|__pycache__|\.venv|venv)(\/|$)/i;
const SOURCE = /\.(py|js|jsx|ts|tsx|java|c|cpp|cs|go|rs|rb|php|html|css|ipynb|md|txt|json|yml|yaml|toml)$/i;

/**
 * Reads the *structure* of a student's zip without extracting it to disk. Only a handful of small text files
 * are ever inflated (README + a few source files), so a hostile archive can't blow up memory.
 */
export function summarizeZip(buf: Buffer): ZipSummary {
  const files: string[] = [];
  const snippets: { name: string; text: string }[] = [];
  let readme = "";
  let picked = 0;
  try {
    const out = unzipSync(new Uint8Array(buf), {
      filter(f) {
        if (f.name.endsWith("/")) return false;
        if (files.length < 400) files.push(f.name);
        if (SKIP.test(f.name) || f.originalSize > 60_000) return false;
        const isReadme = /(^|\/)readme(\.[a-z]+)?$/i.test(f.name);
        if (isReadme && !readme) return true;
        if (picked < 6 && SOURCE.test(f.name) && f.originalSize > 0) {
          picked++;
          return true;
        }
        return false;
      },
    });
    for (const [name, data] of Object.entries(out)) {
      const text = strFromU8(data).slice(0, 2500);
      if (/(^|\/)readme(\.[a-z]+)?$/i.test(name) && !readme) readme = text;
      else snippets.push({ name, text });
    }
    return { fileCount: files.length, files: files.filter((n) => !SKIP.test(n)).slice(0, 80), readme, snippets: snippets.slice(0, 5) };
  } catch (e) {
    return { fileCount: 0, files: [], readme: "", snippets: [], error: (e as Error).message.slice(0, 120) };
  }
}
