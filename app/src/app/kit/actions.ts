"use server";

import { z } from "zod";
import { askJson } from "@/lib/ai";
import { getOrigin } from "@/lib/origin";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  college: z.string().trim().min(2, "Enter your college").max(100),
  audience: z.enum(["class group", "hostel group", "coding club", "department group"]),
});

export type KitState = {
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  kit?: { link: string; messages: { label: string; text: string }[]; source: "ai" | "template" };
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);

export async function buildKit(_prev: KitState, formData: FormData): Promise<KitState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { fieldErrors, values: raw };
  }
  const { name, college, audience } = parsed.data;
  const origin = await getOrigin();
  // "amb-" is how the admin dashboard recognises ambassador traffic.
  const link = `${origin}/?src=amb-${slug(college)}-${slug(name.split(" ")[0])}`;

  const templates = [
    {
      label: "Short and direct",
      text: `Final-years: free workshop — "Build Your First AI Project in 60 Minutes". You leave with a deployed project for your resume. Seats are limited. Register: ${link}`,
    },
    {
      label: "Placement angle",
      text: `Everyone has the same 3 tutorial projects on their resume. This free workshop gets you one that's actually yours, live on a link, in 60 minutes. ${college} is on the leaderboard — let's get it to the top. ${link}`,
    },
    {
      label: "Personal note",
      text: `Hey, I'm registering for this free AI workshop and thought of you all. No prior AI experience needed, you build and deploy a project live. Takes 30 seconds to sign up: ${link}`,
    },
  ];

  const ai = await askJson<{ messages: { label: string; text: string }[] }>(
    "You write WhatsApp forwards that a college student sends to their own friends. Casual, specific, zero hype words, no emojis spam (max one), under 55 words each. Always include the exact link given. Reply ONLY with JSON: {\"messages\":[{\"label\":\"2-3 word angle\",\"text\":\"...\"}]} with exactly 3 messages that take different angles (curiosity, resume/placement, college pride).",
    `Sender: ${name}. College: ${college}. Posting in: ${audience}. Workshop: free, "Build Your First AI Project in 60 Minutes", for final-year engineering students, leave with a deployed project. Link: ${link}`,
    700,
  );
  const valid =
    ai?.messages?.length === 3 && ai.messages.every((m) => typeof m.text === "string" && m.text.includes(link) && m.text.length < 600);

  return {
    values: raw,
    kit: valid
      ? { link, messages: ai!.messages.map((m) => ({ label: String(m.label).slice(0, 30), text: m.text })), source: "ai" }
      : { link, messages: templates, source: "template" },
  };
}
