import "server-only";
import { randomBytes } from "node:crypto";
import { asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "./index";
import { slugify } from "./colleges-data";
import { firstNameInitial } from "@/lib/format";

const { colleges, registrations, evaluations } = schema;
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Db = DB | Tx;

const rowsOf = <T>(res: unknown) => ((res as { rows?: T[] }).rows ?? []) as T[];

// ───────────────────────── colleges ─────────────────────────

/** Lower-case, punctuation to spaces, single spaces — applied the same way to the query and the table. */
export const normCollege = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Typeahead search over verified colleges: every word must appear in the name, city, state or type.
 * Names that start with the query rank first, then shorter names. Runs in the database so the
 * 560-college list never has to ship to a phone.
 */
export async function searchColleges(query: string, limit = 8) {
  const q = normCollege(query).slice(0, 60);
  const words = q.split(" ").filter(Boolean).slice(0, 6);
  if (q.length < 2 || words.length === 0) return [];
  const db = await getDb();
  const clean = (e: ReturnType<typeof sql>) => sql`trim(regexp_replace(regexp_replace(lower(${e}), '[^a-z0-9 ]+', ' ', 'g'), '[[:space:]]+', ' ', 'g'))`;
  const hay = clean(sql`${colleges.name} || ' ' || coalesce(${colleges.city}, '') || ' ' || coalesce(${colleges.state}, '') || ' ' || coalesce(${colleges.kind}, '')`);
  const name = clean(sql`${colleges.name}`);
  // Words are [a-z0-9]+ after normalising, so they can't carry LIKE wildcards.
  const matches = words.map((w) => sql`${hay} like ${`%${w}%`}`);
  return db
    .select({ id: colleges.id, name: colleges.name, city: colleges.city, state: colleges.state, kind: colleges.kind })
    .from(colleges)
    .where(sql`${colleges.verified} = true and ${sql.join(matches, sql` and `)}`)
    .orderBy(sql`(${name} like ${`${q}%`}) desc`, sql`length(${colleges.name})`, asc(colleges.name))
    .limit(limit);
}

/** Match a typed college to the reference table, or add it as unverified so nothing is lost. */
async function resolveCollege(db: Db, typed: string) {
  const name = typed.replace(/\s+/g, " ").trim().slice(0, 120);
  const slug = slugify(name) || "other";
  const hit = await db
    .select({ id: colleges.id })
    .from(colleges)
    .where(sql`${colleges.slug} = ${slug} or lower(${colleges.name}) = ${name.toLowerCase()}`)
    .limit(1);
  if (hit[0]) return hit[0].id;
  const [created] = await db
    .insert(colleges)
    .values({ slug, name, verified: false })
    .onConflictDoUpdate({ target: colleges.slug, set: { slug } })
    .returning({ id: colleges.id });
  return created.id;
}

// ───────────────────────── registrations ─────────────────────────

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
function makeCode(name: string) {
  const stem = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase().padEnd(3, "X");
  const tail = [...randomBytes(3)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${stem}-${tail}`;
}

type PgErr = { code?: string; constraint?: string; cause?: unknown };
const pgError = (e: unknown): PgErr => {
  const err = e as PgErr;
  return (err.cause as PgErr | undefined)?.code ? (err.cause as PgErr) : err;
};

export type NewRegistration = {
  name: string;
  email: string;
  whatsapp: string;
  college: string;
  branch: (typeof schema.branchEnum.enumValues)[number];
  year: (typeof schema.yearEnum.enumValues)[number];
  ref?: string;
  src?: string;
};

export type RegisterResult = {
  refCode: string;
  duplicate: boolean;
  /** Present only when this person proved they own the registration (new, or both email AND WhatsApp matched). */
  accessToken?: string;
};

export async function createRegistration(input: NewRegistration): Promise<RegisterResult> {
  const db = await getDb();
  const email = input.email.toLowerCase();

  const existing = await db
    .select({ refCode: registrations.refCode, email: registrations.email, whatsapp: registrations.whatsapp, accessToken: registrations.accessToken })
    .from(registrations)
    .where(sql`lower(${registrations.email}) = ${email} or ${registrations.whatsapp} = ${input.whatsapp}`)
    .limit(1);
  if (existing[0]) {
    // Knowing only an email OR only a number must not hand over someone's challenge; both have to match.
    const owner = existing[0].email.toLowerCase() === email && existing[0].whatsapp === input.whatsapp;
    return { refCode: existing[0].refCode, duplicate: true, accessToken: owner ? existing[0].accessToken : undefined };
  }

  // A referral only counts when the code belongs to a real, different registrant.
  let referredById: string | null = null;
  if (input.ref) {
    const [referrer] = await db
      .select({ id: registrations.id, email: registrations.email })
      .from(registrations)
      .where(eq(registrations.refCode, input.ref.toUpperCase()))
      .limit(1);
    if (referrer && referrer.email.toLowerCase() !== email) referredById = referrer.id;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const accessToken = randomBytes(24).toString("hex");
      const refCode = await db.transaction(async (tx) => {
        const collegeId = await resolveCollege(tx, input.college);
        const code = makeCode(input.name);
        await tx.insert(registrations).values({
          name: input.name,
          email,
          whatsapp: input.whatsapp,
          collegeId,
          branch: input.branch,
          year: input.year,
          refCode: code,
          accessToken,
          referredById,
          source: input.src || null,
        });
        return code;
      });
      return { refCode, duplicate: false, accessToken };
    } catch (e) {
      const { code, constraint } = pgError(e);
      if (code === "23505" && constraint === "registrations_ref_code_uq") continue; // regenerate code
      if (code === "23505") {
        // Lost a race with an identical registration — return the winner.
        const [row] = await db
          .select({ refCode: registrations.refCode })
          .from(registrations)
          .where(sql`lower(${registrations.email}) = ${email} or ${registrations.whatsapp} = ${input.whatsapp}`)
          .limit(1);
        if (row) return { refCode: row.refCode, duplicate: true };
      }
      throw e;
    }
  }
  throw new Error("Could not allocate a unique referral code.");
}

export async function getCount() {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(registrations);
  return n;
}

/** How many different colleges have at least one registration. */
export async function collegeCount() {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(distinct ${registrations.collegeId})::int` }).from(registrations);
  return n;
}

