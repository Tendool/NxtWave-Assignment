import { isAdmin } from "@/lib/admin-auth";
import { allRegistrations } from "@/lib/db";

const cols = ["name", "email", "whatsapp", "college", "branch", "year", "ref_code", "referred_by", "source", "created_at"] as const;

// Spreadsheet apps execute cells that start with = + - @ ; neutralise those.
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = await allRegistrations();
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
