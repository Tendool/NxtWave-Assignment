import Link from "next/link";
import { Check, Download, FlaskConical, LogOut, Sparkles, Trash2 } from "lucide-react";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { adminSummary } from "@/db/queries";
import { funnelStats } from "@/db/challenge";
import { getCampaign } from "@/db/campaign";
import { conversionBySource } from "@/db/visits";
import { toIstLocal } from "@/lib/campaign";
import { CampaignForm } from "@/components/admin/campaign-form";
import { NumberTicker } from "@/components/fx/number-ticker";
import { BlurFade } from "@/components/fx/blur-fade";
import { AdminNav } from "@/components/admin/admin-nav";
import { backend } from "@/db";
import { TARGET } from "@/lib/constants";
import { approveCollege, loadDemoData, logout, wipeData } from "./actions";
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

function channelOf(isRef: boolean, source: string) {
  if (isRef) return "referral";
  const s = source.toLowerCase();
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

  const [s, f, campaign, sources] = await Promise.all([adminSummary(), funnelStats(), getCampaign(), conversionBySource()]);
  const channelCounts: Record<string, number> = { community: 0, referral: 0, social: 0, other: 0 };
  for (const c of s.channels) channelCounts[channelOf(c.is_ref, c.source)] += c.n;
  const pct = Math.round((s.total / TARGET) * 100);
  const dev = process.env.NODE_ENV !== "production";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <AdminNav active="/admin" />
      <header className="flex flex-wrap items-end justify-between gap-4 mt-8">
        <div>
          <p className="label-mono text-flame">Campaign control</p>
          <h1 className="mt-1 text-5xl">Dashboard</h1>
          <p className="label-mono mt-2 text-muted-foreground">Database: {backend}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dev && (
            <>
              <form action={loadDemoData}>
                <Button variant="outline" type="submit">
                  <FlaskConical /> Load demo data
                </Button>
              </form>
              <form action={wipeData}>
                <Button variant="ghost" type="submit">
                  <Trash2 /> Wipe
                </Button>
              </form>
            </>
          )}
          <Link href="/admin/ai" className="inline-flex">
            <Button variant="outline">
              <Sparkles /> AI settings
            </Button>
          </Link>
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

      <section className="paper-card mt-8 p-5">
        <h2 className="text-2xl">Campaign settings</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">Change these any time — no redeploy needed.</p>
        <CampaignForm startsAt={toIstLocal(campaign.startsAt)} whatsappGroupUrl={campaign.whatsappGroupUrl ?? ""} />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Registrations", v: s.total, sub: `${pct}% of ${TARGET}` },
          { k: "Seats left", v: Math.max(0, TARGET - s.total), sub: "to hit the target" },
          { k: "Via referral", v: s.referred, sub: s.total ? `${Math.round((s.referred / s.total) * 100)}% of signups` : "—" },
          { k: "Colleges", v: s.colleges, sub: "represented" },
        ].map((c, i) => (
          <BlurFade key={c.k} delay={i * 0.05} className="paper-card hard-sm p-5">
            <p className="label-mono text-muted-foreground">{c.k}</p>
            <p className="mt-2 font-display text-5xl leading-none">
              <NumberTicker value={c.v} delay={i * 0.06} />
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{c.sub}</p>
          </BlurFade>
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

      <section className="paper-card mt-6 overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-2xl">Conversion by source</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Unique visitors to the landing page (each browser counted once a day per source) against registrations, by <code className="font-mono">?src=</code> tag.
            A channel with many visitors and few registrations needs a better message, not more posts.
          </p>
        </div>
        {sources.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No visits yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="label-mono">Source</TableHead>
                <TableHead className="label-mono hidden sm:table-cell">Channel</TableHead>
                <TableHead className="label-mono text-right">Visitors</TableHead>
                <TableHead className="label-mono text-right">Registered</TableHead>
                <TableHead className="label-mono text-right">Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.slice(0, 15).map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-mono text-xs">{r.key}</TableCell>
                  <TableCell className="hidden capitalize sm:table-cell">{channelOf(r.isRef, r.source)}</TableCell>
                  <TableCell className="text-right font-mono">{r.visitors}</TableCell>
                  <TableCell className="text-right font-mono">{r.registered}</TableCell>
                  <TableCell className="text-right font-mono">
                    {/* Registrations from before visit tracking existed have no visit, so cap rather than show 140%. */}
                    {r.visitors ? `${Math.min(100, Math.round((r.registered / r.visitors) * 100))}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="paper-card p-5">
          <h2 className="text-2xl">Challenge funnel</h2>
          <p className="mt-1 text-xs text-muted-foreground">How far registrants get once the timer is offered.</p>
          <ul className="mt-4 space-y-3">
            {[
              { k: "Registered", v: f.regs },
              { k: "Shared their link", v: f.sharers },
              { k: "Started the timer", v: f.started },
              { k: "Submitted", v: f.submitted },
              { k: "Scored", v: f.scored },
            ].map((r) => (
              <li key={r.k}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{r.k}</span>
                  <span className="font-mono">{r.v}</span>
                </div>
                <div className="mt-1 h-2.5 border-[1.5px] border-ink bg-card">
                  <div className="h-full bg-flame" style={{ width: `${f.regs ? Math.min(100, Math.round((r.v / f.regs) * 100)) : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="paper-card p-5">
          <h2 className="text-2xl">Shares by channel</h2>
          <p className="mt-1 text-xs text-muted-foreground">Clicks on each share button. Instagram counts when the link is copied.</p>
          {f.byChannel.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No shares yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {f.byChannel.map((c) => (
                <li key={c.channel} className="flex justify-between border-b border-ink/10 pb-2">
                  <span className="capitalize">{c.channel}</span>
                  <span className="font-mono">{c.n}</span>
                </li>
              ))}
            </ul>
          )}
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
          <h2 className="text-2xl">Top states</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {s.states.slice(0, 6).map((b) => (
              <li key={b.name} className="flex justify-between border-b border-ink/10 pb-2">
                <span>{b.name}</span>
                <span className="font-mono">{b.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {s.unverified.length > 0 && (
        <section className="paper-card mt-6 p-5">
          <h2 className="text-2xl">Colleges added by students</h2>
          <p className="mt-1 text-xs text-muted-foreground">Not in the reference list. Approve to add them to the search suggestions.</p>
          <ul className="mt-4 divide-y divide-ink/15 text-sm">
            {s.unverified.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium">{c.name}</span>
                  <span className="label-mono ml-2 text-muted-foreground">{c.n} registered</span>
                </span>
                <form action={approveCollege}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button size="sm" variant="outline" type="submit">
                    <Check /> Approve
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

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
            {s.recent.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="whitespace-normal">{r.college}</TableCell>
                <TableCell className="hidden sm:table-cell">{r.branch}</TableCell>
                <TableCell className="hidden md:table-cell">{r.referred ? "referral" : (r.source ?? "direct")}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
