import { ImageResponse } from "next/og";
import { getCount, getPublicCardData } from "@/db/queries";
import { LANDSCAPE, RefCard, STORY } from "@/lib/cards";
import { TARGET } from "@/lib/constants";

/** Personalised image for a referral link. `?format=story` is the 1080×1920 version for Instagram; add `&download=1` to save it. */
export async function GET(req: Request, ctx: RouteContext<"/og/ref/[code]">) {
  const { code } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const size = q.get("format") === "story" ? STORY : LANDSCAPE;

  const [who, claimed] = await Promise.all([/^[A-Za-z0-9-]{3,20}$/.test(code) ? getPublicCardData(code) : null, getCount()]);

  const headers: Record<string, string> = { "cache-control": "public, max-age=300, s-maxage=300" };
  if (q.get("download") === "1") headers["content-disposition"] = `attachment; filename="build60-${size.story ? "story" : "card"}.png"`;

  return new ImageResponse(<RefCard size={size} firstName={who?.firstName ?? null} college={who?.college ?? null} claimed={claimed} target={TARGET} />, {
    width: size.width,
    height: size.height,
    headers,
  });
}
