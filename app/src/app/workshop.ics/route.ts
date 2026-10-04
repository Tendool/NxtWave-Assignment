import { getCampaign } from "@/db/campaign";
import { getOrigin } from "@/lib/origin";
import { buildIcs } from "@/lib/calendar";
import { WORKSHOP } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const [c, origin] = await Promise.all([getCampaign(), getOrigin()]);
  const ics = buildIcs({
    title: WORKSHOP.title,
    start: new Date(c.startsAt),
    minutes: WORKSHOP.durationMinutes,
    details: "Free live workshop by NxtWave. Bring a laptop. The joining link is shared before the session.",
    url: c.whatsappGroupUrl ?? origin,
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="build60-workshop.ics"',
      "cache-control": "no-store",
    },
  });
}