export async function topColleges(limit: number) {
  const db = await getDb();
  return db
    .select({ name: colleges.name, n: count() })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .groupBy(colleges.id)
    .orderBy(desc(count()), asc(colleges.name))
    .limit(limit);
}

export async function latestSignup() {
  const db = await getDb();
  const [row] = await db
    .select({ name: registrations.name, college: colleges.name })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .orderBy(desc(registrations.createdAt))
    .limit(1);
  return row ? { name: firstNameInitial(row.name), college: row.college } : null;
}

/** Everything the thank-you page needs, in a handful of queries. */
export async function getRegistrationView(code: string) {
  const db = await getDb();
  const [me] = await db
    .select({
      id: registrations.id,
      name: registrations.name,
      refCode: registrations.refCode,
      collegeId: registrations.collegeId,
      college: colleges.name,
    })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .where(eq(registrations.refCode, code.toUpperCase()))
    .limit(1);
  if (!me) return null;

  const [{ friends }] = await db.select({ friends: count() }).from(registrations).where(eq(registrations.referredById, me.id));
  const [{ collegeCount }] = await db
    .select({ collegeCount: count() })
    .from(registrations)
    .where(eq(registrations.collegeId, me.collegeId));

  let rank: number | null = null;
  if (friends > 0) {
    const res = await db.execute(sql`
      select count(*)::int + 1 as rank from (
        select referred_by_id from registrations where referred_by_id is not null
        group by referred_by_id having count(*) > ${friends}
      ) t`);
    rank = rowsOf<{ rank: number }>(res)[0]?.rank ?? null;
  }
  return { ...me, friends, rank, collegeCount };
}

/** The only things a share card may show about someone: a first name and a college. */
export async function getPublicCardData(code: string) {
  const db = await getDb();
  const [row] = await db
    .select({ name: registrations.name, college: colleges.name })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .where(eq(registrations.refCode, code.toUpperCase()))
    .limit(1);
  return row ? { firstName: row.name.split(/\s+/)[0], college: row.college } : null;
}

export async function leaderboard() {
  const db = await getDb();
  const referred = sql<number>`count(x.id)::int`;
  const peopleRes = await db.execute(sql`
    select r.ref_code as code, r.name, c.name as college, ${referred} as referrals
    from registrations r
    join registrations x on x.referred_by_id = r.id
    join colleges c on c.id = r.college_id
    group by r.id, c.name
    order by referrals desc, r.created_at asc
    limit 10`);
  const people = rowsOf<{ code: string; name: string; college: string; referrals: number }>(peopleRes).map((p) => ({
    ...p,
    name: firstNameInitial(p.name),
  }));

  const colleges_ = await db
    .select({
      college: colleges.name,
      state: colleges.state,
      registrations: count(),
    })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .groupBy(colleges.id)
    .orderBy(desc(count()), asc(colleges.name))
    .limit(10);

  return { people, colleges: colleges_, total: await getCount() };
}

