import { AUTHOR } from "@/lib/constants";

/** humanstxt.org: who built the site. */
export function GET() {
  const body = `/* TEAM */\nDesigned and built by: ${AUTHOR}\nFor: NxtWave Growth Intern challenge, Round 1\n\n/* SITE */\nBuilt with: Next.js, Postgres, Drizzle, Tailwind, Three.js\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
