import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { deleteSetting, getSetting, setSetting } from "@/db/settings";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { API_PROVIDERS, DEFAULT_CONFIG, type AiConfig } from "@/lib/llm-presets";

/**
 * One place that talks to a language model. Which one is chosen in /admin/ai:
 *  - local: an OpenAI-compatible server on this machine (Ollama, LM Studio, llama.cpp, …)
 *  - api:   a hosted provider with an API key (Gemini, Groq, OpenRouter, OpenAI, Anthropic, custom)
 *  - off:   no model; callers fall back to their built-in logic
 * The API key is stored encrypted and is only ever decrypted here, server-side.
 */

/**
 * Local models need a machine with the runtime (and ideally a GPU). The deployed server has neither, so they are
 * off in production unless ALLOW_LOCAL_MODELS=true says this server is such a machine (=false forces them off
 * anywhere). Enforced here and in the
 * admin actions, not just hidden in the UI.
 */
export const LOCAL_MODELS_ALLOWED =
  process.env.ALLOW_LOCAL_MODELS === "true" ? true : process.env.ALLOW_LOCAL_MODELS === "false" ? false : process.env.NODE_ENV !== "production";
export const LOCAL_MODELS_BLOCKED = "Local models aren’t available on this server: it has no GPU. Use an API key instead (Gemini, Groq and OpenRouter have free tiers).";

const CONFIG_KEY = "llm_config";
const API_KEY_KEY = "llm_api_key";

// ───────────── config + key storage ─────────────

type Loaded = { config: AiConfig; apiKey: string | null; source: "db" | "env" | "none"; keyUnreadable: boolean; keyUpdatedAt: Date | null };
let cache: { at: number; value: Loaded } | null = null;

export function invalidateAiConfig() {
  cache = null;
}

export async function loadAi(): Promise<Loaded> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;

  const [cfgRow, keyRow] = await Promise.all([getSetting(CONFIG_KEY), getSetting(API_KEY_KEY)]);
  let value: Loaded;

  if (cfgRow) {
    let config = DEFAULT_CONFIG;
    try {
      config = { ...DEFAULT_CONFIG, ...(JSON.parse(cfgRow.value) as AiConfig) };
    } catch {}
    if (config.mode === "local" && !LOCAL_MODELS_ALLOWED) config = DEFAULT_CONFIG; // saved elsewhere; never run it here
    const apiKey = keyRow ? decryptSecret(keyRow.value) : null;
    value = { config, apiKey, source: "db", keyUnreadable: !!keyRow && apiKey === null, keyUpdatedAt: keyRow?.updatedAt ?? null };
  } else if (process.env.ANTHROPIC_API_KEY) {
    // Back-compat: an env key works until someone configures AI in the admin panel.
    value = {
      config: { mode: "api", provider: "anthropic", baseUrl: "https://api.anthropic.com", model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001" },
      apiKey: process.env.ANTHROPIC_API_KEY,
      source: "env",
      keyUnreadable: false,
      keyUpdatedAt: null,
    };
  } else {
    value = { config: DEFAULT_CONFIG, apiKey: null, source: "none", keyUnreadable: false, keyUpdatedAt: null };
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Everything the admin UI may know. Deliberately has no key material — only whether one exists. */
export async function getPublicAiState() {
  const l = await loadAi();
  return {
    config: l.config,
    hasKey: l.apiKey !== null || l.keyUnreadable,
    keyUnreadable: l.keyUnreadable,
    keyUpdatedAt: l.keyUpdatedAt ? l.keyUpdatedAt.toISOString() : null,
    source: l.source,
  };
}

export async function saveAiConfig(config: AiConfig, newApiKey?: string) {
  await setSetting(CONFIG_KEY, JSON.stringify(config));
  if (newApiKey) await setSetting(API_KEY_KEY, encryptSecret(newApiKey));
  invalidateAiConfig();
}

export async function removeApiKey() {
  await deleteSetting(API_KEY_KEY);
  invalidateAiConfig();
}

/** Used only by the password-gated reveal action. */
export async function readStoredApiKey() {
  const row = await getSetting(API_KEY_KEY);
  return row ? decryptSecret(row.value) : null;
}

/** A short label for which model produced a result, e.g. "ollama · llama3.1:8b". */
export async function modelLabel(model?: string) {
  const { config } = await loadAi();
  return config.mode === "off" ? null : `${config.provider} · ${model ?? config.model}`;
}

/** The reviewer panel: the main model, plus the second one if configured and different. */
export async function reviewerModels(): Promise<string[]> {
  if (!(await aiEnabled())) return [];
  const { config } = await loadAi();
  const second = config.secondModel?.trim();
  return second && second !== config.model ? [config.model, second] : [config.model];
}

export async function aiEnabled() {
  const { config, apiKey } = await loadAi();
  if (config.mode === "local") return !!config.baseUrl && !!config.model;
  if (config.mode === "api") return !!config.model && (!!apiKey || config.provider === "custom-api");
  return false;
}

// ───────────── calling the model ─────────────

const scrub = (text: string, key: string | null) => (key ? text.split(key).join("[hidden]") : text);

async function complete(cfg: AiConfig, apiKey: string | null, system: string, user: string, maxTokens: number, temperature = 0.2): Promise<string> {
  if (cfg.mode === "local" && !LOCAL_MODELS_ALLOWED) throw new Error(LOCAL_MODELS_BLOCKED);
  const timeout = cfg.mode === "local" ? 240_000 : 30_000; // reasoning models on CPU can think for minutes

  if (cfg.mode === "api" && API_PROVIDERS.find((p) => p.id === cfg.provider)?.protocol === "anthropic") {
    const client = new Anthropic({ apiKey: apiKey ?? "", timeout });
    const res = await client.messages.create({ model: cfg.model, max_tokens: maxTokens, temperature: Math.min(1, temperature), system, messages: [{ role: "user", content: user }] });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }

  const base = cfg.baseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  // Local reasoning models (Qwen3, DeepSeek-R1…) can burn the whole token budget thinking and answer nothing.
  // Ask them to think briefly; servers that don't understand the field get a plain retry below.
  const body = (extras: boolean) =>
    JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(extras ? { response_format: { type: "json_object" }, ...(cfg.mode === "local" ? { reasoning_effort: "low" } : {}) } : {}),
    });

  const post = (extras: boolean) => fetch(`${base}/chat/completions`, { method: "POST", headers, body: body(extras), signal: AbortSignal.timeout(timeout) });
  let res = await post(true);
  // Some servers reject response_format / reasoning_effort; retry once without them.
  if (res.status === 400 || res.status === 422) res = await post(false);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

/** Reasoning models (Qwen3, DeepSeek-R1, …) prefix their answer with a <think> block. */
const stripThinking = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

export type JsonResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Ask for a JSON object, and say *why* when it fails. */
export async function askJsonResult<T>(system: string, user: string, maxTokens = 900, temperature = 0.2, opts: { model?: string } = {}): Promise<JsonResult<T>> {
  const loaded = await loadAi();
  const config = opts.model ? { ...loaded.config, model: opts.model } : loaded.config;
  const apiKey = loaded.apiKey;
  if (!(await aiEnabled())) return { ok: false, error: "AI is switched off." };
  try {
    const text = stripThinking(await complete(config, apiKey, system, user, maxTokens, temperature));
    if (!text) return { ok: false, error: "The model returned nothing (a reasoning model may have run out of tokens while thinking)." };
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) return { ok: false, error: "The model's answer wasn't JSON." };
    return { ok: true, data: JSON.parse(text.slice(start, end + 1)) as T };
  } catch (e) {
    const err = e as Error;
    const msg = err.name === "TimeoutError" || err.name === "AbortError" ? "Timed out." : scrub(err.message, apiKey).slice(0, 160);
    console.error("AI call failed:", msg);
    return { ok: false, error: msg };
  }
}

