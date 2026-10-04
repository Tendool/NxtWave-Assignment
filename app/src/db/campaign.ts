import "server-only";
import { getSetting, setSetting } from "./settings";
import { WORKSHOP } from "@/lib/constants";
import type { Campaign } from "@/lib/campaign";

const KEY = "campaign";

export async function getCampaign(): Promise<Campaign> {
  const fallback: Campaign = { startsAt: WORKSHOP.startsAt, whatsappGroupUrl: null };
  const row = await getSetting(KEY);
  if (!row) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(row.value) as Partial<Campaign>) };
  } catch {
    return fallback;
  }
}

export async function saveCampaign(c: Campaign) {
  await setSetting(KEY, JSON.stringify(c));
}
