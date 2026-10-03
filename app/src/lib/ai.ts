import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const key = process.env.ANTHROPIC_API_KEY;
const client = key ? new Anthropic({ apiKey: key }) : null;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export const aiAvailable = () => client !== null;

/** Ask for a JSON object and parse it. Returns null on any failure so callers can fall back. */
export async function askJson<T>(system: string, user: string, maxTokens = 900): Promise<T | null> {
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch (e) {
    console.error("AI call failed:", (e as Error).message);
    return null;
  }
}
