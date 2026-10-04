import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "./index";

const rowsOf = <T>(res: unknown) => ((res as { rows?: T[] }).rows ?? []) as T[];

/**
 * Counts one hit against `key` in a fixed window and says whether it's still within `limit`.
 * One atomic statement, so concurrent requests can't both slip under the limit.
 */
export async function hit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  const db = await getDb();
  const res = await db.execute(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      count    = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning count, greatest(0, ceil(extract(epoch from reset_at - now())))::int as retry`);
  const [row] = rowsOf<{ count: number; retry: number }>(res);
  // Expired rows are useless; sweep them now and then instead of on every request.
  if (Math.random() < 0.02) await db.execute(sql`delete from rate_limits where reset_at < now() - interval '1 day'`);
  return { ok: row.count <= limit, retryAfterSec: row.retry };
}

/**
 * The client's IP, hashed. On Vercel `x-forwarded-for` is set by the platform, so it can't be spoofed;
 * self-hosted, put the app behind a proxy that sets it.
 */
export async function clientKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`build60:${ip}`).digest("hex").slice(0, 32);
}

/** Per-IP limit for a named action. */
export async function limitByIp(action: string, limit: number, windowSec: number) {
  return hit(`${action}:${await clientKey()}`, limit, windowSec);
}

export const waitText = (sec: number) => (sec > 90 ? `${Math.ceil(sec / 60)} minutes` : `${Math.max(1, sec)} seconds`);
