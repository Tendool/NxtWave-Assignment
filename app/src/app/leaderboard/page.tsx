import { leaderboard } from "@/db/queries";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard — Build60" };

function Rank({ n }: { n: number }) {
  return (
    <span
      className={`inline-flex size-8 items-center justify-center rounded-sm border-[1.5px] border-ink font-display text-lg ${
        n === 1 ? "bg-marker" : n <= 3 ? "bg-secondary" : "bg-card"
      }`}
    >
      {n}
    </span>
  );
}

export default async function LeaderboardPage() {
  const { people, colleges, total } = await leaderboard();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="label-mono text-flame">Live standings</p>
        <h1 className="mt-2 text-5xl md:text-6xl">The leaderboard.</h1>
        <p className="mt-3 text-ink/75">
          {total} registered so far. People rank by friends they brought in; colleges rank by total registrations.
        </p>

        <Tabs defaultValue="colleges" className="mt-8">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-md border-[1.5px] border-ink bg-card p-0">
            {[
              ["colleges", "Colleges"],
              ["people", "Top referrers"],
            ].map(([v, l]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="label-mono h-11 flex-1 rounded-none data-active:bg-ink data-active:text-paper"
              >
                {l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="colleges" className="mt-5">
            <div className="paper-card hard overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-[1.5px] border-ink hover:bg-transparent">
                    <TableHead className="w-14 label-mono">#</TableHead>
                    <TableHead className="label-mono">College</TableHead>
                    <TableHead className="label-mono text-right">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colleges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        Nobody yet. Be the first from your college.
                      </TableCell>
                    </TableRow>
                  )}
                  {colleges.map((c, i) => (
                    <TableRow key={c.college} className="border-ink/20">
                      <TableCell>
                        <Rank n={i + 1} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <span className="font-medium">{c.college}</span>
                        {c.state && <span className="block text-xs text-muted-foreground">{c.state}</span>}
                      </TableCell>
                      <TableCell className="text-right font-display text-2xl">{c.registrations}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="people" className="mt-5">
            <div className="paper-card hard overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-[1.5px] border-ink hover:bg-transparent">
                    <TableHead className="w-14 label-mono">#</TableHead>
                    <TableHead className="label-mono">Name</TableHead>
                    <TableHead className="label-mono text-right">Friends</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        No referrals yet. Share your link to get on the board.
                      </TableCell>
                    </TableRow>
                  )}
                  {people.map((p, i) => (
                    <TableRow key={p.code} className="border-ink/20">
                      <TableCell>
                        <Rank n={i + 1} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">{p.college}</span>
                      </TableCell>
                      <TableCell className="text-right font-display text-2xl">{p.referrals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </>
  );
}
