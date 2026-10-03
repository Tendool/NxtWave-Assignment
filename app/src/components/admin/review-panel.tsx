"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, CheckCircle2, HelpCircle, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { clearHuman, saveHuman } from "@/app/admin/assessments/actions";
import { CHALLENGE_RUBRIC } from "@/lib/rubric";
import type { Review } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  submissionId: string;
  reviews: Review[];
  consensus: Record<string, number> | null;
  needsReview: boolean;
  human: { scores: Record<string, number>; total: number; note: string | null; at: string | null } | null;
};

export function ReviewPanel({ submissionId, reviews: all, consensus, needsReview, human }: Props) {
  const router = useRouter();
  const reviews = all.filter((r) => !r.error);
  const failedReviews = all.filter((r) => r.error);
  const [busy, go] = useTransition();
  const start = human?.scores ?? consensus ?? {};
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(CHALLENGE_RUBRIC.map((c) => [c.key, start[c.key] ?? 0])));
  const [note, setNote] = useState(human?.note ?? "");
  const total = CHALLENGE_RUBRIC.reduce((a, c) => a + (Number(vals[c.key]) || 0), 0);

  return (
    <div className="space-y-6">
      {needsReview && !human && (
        <p className="flex gap-2 rounded-md border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm font-medium">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          Needs a person. The reviewers disagree a lot, or most of their quotes can&apos;t be found in the submission — so this score shouldn&apos;t be trusted on its own.
        </p>
      )}

      {failedReviews.map((r) => (
        <p key={r.model} className="flex gap-2 rounded-md border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            <strong>Reviewer failed: {r.model}.</strong> {r.error} This score was not cross-checked by a second opinion.
          </span>
        </p>
      ))}

      {reviews.length > 0 && (
        <div>
          <p className="label-mono text-muted-foreground">Reviewer panel · {reviews.length === 1 ? "one reviewer" : `${reviews.length} reviewers scored independently`}</p>
          <ul className="mt-3 space-y-3">
            {CHALLENGE_RUBRIC.map((c) => {
              const scores = reviews.map((r) => r.scores[c.key] ?? 0);
              const spread = Math.max(...scores) - Math.min(...scores);
              return (
                <li key={c.key} className="rounded-md border-[1.5px] border-ink/40 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{c.label}</span>
                    <span className="flex items-center gap-2 font-mono text-sm">
                      {scores.map((n, i) => (
                        <span key={i} className="rounded-sm bg-secondary px-1.5 py-0.5" title={reviews[i].model}>
                          {n}
                        </span>
                      ))}
                      <span className="text-muted-foreground">→</span>
                      <strong>{consensus?.[c.key] ?? "—"}</strong>
                      {reviews.length > 1 && (
                        <span className={cn("label-mono rounded-sm px-1.5 py-0.5", spread >= 8 ? "bg-destructive/15 text-destructive" : spread >= 4 ? "bg-marker text-[#16120e]" : "bg-moss/15 text-moss")}>
                          {spread >= 8 ? "disagree" : spread >= 4 ? "differ" : "agree"}
                        </span>
                      )}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {reviews.map((r, i) => {
                      const e = r.evidence?.[c.key];
                      return (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                          {e?.quote ? (
                            e.verified ? (
                              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-moss" aria-label="Quote found in the submission" />
                            ) : (
                              <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-label="Quote not found in the submission" />
                            )
                          ) : (
                            <HelpCircle className="mt-0.5 size-3.5 shrink-0 opacity-40" aria-label="No evidence cited" />
                          )}
                          <span className="min-w-0">
                            <span className="label-mono mr-1">{r.model.split("·").pop()?.trim()}</span>
                            {e?.quote ? (
                              <>
                                <q className={cn("break-words", !e.verified && "line-through decoration-destructive/60")}>{e.quote}</q>
                                {!e.verified && <span className="ml-1 font-medium text-destructive">not found in what the student submitted</span>}
                              </>
                            ) : (
                              <em>cited nothing</em>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Human override */}
      <div className="rounded-md border-[1.5px] border-ink bg-secondary p-4">
        <p className="flex items-center gap-2 font-display text-2xl">
          <UserCheck className="size-5" /> {human ? "Human score (final)" : "Override with a human score"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">A human score replaces the AI&apos;s as the final score, and is used to measure how accurate the AI is.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CHALLENGE_RUBRIC.map((c) => (
            <div key={c.key} className="space-y-1">
              <Label className="label-mono" htmlFor={`h-${c.key}`}>{c.label}</Label>
              <Input id={`h-${c.key}`} type="number" min={0} max={20} value={vals[c.key]} onChange={(e) => setVals({ ...vals, [c.key]: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })} />
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          <Label className="label-mono" htmlFor="h-note">Why (optional)</Label>
          <Textarea id="h-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-display text-3xl">{total}<span className="text-lg text-muted-foreground">/100</span></span>
          <Button
            type="button"
            variant="flame"
            disabled={busy}
            onClick={() =>
              go(async () => {
                const r = await saveHuman(submissionId, vals, note);
                if (!r.ok) return void toast.error(r.error ?? "Couldn't save");
                toast.success("Human score saved");
                router.refresh();
              })
            }
          >
            {busy ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Save human score
          </Button>
          {human && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                go(async () => {
                  await clearHuman(submissionId);
                  toast.success("Back to the AI score");
                  router.refresh();
                })
              }
            >
              Remove override
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
