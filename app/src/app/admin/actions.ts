"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/admin-auth";
import { clearDemoData, seedDemoData, verifyCollege } from "@/db/queries";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const pw = String(formData.get("password") ?? "");
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

// Development only — both throw in production.
export async function loadDemoData() {
  await requireAdmin();
  await seedDemoData(64);
  revalidatePath("/", "layout");
}

export async function wipeData() {
  await requireAdmin();
  await clearDemoData();
  revalidatePath("/", "layout");
}
