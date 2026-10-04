import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./index";

const rowsOf = <T>(res: unknown) => ((res as { rows?: T[] }).rows ?? []) as T[];

export async function logVisit(visitorId: string, source: string | null, referred: boolean) {
  const db = await getDb();
  await db.insert(schema.visits).values({ visitorId, source, referred }).onConflictDoNothing();
}

export type SourceRow = { key: string; isRef: boolean; source: string; visitors: number; registered: number };

/**
 * Visitors and registrations per source tag. A referral link counts as "referral" whatever else it carries,
 * matching how registrations are attributed.
 */
export async function conversionBySource(): Promise<SourceRow[]> {
  const db = await getDb();
  const res = await db.execute(sql`
    with v as (
      select referred as is_ref, case when referred then '' else coalesce(source, '') end as source, count(*)::int as visitors
      from visits group by 1, 2
    ), r as (
      select (referred_by_id is not null) as is_ref, case when referred_by_id is not null then '' else coalesce(source, '') end as source,
             count(*)::int as registered
      from registrations group by 1, 2
    )
    select coalesce(v.is_ref, r.is_ref) as is_ref, coalesce(v.source, r.source) as source,
           coalesce(v.visitors, 0) as visitors, coalesce(r.registered, 0) as registered
    from v full outer join r on v.is_ref = r.is_ref and v.source = r.source
    order by visitors desc, registered desc`);
  return rowsOf<{ is_ref: boolean; source: string; visitors: number; registered: number }>(res).map((r) => ({
    key: r.is_ref ? "referral" : r.source || "direct",
    isRef: r.is_ref,
    source: r.source,
    visitors: r.visitors,
    registered: r.registered,
  }));
}
