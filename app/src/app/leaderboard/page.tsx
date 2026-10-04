import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { leaderboard } from "@/db/queries";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Podium, RankRow } from "@/components/site/podium";
import { NumberTicker } from "@/components/fx/number-ticker";
import { TOP_PRIZES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard — Build60" };

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="paper-card px-6 py-12 text-center text-muted-foreground">{children}</p>;
}

export default async function LeaderboardPage() {
  const { people, colleges, total } = await leaderboard();
  const collegeMax = colleges[0]?.registrations ?? 1;
  const peopleMax = people[0]?.referrals ?? 1;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
        <div className="rise">
          <p className="label-mono flex items-center gap-2 text-flame">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-flame opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-flame" />
            </span>
            Live standings
          </p>
          <h1 className="mt-2 text-5xl md:text-6xl">The leaderboard.</h1>
          <p className="mt-3 text-ink/75">
            <span className="font-semibold text-ink">
              <NumberTicker value={total} />
            </span>{" "}
            registered so far. Colleges rank by total registrations; people rank by friends they brought in.
          </p>
        </div>

        <Tabs defaultValue="colleges" className="mt-8">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-md border-[1.5px] border-ink bg-card p-1">
            <TabsTrigger value="colleges" className="label-mono h-10 flex-1 rounded-sm data-active:bg-ink data-active:text-paper">
              <Building2 className="size-3.5" /> Colleges
            </TabsTrigger>
            <TabsTrigger value="people" className="label-mono h-10 flex-1 rounded-sm data-active:bg-ink data-active:text-paper">
              <Users className="size-3.5" /> Top referrers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colleges" className="mt-8">
            {colleges.length === 0 ? (
              <Empty>Nobody yet. Be the first from your college.</Empty>
            ) : (
              <>
                <Podium unit="registered" entries={colleges.slice(0, 3).map((c) => ({ name: c.college, sub: c.state, value: c.registrations }))} />
                {colleges.length > 3 && (
                  <ol className="paper-card hard mt-0 divide-y divide-ink/15 overflow-hidden rounded-t-none">
                    {colleges.slice(3).map((c, i) => (
                      <RankRow key={c.college} rank={i + 4} name={c.college} sub={c.state} value={c.registrations} max={collegeMax} delay={i * 0.04} />
                    ))}
                  </ol>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="people" className="mt-8">
            {people.length === 0 ? (
              <Empty>No referrals yet. Share your link to get on the board.</Empty>
            ) : (
              <>
                <Podium unit="friends" entries={people.slice(0, 3).map((p) => ({ name: p.name, sub: p.college, value: p.referrals }))} />
                {people.length > 3 && (
                  <ol className="paper-card hard divide-y divide-ink/15 overflow-hidden rounded-t-none">
                    {people.slice(3).map((p, i) => (
                      <RankRow key={p.code} rank={i + 4} name={p.name} sub={p.college} value={p.referrals} max={peopleMax} delay={i * 0.04} />
                    ))}
                  </ol>
                )}
              </>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              {TOP_PRIZES.title} when registration closes win {TOP_PRIZES.amounts.join(" / ")} Amazon vouchers.
            </p>
          </TabsContent>
        </Tabs>

        <div className="paper-card mt-10 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl leading-none">Not on the board yet?</p>
            <p className="mt-1 text-sm text-muted-foreground">Register, then share your link — every friend who signs up counts for you and your college.</p>
          </div>
          <Link href="/#register" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border-[1.5px] border-ink bg-flame px-5 font-semibold text-white hard-sm transition-transform hover:-translate-y-0.5">
            Save your seat <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
