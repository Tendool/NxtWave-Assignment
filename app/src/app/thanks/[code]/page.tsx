import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationView } from "@/db/queries";
import { getOrigin } from "@/lib/origin";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { ShareConfetti, SharePanel } from "@/components/site/share-panel";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Thanks({ params, searchParams }: PageProps<"/thanks/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  const again = sp.again === "1";

  const me = await getRegistrationView(code);
  if (!me) notFound();
  const mine = me.friends;
  const rank = me.rank;
  const collegeCount = me.collegeCount;

  const origin = await getOrigin();
  const link = `${origin}/?ref=${me.refCode}`;
  const firstName = me.name.split(/\s+/)[0];
  const message = `I just registered for a free workshop — "Build Your First AI Project in 60 Minutes". You end up with a deployed project for your resume. Seats are limited, register here:`;

  return (
    <>
      <SiteHeader />
      <ShareConfetti enabled={!again} />
      <main className="mx-auto max-w-2xl px-5 py-12 md:py-16">
        <Badge className="bg-marker">{again ? "Already registered" : "You're in"}</Badge>
        <h1 className="mt-5 text-5xl leading-[1] md:text-6xl">
          {again ? `Welcome back, ${firstName}.` : `Seat saved, ${firstName}.`}
        </h1>
        <p className="mt-4 text-lg text-ink/80">
          We will message you on WhatsApp with the joining link and a reminder before the session. Nothing else to do
          right now — except the part that moves {me.college} up the board.
        </p>

        <section className="paper-card hard mt-10 p-6 sm:p-8">
          <p className="label-mono text-flame">Your personal link</p>
          <h2 className="mt-1 mb-5 text-3xl">Bring three friends. Put your college on top.</h2>
          <SharePanel link={link} message={message} />
          <p className="mt-4 text-sm text-muted-foreground">
            Post it in your class group, your hostel group and one coding group. That is usually where it spreads.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-3 gap-3">
          {[
            { k: "Friends joined", v: mine },
            { k: "Your rank", v: rank ? `#${rank}` : "—" },
            { k: `${me.college.length > 14 ? "Your college" : me.college}`, v: collegeCount },
          ].map((s) => (
            <div key={s.k} className="paper-card hard-sm p-4">
              <p className="font-display text-4xl leading-none">{s.v}</p>
              <p className="label-mono mt-2 line-clamp-2 text-muted-foreground">{s.k}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/leaderboard" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">
            See the leaderboard
          </Link>
          <span className="text-muted-foreground">Your code: </span>
          <code className="font-mono font-medium">{me.refCode}</code>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
