import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "b60_admin";

function password() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // Local convenience only. In production the admin area stays locked until a password is set.
  return process.env.NODE_ENV === "production" ? null : "admin";
}

function sign(pw: string) {
  return createHmac("sha256", pw).update("build60-admin").digest("hex");
}

export function adminConfigured() {
  return password() !== null;
}

export function checkPassword(input: string) {
  const pw = password();
  if (!pw) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdminCookie() {
  const pw = password();
  if (!pw) return;
  (await cookies()).set(COOKIE, sign(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const pw = password();
  if (!pw) return false;
  const got = (await cookies()).get(COOKIE)?.value;
  if (!got) return false;
  const want = sign(pw);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
