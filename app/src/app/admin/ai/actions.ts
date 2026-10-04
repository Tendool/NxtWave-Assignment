"use server";

import { z } from "zod";
import { checkPassword, isAdmin } from "@/lib/admin-auth";
import { canEncrypt } from "@/lib/crypto";
import { hit, waitText } from "@/db/rate-limit";
import { detectLocalModels, loadAi, readStoredApiKey, removeApiKey, saveAiConfig, testConnection, type TestResult } from "@/lib/ai";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

const configSchema = z.object({
  mode: z.enum(["off", "local", "api"]),
  provider: z.string().trim().max(40),
  baseUrl: z.string().trim().max(300),
  model: z.string().trim().max(120),
  secondModel: z.string().trim().max(120).optional(),
  apiKey: z.string().trim().max(500).optional(),
});

type Parsed = z.infer<typeof configSchema>;

function validate(input: unknown): { ok: true; data: Parsed } | { ok: false; error: string } {
  const r = configSchema.safeParse(input);
  if (!r.success) return { ok: false, error: "Invalid settings." };
  const d = r.data;
  if (d.mode === "off") return { ok: true, data: d };
  if (!d.model) return { ok: false, error: "Choose or enter a model name." };
  if (!/^https?:\/\//i.test(d.baseUrl)) return { ok: false, error: "Server address must start with http:// or https://" };
  return { ok: true, data: d };
}

const needsKey = (provider: string) => provider !== "custom-api";

export type SaveResult = { ok: boolean; error?: string; hasKey?: boolean };

export async function saveAi(input: unknown): Promise<SaveResult> {
  await requireAdmin();
  const v = validate(input);
  if (!v.ok) return { ok: false, error: v.error };
  const { apiKey, ...config } = v.data;

  const state = await loadAi();
  const keyAfter = !!apiKey || state.apiKey !== null;
  if (config.mode === "api" && needsKey(config.provider) && !keyAfter) {
    return { ok: false, error: "Add an API key for this provider first." };
  }
  if (apiKey && !canEncrypt()) {
    return { ok: false, error: "Set SETTINGS_SECRET (or ADMIN_PASSWORD) on the server before storing a key." };
  }
  await saveAiConfig(config, apiKey || undefined);
  return { ok: true, hasKey: keyAfter };
}

export async function testAi(input: unknown): Promise<TestResult> {
  await requireAdmin();
  const v = validate(input);
  if (!v.ok) return { ok: false, ms: 0, error: v.error };
  if (v.data.mode === "off") return { ok: false, ms: 0, error: "AI is switched off." };
  const { apiKey, ...config } = v.data;
  // Use the key typed in the form, else the saved one. Never echoed back.
  const key = apiKey || (await loadAi()).apiKey;
  if (config.mode === "api" && needsKey(config.provider) && !key) return { ok: false, ms: 0, error: "No API key to test with." };
  const first = await testConnection(config, key);
  if (!first.ok || !config.secondModel) return first;
  // The second reviewer has to work too, or the panel silently degrades to one opinion.
  const second = await testConnection({ ...config, model: config.secondModel }, key);
  return second.ok ? { ...first, ms: first.ms + second.ms } : { ...second, error: `Main model works, but the second reviewer failed: ${second.error}` };
}

export async function detectModels(input: { baseUrl: string; runtime: string }) {
  await requireAdmin();
  if (!/^https?:\/\//i.test(input.baseUrl)) return { ok: false, models: [] as string[], error: "Server address must start with http://" };
  return detectLocalModels(input.baseUrl, input.runtime);
}

export async function deleteKey(): Promise<{ ok: boolean }> {
  await requireAdmin();
  await removeApiKey();
  return { ok: true };
}

// ───────────── password-gated reveal ─────────────
// A stolen session cookie alone must not be enough to read the key: the password is re-checked here,
// and attempts are throttled.

export async function revealKey(password: string): Promise<{ ok: boolean; key?: string; error?: string }> {
  await requireAdmin();

  // Counted in the database: an in-memory counter resets on every serverless cold start.
  const limit = await hit("reveal-key", 5, 10 * 60);
  if (!limit.ok) return { ok: false, error: `Too many attempts. Try again in ${waitText(limit.retryAfterSec)}.` };

  if (!checkPassword(String(password ?? "").slice(0, 200))) return { ok: false, error: "Wrong password." };

  const key = await readStoredApiKey();
  if (!key) return { ok: false, error: "The saved key can't be decrypted (the server secret changed). Enter it again." };
  return { ok: true, key };
}
