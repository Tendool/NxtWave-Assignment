"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findRegistration, insertRegistration } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")),
  college: z.string().trim().min(2, "Enter your college").max(120),
  branch: z.string().min(1, "Pick your branch"),
  year: z.string().min(1, "Pick your year"),
  ref: z.string().trim().max(20).optional(),
  src: z.string().trim().max(40).optional(),
});

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

function makeCode(name: string) {
  const stem = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase().padEnd(3, "X");
  const bytes = randomBytes(3);
  const tail = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${stem}-${tail}`;
}

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }
  const d = parsed.data;

  // Already registered? Send them to their existing link instead of erroring.
  const existing = await findRegistration({ email: d.email, whatsapp: d.whatsapp });
  if (existing) redirect(`/thanks/${existing.ref_code}?again=1`);

  // A referral only counts if the code belongs to a real registrant.
  let referred_by: string | null = null;
  if (d.ref) {
    const referrer = await findRegistration({ code: d.ref.toUpperCase() });
    if (referrer && referrer.email !== d.email) referred_by = referrer.ref_code;
  }

  let created;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      created = await insertRegistration({
        name: d.name,
        email: d.email,
        whatsapp: d.whatsapp,
        college: d.college,
        branch: d.branch,
        year: d.year,
        ref_code: makeCode(d.name),
        referred_by,
        source: d.src || null,
      });
      break;
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e);
      // Unique violation on ref_code → retry with a new code; anything else → surface.
      if (!/ref_code/.test(msg)) {
        return { error: "Something went wrong on our side. Please try again.", values: raw };
      }
    }
  }
  if (!created) return { error: "Could not generate your link. Please try again.", values: raw };

  redirect(`/thanks/${created.ref_code}`);
}
