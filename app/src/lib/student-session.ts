import "server-only";
import { cookies } from "next/headers";

/**
 * The referral code is public — it is in every link a student shares — so it can never prove who someone is.
 * Identity is a private random token, kept in an httpOnly cookie on the student's own browser.
 */
const COOKIE = "b60_me";

export async function setStudentToken(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function getStudentToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}
