"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { logVisit } from "@/db/visits";
import { limitByIp } from "@/db/rate-limit";

const COOKIE = "b60_vid";
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram|slack|discord|linkedin/i;

/** Called once per page load from the landing page. One row per browser per day per source, so refreshes don't inflate it. */
export async function recordVisit(source: string | null, referred: boolean) {
  const ua = (await headers()).get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;

  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    id = randomBytes(16).toString("hex");
    jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const src = source?.trim().slice(0, 40) || null;
  try {
    // A script clearing cookies could otherwise fill the table; real people never get near this.
    if (!(await limitByIp("visit", 120, 60 * 60)).ok) return;
    await logVisit(id, src, referred);
  } catch (e) {
    console.error("visit log failed:", e); // analytics must never break the page
  }
}
