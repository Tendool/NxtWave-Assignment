import Link from "next/link";
import { Download, LogOut } from "lucide-react";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { adminSummary, TARGET } from "@/lib/stats";
import { backend } from "@/lib/db";
import { logout } from "./actions";
import { LoginForm } from "@/components/admin/login-form";
import { GrowthChart } from "@/components/admin/growth-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Build60", robots: { index: false } };

// The three planned channels and what each is expected to deliver.
const PLAN = [
  { key: "community", name: "Campus WhatsApp + ambassadors", target: 250 },
  { key: "referral", name: "Referral loop", target: 150 },
  { key: "social", name: "Social + TPO email", target: 100 },
] as const;

function channelOf(r: { source: string | null; referred_by: string | null }) {
  if (r.referred_by) return "referral";
  const s = (r.source ?? "").toLowerCase();
  if (s.startsWith("amb") || s.includes("whatsapp") || s.includes("club")) return "community";
  if (s.includes("insta") || s.includes("linkedin") || s.includes("email") || s.includes("tpo") || s.includes("reel")) return "social";
  return "other";
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
        <Badge className="mb-4 w-fit bg-marker">Staff only</Badge>
        <h1 className="text-4xl">Admin</h1>
        <div className="paper-card hard mt-6 p-6">
          {adminConfigured() ? (
            <LoginForm />
          ) : (
            <p className="text-sm">
              Admin is locked. Set the <code className="font-mono">ADMIN_PASSWORD</code> environment variable and redeploy.
            </p>
          )}
        </div>
        <Link href="/" className="label-mono mt-6 text-muted-foreground hover:text-flame">
          ← Back to site
        </Link>
      </main>
    );
  }

  const s = await adminSummary();
  const channelCounts: Record<string, number> = { community: 0, referral: 0, social: 0, other: 0 };
  for (const r of s.rows) channelCounts[channelOf(r)] += 1;
  const pct = Math.round((s.total / TARGET) * 100);
  const recent = [...s.rows].reverse().slice(0, 12);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-flame">Campaign control</p>
          <h1 className="mt-1 text-5xl">Dashboard</h1>
          <p className="label-mono mt-2 text-muted-foreground">Storage: {backend}</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/export" className="inline-flex">
            <Button variant="outline">
              <Download /> Export CSV
            </Button>
          </a>
          <form action={logout}>
            <Button variant="ghost" type="submit">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Registrations", v: s.total, sub: `${pct}% of ${TARGET}` },
          { k: "Seats left", v: Math.max(0, TARGET - s.total), sub: "to hit the target" },
          { k: "Via referral", v: s.referred, sub: s.total ? `${Math.round((s.referred / s.total) * 100)}% of signups` : "—" },
          { k: "Colleges", v: new Set(s.rows.map((r) => r.college)).size, sub: "represented" },
        ].map((c) => (
          <div key={c.k} className="paper-card hard-sm p-5">
            <p className="label-mono text-muted-foreground">{c.k}</p>
            <p className="mt-2 font-display text-5xl leading-none">{c.v}</p>
            <p className="mt-2 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="paper-card p-5">
          <h2 className="text-2xl">Registrations over time</h2>
          <GrowthChart data={s.daily} target={TARGET} />
        </div>

        <div className="paper-card p-5">
          <h2 className="text-2xl">Plan vs. actual</h2>
          <p className="mt-1 text-xs text-muted-foreground">Each channel against the number the plan promised.</p>
          <ul className="mt-5 space-y-5">
            {PLAN.map((p) => {
              const got = channelCounts[p.key];
              const w = Math.min(100, Math.round((got / p.target) * 100));
              return (
                <li key={p.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="font-mono">
                      {got} / {p.target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 border-[1.5px] border-ink bg-card">
                    <div className="h-full bg-flame" style={{ width: `${w}%` }} />
                  </div>
                </li>
              );
            })}
            <li className="flex justify-between border-t border-ink/20 pt-3 text-sm text-muted-foreground">
              <span>Untagged / direct</span>
              <span className="font-mono">{channelCounts.other}</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="paper-card p-5">
          <h2 className="text-2xl">Top branches</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {s.branches.slice(0, 6).map((b) => (
              <li key={b.name} className="flex justify-between border-b border-ink/10 pb-2">
                <span>{b.name}</span>
                <span className="font-mono">{b.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="paper-card p-5">
          <h2 className="text-2xl">Traffic sources (raw tags)</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {s.sources.slice(0, 6).map((b) => (
              <li key={b.name} className="flex justify-between border-b border-ink/10 pb-2">
                <span>{b.name}</span>
                <span className="font-mono">{b.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="paper-card mt-6 overflow-hidden">
        <h2 className="p-5 pb-3 text-2xl">Latest registrations</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="label-mono">Name</TableHead>
              <TableHead className="label-mono">College</TableHead>
              <TableHead className="label-mono hidden sm:table-cell">Branch</TableHead>
              <TableHead className="label-mono hidden md:table-cell">Source</TableHead>
              <TableHead className="label-mono text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="whitespace-normal">{r.college}</TableCell>
                <TableCell className="hidden sm:table-cell">{r.branch}</TableCell>
                <TableCell className="hidden md:table-cell">{r.referred_by ? `ref:${r.referred_by}` : (r.source ?? "direct")}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
