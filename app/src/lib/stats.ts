import "server-only";
import { allRegistrations } from "./db";
import type { Registration } from "./types";

export const TARGET = 500;

export function firstNameInitial(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export async function getCount() {
  return (await allRegistrations()).length;
}

export function referralCounts(rows: Registration[]) {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.referred_by) counts.set(r.referred_by, (counts.get(r.referred_by) ?? 0) + 1);
  return counts;
}

export async function leaderboard() {
  const rows = await allRegistrations();
  const counts = referralCounts(rows);
  const byCode = new Map(rows.map((r) => [r.ref_code, r]));

  const people = [...counts.entries()]
    .map(([code, n]) => ({ code, referrals: n, who: byCode.get(code) }))
    .filter((p) => p.who)
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, 10)
    .map((p) => ({
      code: p.code,
      name: firstNameInitial(p.who!.name),
      college: p.who!.college,
      referrals: p.referrals,
    }));

  const collegeMap = new Map<string, { registrations: number; referred: number }>();
  for (const r of rows) {
    const c = collegeMap.get(r.college) ?? { registrations: 0, referred: 0 };
    c.registrations += 1;
    if (r.referred_by) c.referred += 1;
    collegeMap.set(r.college, c);
  }
  const colleges = [...collegeMap.entries()]
    .map(([college, v]) => ({ college, ...v }))
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 10);

  return { people, colleges, total: rows.length };
}

export async function recentSignups(limit = 6) {
  const rows = await allRegistrations();
  return rows
    .slice(-limit)
    .reverse()
    .map((r) => ({ name: firstNameInitial(r.name), college: r.college, at: r.created_at }));
}

export async function adminSummary() {
  const rows = await allRegistrations();
  const bySource = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byBranch = new Map<string, number>();
  let referred = 0;
  for (const r of rows) {
    const s = r.source || (r.referred_by ? "Referral" : "Direct");
    bySource.set(s, (bySource.get(s) ?? 0) + 1);
    const d = r.created_at.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
    byBranch.set(r.branch, (byBranch.get(r.branch) ?? 0) + 1);
    if (r.referred_by) referred += 1;
  }
  let run = 0;
  const daily = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, n]) => ({ day, n, total: (run += n) }));
  return {
    rows,
    total: rows.length,
    referred,
    sources: [...bySource.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    branches: [...byBranch.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    daily,
  };
}