/** Ask for a JSON object. Returns null on any failure so callers can fall back to their built-in logic. */
export async function askJson<T>(system: string, user: string, maxTokens = 900, temperature = 0.2, opts: { model?: string } = {}): Promise<T | null> {
  const r = await askJsonResult<T>(system, user, maxTokens, temperature, opts);
  return r.ok ? r.data : null;
}

// ───────────── admin helpers ─────────────

export type TestResult = { ok: boolean; ms: number; reply?: string; error?: string };

/** Runs a tiny prompt against the *proposed* settings (not yet saved) and reports what happened. */
export async function testConnection(cfg: AiConfig, apiKey: string | null): Promise<TestResult> {
  const started = Date.now();
  try {
    const text = stripThinking(await complete(cfg, apiKey, "You are a connectivity check.", 'Reply with only this JSON: {"ok":true}', 600));  // reasoning models spend tokens thinking before they answer
    const ok = /"ok"\s*:\s*true/i.test(text);
    return { ok, ms: Date.now() - started, reply: text.slice(0, 80), error: ok ? undefined : "The model answered, but not in the expected format. It may be too small to follow instructions." };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    const code = err.cause?.code;
    let msg = scrub(err.message, apiKey);
    if (code === "ECONNREFUSED") msg = "Connection refused — nothing is listening at that address.";
    else if (err.name === "TimeoutError" || err.name === "AbortError") msg = "Timed out. A large local model may need longer to load the first time — try again.";
    return { ok: false, ms: Date.now() - started, error: msg.slice(0, 300) };
  }
}

/** Lists models a local runtime reports as available. */
export async function detectLocalModels(baseUrl: string, runtime: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
  if (!LOCAL_MODELS_ALLOWED) return { ok: false, models: [], error: LOCAL_MODELS_BLOCKED };
  const base = baseUrl.replace(/\/+$/, "");
  try {
    if (runtime === "ollama") {
      const origin = base.replace(/\/v1$/, "");
      const res = await fetch(`${origin}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { models?: { name: string }[] };
      return { ok: true, models: (j.models ?? []).map((m) => m.name) };
    }
    const res = await fetch(`${base}/models`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { data?: { id: string }[] };
    return { ok: true, models: (j.data ?? []).map((m) => m.id) };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    const refused = err.cause?.code === "ECONNREFUSED" || /fetch failed/i.test(err.message);
    return { ok: false, models: [], error: refused ? "Could not reach it. Is the app running on this machine?" : err.message };
  }
}
