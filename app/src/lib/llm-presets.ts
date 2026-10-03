/** Client-safe catalogue used by both the admin UI and the server. No secrets here. */

export type Mode = "off" | "local" | "api";

export type LocalRuntime = { id: string; label: string; baseUrl: string; hint: string };
export const LOCAL_RUNTIMES: LocalRuntime[] = [
  { id: "ollama", label: "Ollama", baseUrl: "http://localhost:11434/v1", hint: "Easiest. Install from ollama.com, then pull a model." },
  { id: "lmstudio", label: "LM Studio", baseUrl: "http://localhost:1234/v1", hint: "Start its local server and load a model." },
  { id: "custom-local", label: "Other (OpenAI-compatible)", baseUrl: "http://localhost:8080/v1", hint: "llama.cpp server, vLLM, LocalAI, …" },
];

export type LocalModel = { tag: string; label: string; size: string; note: string };
/** Ollama tags. Sizes are the approximate default (4-bit) download. */
export const LOCAL_MODELS: LocalModel[] = [
  { tag: "qwen3:4b", label: "Qwen3 4B", size: "≈ 2.6 GB", note: "Fast. Fine for scoring on a normal laptop." },
  { tag: "qwen3:8b", label: "Qwen3 8B", size: "≈ 5.2 GB", note: "Better judgement. Wants ~8 GB RAM free." },
  { tag: "qwen2.5:7b", label: "Qwen2.5 7B", size: "≈ 4.7 GB", note: "Solid, very reliable JSON output." },
  { tag: "llama3.2:3b", label: "Llama 3.2 3B", size: "≈ 2.0 GB", note: "Smallest option. Basic quality." },
  { tag: "llama3.1:8b", label: "Llama 3.1 8B", size: "≈ 4.9 GB", note: "Good all-rounder." },
  { tag: "gemma3:4b", label: "Gemma 3 4B", size: "≈ 3.3 GB", note: "Good writing for a small model." },
  { tag: "mistral:7b", label: "Mistral 7B", size: "≈ 4.1 GB", note: "Older but dependable." },
  { tag: "phi4-mini", label: "Phi-4 mini", size: "≈ 2.5 GB", note: "Strong reasoning for its size." },
];

export type ApiProvider = {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  keyHint: string;
  free?: boolean;
  /** "anthropic" uses its own message format; everything else speaks the OpenAI-compatible chat API. */
  protocol: "openai" | "anthropic";
};
export const API_PROVIDERS: ApiProvider[] = [
  { id: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", defaultModel: "gemini-2.5-flash", keyHint: "Free key at aistudio.google.com", free: true, protocol: "openai" },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", keyHint: "Free key at console.groq.com", free: true, protocol: "openai" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "meta-llama/llama-3.3-70b-instruct:free", keyHint: "Key at openrouter.ai — has free models", free: true, protocol: "openai" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", keyHint: "Paid key from platform.openai.com", protocol: "openai" },
  { id: "anthropic", label: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com", defaultModel: "claude-haiku-4-5-20251001", keyHint: "Paid key from console.anthropic.com", protocol: "anthropic" },
  { id: "custom-api", label: "Other (OpenAI-compatible)", baseUrl: "", defaultModel: "", keyHint: "Any service with an OpenAI-style /chat/completions API", protocol: "openai" },
];

export type AiConfig = {
  mode: Mode;
  /** runtime id for local mode, provider id for api mode */
  provider: string;
  baseUrl: string;
  model: string;
};

export const DEFAULT_CONFIG: AiConfig = { mode: "off", provider: "", baseUrl: "", model: "" };

export const isLocalUrl = (u: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i.test(u.trim());
