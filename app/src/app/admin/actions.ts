"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/admin-auth";
import { clearAllData, verifyCollege } from "@/db/queries";
import { saveCampaign } from "@/db/campaign";
import { hit, limitByIp, waitText } from "@/db/rate-limit";
import { parseIstLocal, parseWhatsappUrl } from "@/lib/campaign";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  // Per IP, plus a global cap so a botnet spreading guesses across many IPs is still slowed down.
  const mine = await limitByIp("admin-login", 5, 15 * 60);
  const everyone = await hit("admin-login:all", 40, 60 * 60);
  if (!mine.ok || !everyone.ok) return { error: `Too many attempts. Try again in ${waitText(Math.max(mine.retryAfterSec, everyone.ok ? 0 : everyone.retryAfterSec))}.` };
  const pw = String(formData.get("password") ?? "").slice(0, 200);
  if (!checkPassword(pw)) return { error: "Wrong password." };
  await setAdminCookie();
  redirect("/admin");
}

export async function logout() {
  await clearAdminCookie();
  redirect("/admin");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function approveCollege(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await verifyCollege(id);
  revalidatePath("/admin");
}

// Development only — throws in production.
export async function wipeData() {
  await requireAdmin();
  await clearAllData();
  revalidatePath("/", "layout");
}

export type CampaignFormState = { error?: string; saved?: boolean };

export async function saveCampaignSettings(_prev: CampaignFormState, formData: FormData): Promise<CampaignFormState> {
  await requireAdmin();
  const when = parseIstLocal(String(formData.get("startsAt") ?? ""));
  if (!when.ok) return { error: when.error };
  const wa = parseWhatsappUrl(String(formData.get("whatsappGroupUrl") ?? ""));
  if (!wa.ok) return { error: wa.error };
  await saveCampaign({ startsAt: when.value, whatsappGroupUrl: wa.value });
  revalidatePath("/", "layout");
  return { saved: true };
}
