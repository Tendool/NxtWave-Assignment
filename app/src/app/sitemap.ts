import type { MetadataRoute } from "next";
import { getOrigin } from "@/lib/origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getOrigin();
  return [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/leaderboard`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${origin}/gallery`, changeFrequency: "daily", priority: 0.6 },
    { url: `${origin}/kit`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${origin}/evaluate`, changeFrequency: "weekly", priority: 0.4 },
  ];
}
