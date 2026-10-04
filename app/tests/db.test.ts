import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createRegistration, getRegistrationView, searchColleges } from "@/db/queries";
import { GRACE_MS, startAttempt, submitAttempt } from "@/db/challenge";
import { conversionBySource, logVisit } from "@/db/visits";

const { registrations, attempts } = schema;

let n = 0;
/** A fresh, valid registration each call. */
function person(over: Partial<Parameters<typeof createRegistration>[0]> = {}) {
  n++;
  return {
    name: `Test Student${n}`,
    email: `student${n}@example.edu`,
    whatsapp: String(9000000000 + n),
    college: "VIT Vellore",
    branch: "CSE" as const,
    year: "Final year (4th)" as const,
    ...over,
  };
}

async function idOf(refCode: string) {
  const db = await getDb();
  const [r] = await db.select({ id: registrations.id }).from(registrations).where(eq(registrations.refCode, refCode));
  return r.id;
}

beforeAll(async () => {
  await getDb(); // run migrations + seed once
});

describe("registration rules", () => {
  it("registers once; the same email and number get the same link back, with access", async () => {
    const p = person();
    const first = await createRegistration(p);
    expect(first.duplicate).toBe(false);
    expect(first.accessToken).toBeTruthy();

    const again = await createRegistration({ ...p, email: p.email.toUpperCase() });
    expect(again).toMatchObject({ refCode: first.refCode, duplicate: true, accessToken: first.accessToken });
  });

  it("knowing only the email (or only the number) never hands over someone's access", async () => {
    const p = person();
    const first = await createRegistration(p);
    const sameEmail = await createRegistration({ ...person(), email: p.email });
    expect(sameEmail.refCode).toBe(first.refCode);
    expect(sameEmail.accessToken).toBeUndefined();
    const sameNumber = await createRegistration({ ...person(), whatsapp: p.whatsapp });
    expect(sameNumber.accessToken).toBeUndefined();
  });

  it("credits a real referrer, ignores unknown codes and self-referral", async () => {
    const referrer = await createRegistration(person());
    const friend = await createRegistration(person({ ref: referrer.refCode.toLowerCase() }));
    const stranger = await createRegistration(person({ ref: "NOPE-ZZZ" }));
    expect(friend.duplicate).toBe(false);
    expect(stranger.duplicate).toBe(false);
    expect((await getRegistrationView(referrer.refCode))?.friends).toBe(1);

    // The database itself refuses a row that refers to itself.
    const db = await getDb();
    const id = await idOf(referrer.refCode);
    await expect(db.update(registrations).set({ referredById: id }).where(eq(registrations.id, id))).rejects.toThrow();
  });

  it("the database rejects an invalid Indian mobile number", async () => {
    const db = await getDb();
    const [college] = await db.select({ id: schema.colleges.id }).from(schema.colleges).limit(1);
    await expect(
      db.insert(registrations).values({ name: "X", email: "bad@example.edu", whatsapp: "12345", collegeId: college.id, branch: "CSE", year: "Final year (4th)", refCode: "BAD-111" }),
    ).rejects.toThrow();
  });

  it("keeps a college the student typed that isn't in the list, unverified", async () => {
    const r = await createRegistration(person({ college: "Imaginary Institute of Testing" }));
    const db = await getDb();
    const res = await db.execute(sql`select c.verified from registrations r join colleges c on c.id = r.college_id where r.ref_code = ${r.refCode}`);
    expect((res as unknown as { rows: { verified: boolean }[] }).rows[0].verified).toBe(false);
  });
});

describe("college search", () => {
  it("finds a college by name, ranking name-prefix matches first", async () => {
    const hits = await searchColleges("vit vellore");
    expect(hits[0]?.name).toMatch(/VIT Vellore/i);
  });

  it("matches across name, city and state, and ignores punctuation", async () => {
    const hits = await searchColleges("nit, warangal!");
    expect(hits.some((h) => /warangal/i.test(`${h.name} ${h.city}`))).toBe(true);
  });

  it("returns nothing for a one-letter query and never shows unverified colleges", async () => {
    expect(await searchColleges("v")).toEqual([]);
    expect(await searchColleges("imaginary institute")).toEqual([]);
  });
});

describe("challenge deadline", () => {
  const work = { repoUrl: "https://github.com/someone/project", hostedUrl: null, videoUrl: null, notes: "Built it.", zip: null, videoFile: null };

  async function startedStudent() {
    const r = await createRegistration(person());
    const id = await idOf(r.refCode);
    expect(await startAttempt(id)).toEqual({ ok: true });
    return id;
  }

  async function setDeadline(registrationId: string, msFromNow: number) {
    const db = await getDb();
    await db.update(attempts).set({ deadlineAt: new Date(Date.now() + msFromNow) }).where(eq(attempts.registrationId, registrationId));
  }

  it("never restarts a running clock", async () => {
    const id = await startedStudent();
    const db = await getDb();
    const [before] = await db.select().from(attempts).where(eq(attempts.registrationId, id));
    await startAttempt(id);
    const [after] = await db.select().from(attempts).where(eq(attempts.registrationId, id));
    expect(after.deadlineAt.getTime()).toBe(before.deadlineAt.getTime());
  });

  it("accepts a submission inside the grace period", async () => {
    const id = await startedStudent();
    await setDeadline(id, -(GRACE_MS - 10_000));
    expect(await submitAttempt(id, work)).toMatchObject({ ok: true });
  });

  it("rejects a submission after deadline + grace, and a second submission", async () => {
    const late = await startedStudent();
    await setDeadline(late, -(GRACE_MS + 1_000));
    expect(await submitAttempt(late, work)).toMatchObject({ ok: false, error: expect.stringMatching(/time's up/i) });

    const twice = await startedStudent();
    expect(await submitAttempt(twice, work)).toMatchObject({ ok: true });
    expect(await submitAttempt(twice, work)).toMatchObject({ ok: false, error: expect.stringMatching(/already submitted/i) });
  });
});

describe("visit tracking", () => {
  it("counts one visit per browser per day and joins visits to registrations by source", async () => {
    await logVisit("a".repeat(32), "insta-test", false);
    await logVisit("a".repeat(32), "insta-test", false); // refresh — same browser, same day
    await logVisit("b".repeat(32), "insta-test", false);
    await createRegistration(person({ src: "insta-test" }));

    const row = (await conversionBySource()).find((r) => r.key === "insta-test");
    expect(row).toMatchObject({ visitors: 2, registered: 1 });
  });

  it("credits a browser to every source it arrives from, not just the first one that day", async () => {
    await logVisit("c".repeat(32), null, false); // opened the site directly
    await logVisit("c".repeat(32), "tpo-test", false); // later tapped the TPO email link
    const rows = await conversionBySource();
    expect(rows.find((r) => r.key === "tpo-test")?.visitors).toBe(1);
  });
});
