import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./index";

const { settings } = schema;

export async function getSetting(key: string) {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row ? { value: row.value, updatedAt: row.updatedAt } : null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function deleteSetting(key: string) {
  const db = await getDb();
  await db.delete(settings).where(eq(settings.key, key));
}
