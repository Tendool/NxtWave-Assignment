import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "b60_admin";
const SESSION_SEC = 60 * 60 * 12;

function password() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // Local convenience only. In production the admin area stays locked until a password is set.
  return process.env.NODE_ENV === "production" ? null : "admin";
}

/** Signs the issue time with the password, so a session expires on its own and dies when the password changes. */
function sign(pw: string, issuedAt: number) {
  return createHmac("sha256", pw).update(`build60-admin:${issuedAt}`).digest("hex");
}

/** Constant-time comparison that doesn't leak the length either: both sides are hashed to 32 bytes first. */
function same(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function adminConfigured() {
  return password() !== null;
}

export function checkPassword(input: string) {
  const pw = password();
  if (!pw) return false;
  return same(input, pw);
}

export async function setAdminCookie() {
  const pw = password();
  if (!pw) return;
  const iat = Math.floor(Date.now() / 1000);
  (await cookies()).set(COOKIE, `${iat}.${sign(pw, iat)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SEC,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const pw = password();
  if (!pw) return false;
  const got = (await cookies()).get(COOKIE)?.value;
  const m = got && /^(\d{10})\.([a-f0-9]{64})$/.exec(got);
  if (!m) return false;
  const iat = Number(m[1]);
  const age = Math.floor(Date.now() / 1000) - iat;
  if (age < 0 || age > SESSION_SEC) return false; // the browser's maxAge is advisory; enforce it here too
  return same(m[2], sign(pw, iat));
}

/** For admin pages: bounce to the login screen unless signed in. */
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin");
}
