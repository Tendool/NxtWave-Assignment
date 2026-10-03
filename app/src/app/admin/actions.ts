"use server";

import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, setAdminCookie } from "@/lib/admin-auth";

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
