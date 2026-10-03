import { ImageResponse } from "next/og";
import { getProof } from "@/db/challenge";
import { LANDSCAPE, ProofCard, STORY } from "@/lib/cards";

/** A student's opt-in result card. Only exists once they've chosen to share it. */
export async function GET(req: Request, ctx: RouteContext<"/og/proof/[slug]">) {
  const { slug } = await ctx.params;
  const proof = await getProof(slug);
  if (!proof) return new Response("Not found", { status: 404 });

  const q = new URL(req.url).searchParams;
  const size = q.get("format") === "story" ? STORY : LANDSCAPE;
  const headers: Record<string, string> = { "cache-control": "public, max-age=600, s-maxage=600" };
  if (q.get("download") === "1") headers["content-disposition"] = `attachment; filename="build60-result-${size.story ? "story" : "card"}.png"`;

  return new ImageResponse(
    <ProofCard size={size} firstName={proof.firstName} college={proof.college} title={proof.title} minutes={proof.minutes} total={proof.total} scores={proof.scores} />,
    { width: size.width, height: size.height, headers },
  );
}
