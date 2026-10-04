import type { MetadataRoute } from "next";
import { getOrigin } from "@/lib/origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal pages and staff tools have nothing for a search engine.
      disallow: ["/admin", "/challenge", "/thanks/", "/api/", "/og/", "/visit"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
