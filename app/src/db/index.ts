import "server-only";
import path from "node:path";
import { count, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate as migrateLite } from "drizzle-orm/pglite/migrator";
import { Client, Pool } from "pg";
import * as schema from "./schema";
import { COLLEGE_SEED } from "./colleges-data";

/**
 * One Postgres schema, two runtimes:
 *  - DATABASE_URL set  → node-postgres (Supabase, Neon, RDS, any Postgres). Used in production.
 *  - not set (dev only) → PGlite, a real embedded Postgres persisted in .data/pg. No install needed.
 * Migrations in ./drizzle run automatically on first use and are idempotent.
 */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * The connection string. DATABASE_URL first; Vercel's Postgres/Neon integrations may instead create POSTGRES_URL,
 * or prefix every name (e.g. STORAGE_DATABASE_URL), so those are accepted too. Unpooled variants are skipped.
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  const named = env.DATABASE_URL || env.POSTGRES_URL;
  if (named) return named;
  const key = Object.keys(env)
    .filter((k) => /_(DATABASE|POSTGRES)_URL$/.test(k) && env[k])
    .sort()[0];
  return key ? env[key] : undefined;
}

const LOCK_ID = 727_274_001;

/**
 * Migrations hold a session-level advisory lock, which a transaction-mode pooler (PgBouncer, Neon's "-pooler"
 * host) can't keep. Run them over a direct connection: DATABASE_URL_UNPOOLED if set (Neon's Vercel integration
 * sets it), else the Neon pooled host with "-pooler" removed, else the same URL.
 */
export function directUrl(url: string) {
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;
  return url.replace(/(@[^/?]*?)-pooler\./, "$1.");
}

async function seedColleges(db: DB) {
  const [{ n }] = await db.select({ n: count() }).from(schema.colleges).where(eq(schema.colleges.verified, true));
  if (n >= COLLEGE_SEED.length) return;
  for (let i = 0; i < COLLEGE_SEED.length; i += 200) {
    await db
      .insert(schema.colleges)
      .values(COLLEGE_SEED.slice(i, i + 200).map((c) => ({ ...c, verified: true })))
      .onConflictDoNothing({ target: schema.colleges.slug });
  }
}

async function connect(): Promise<DB> {
  const url = databaseUrl();

  if (url) {
    const local = /@(localhost|127\.0\.0\.1)/.test(url);
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10),
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
    // Serialise migrations across concurrent cold starts, on a direct connection (see directUrl).
    const client = new Client({ connectionString: directUrl(url), ssl: local ? undefined : { rejectUnauthorized: false } });
    await client.connect();
    try {
      await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
      await migratePg(drizzlePg(client, { schema }), { migrationsFolder: MIGRATIONS });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
      await client.end().catch(() => {});
    }
    const db = drizzlePg(pool, { schema }) as unknown as DB;
    await seedColleges(db);
    return db;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set for this deployment. Add it in Vercel → Settings → Environment Variables (tick Production and Preview), then redeploy.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  // PGLITE_DATA_DIR=memory:// gives tests a throwaway database.
  const lite = new PGlite(process.env.PGLITE_DATA_DIR || path.join(process.cwd(), ".data", "pg"));
  const db = drizzleLite(lite, { schema });
  await migrateLite(db, { migrationsFolder: MIGRATIONS });
  await seedColleges(db as unknown as DB);
  return db as unknown as DB;
}

// Cache across hot reloads so dev doesn't open the embedded database twice.
const g = globalThis as unknown as { __build60Db?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__build60Db) {
    g.__build60Db = connect().catch((e) => {
      g.__build60Db = undefined; // allow retry after a failure
      throw e;
    });
  }
  return g.__build60Db;
}

export const backend = databaseUrl() ? "postgres" : "pglite (embedded)";
export { schema };