export async function adminSummary() {
  const db = await getDb();

  const [{ total }] = await db.select({ total: count() }).from(registrations);
  const [{ referred }] = await db.select({ referred: count() }).from(registrations).where(isNotNull(registrations.referredById));
  const [{ collegesN }] = await db
    .select({ collegesN: sql<number>`count(distinct ${registrations.collegeId})::int` })
    .from(registrations);

  const dailyRes = await db.execute(sql`
    select to_char(d, 'YYYY-MM-DD') as day, n::int as n, (sum(n) over (order by d))::int as total from (
      select date_trunc('day', created_at at time zone 'Asia/Kolkata') as d, count(*) as n
      from registrations group by 1
    ) t order by d`);
  const daily = rowsOf<{ day: string; n: number; total: number }>(dailyRes);

  const channelRes = await db.execute(sql`
    select (referred_by_id is not null) as is_ref, coalesce(source, '') as source, count(*)::int as n
    from registrations group by 1, 2`);
  const channels = rowsOf<{ is_ref: boolean; source: string; n: number }>(channelRes);

  const branches = await db
    .select({ name: registrations.branch, value: count() })
    .from(registrations)
    .groupBy(registrations.branch)
    .orderBy(desc(count()));

  const states = await db
    .select({ name: sql<string>`coalesce(${colleges.state}, 'Not listed')`, value: count() })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .groupBy(colleges.state)
    .orderBy(desc(count()))
    .limit(8);

  const recent = await db
    .select({
      id: registrations.id,
      name: registrations.name,
      college: colleges.name,
      branch: registrations.branch,
      source: registrations.source,
      referred: sql<boolean>`${registrations.referredById} is not null`,
      createdAt: registrations.createdAt,
    })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .orderBy(desc(registrations.createdAt))
    .limit(12);

  const unverified = await db
    .select({ id: colleges.id, name: colleges.name, n: count(registrations.id) })
    .from(colleges)
    .leftJoin(registrations, eq(registrations.collegeId, colleges.id))
    .where(eq(colleges.verified, false))
    .groupBy(colleges.id)
    .orderBy(desc(count(registrations.id)))
    .limit(10);

  return { total, referred, colleges: collegesN, daily, channels, branches, states, recent, unverified };
}

export async function exportRows() {
  const db = await getDb();
  const res = await db.execute(sql`
    select r.name, r.email, r.whatsapp, c.name as college, c.state, r.branch, r.year,
           r.ref_code, p.ref_code as referred_by, r.source, r.created_at
    from registrations r
    join colleges c on c.id = r.college_id
    left join registrations p on p.id = r.referred_by_id
    order by r.created_at`);
  return rowsOf<Record<string, unknown>>(res);
}

/** Admin: mark a student-added college as verified (keeps it on the datalist). */
export async function verifyCollege(id: number) {
  const db = await getDb();
  await db.update(colleges).set({ verified: true }).where(eq(colleges.id, id));
}

// ───────────────────────── evaluations ─────────────────────────

export async function evaluationsForUrl(url: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(evaluations).where(eq(evaluations.projectUrl, url));
  return n;
}

export async function insertEvaluation(v: {
  refCode: string | null;
  name: string;
  projectUrl: string;
  repoUrl: string | null;
  description: string;
  scores: Record<string, number>;
  total: number;
  mode: string;
  feedback: string;
}) {
  const db = await getDb();
  let registrationId: string | null = null;
  if (v.refCode) {
    const [r] = await db.select({ id: registrations.id }).from(registrations).where(eq(registrations.refCode, v.refCode)).limit(1);
    registrationId = r?.id ?? null;
  }
  const [row] = await db
    .insert(evaluations)
    .values({
      registrationId,
      name: v.name,
      projectUrl: v.projectUrl,
      repoUrl: v.repoUrl,
      description: v.description,
      scores: v.scores,
      total: v.total,
      mode: v.mode,
      feedback: v.feedback,
    })
    .returning({ id: evaluations.id });
  return row;
}

export async function topEvaluations(limit = 30) {
  const db = await getDb();
  const rows = await db.select().from(evaluations).orderBy(desc(evaluations.total), asc(evaluations.createdAt)).limit(limit);
  return rows.map((r) => ({ ...r, name: firstNameInitial(r.name) }));
}

// ───────────────────────── reset (development only) ─────────────────────────

/** Deletes every registration, visit and score; colleges and settings stay. */
export async function clearAllData() {
  if (process.env.NODE_ENV === "production") throw new Error("Disabled in production.");
  const db = await getDb();
  await db.delete(evaluations);
  await db.delete(registrations);
  await db.delete(schema.visits);
}

