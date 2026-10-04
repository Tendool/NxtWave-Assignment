"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createRegistration } from "@/db/queries";
import { BRANCHES, YEARS } from "@/lib/constants";
import { setStudentToken } from "@/lib/student-session";
import { limitByIp, waitText } from "@/db/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")),
  college: z.string().trim().min(3, "Enter your college").max(120),
  branch: z.enum(BRANCHES, { error: "Pick your branch" }),
  year: z.enum(YEARS, { error: "Pick your year" }),
  ref: z.string().trim().max(20).optional(),
  src: z.string().trim().max(40).optional(),
});

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  // Generous enough for a campus or mobile-carrier NAT where many students share one IP; stops scripted sign-ups.
  const limit = await limitByIp("register", 30, 10 * 60);
  if (!limit.ok) return { error: `Too many sign-ups from this network. Try again in ${waitText(limit.retryAfterSec)}.`, values: raw };

  let result;
  try {
    result = await createRegistration(parsed.data);
  } catch (e) {
    console.error("registration failed:", e);
    return { error: "Something went wrong on our side. Please try again.", values: raw };
  }
  // Matching only the email OR only the number must not reveal whose registration it is (or that one exists
  // under a name): only someone who gives both gets sent to the existing page.
  if (result.duplicate && !result.accessToken) {
    return {
      error: "This email or WhatsApp number is already registered. Enter both exactly as you registered them to get back to your page.",
      values: raw,
    };
  }
  if (result.accessToken) await setStudentToken(result.accessToken);
  // redirect() throws, so it must stay outside the try/catch.
  redirect(`/thanks/${result.refCode}${result.duplicate ? "?again=1" : ""}`);
}
