"use client";

import { useActionState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { submitProject, type EvaluateState } from "@/app/evaluate/actions";
import { RUBRIC } from "@/lib/rubric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function EvaluateForm() {
  const [state, action, pending] = useActionState<EvaluateState, FormData>(submitProject, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const r = state.result;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form action={action} className="paper-card hard space-y-4 p-6" noValidate>
        <div key={JSON.stringify(v)} className="space-y-4">
          <Field label="Your name" error={e.name}>
            <Input name="name" defaultValue={v.name} autoComplete="name" />
          </Field>
          <Field label="Your referral code (optional)" hint="From your confirmation page, e.g. ARUN-7K2">
            <Input name="ref_code" defaultValue={v.ref_code} />
          </Field>
          <Field label="Live project link" error={e.project_url}>
            <Input name="project_url" type="url" placeholder="https://my-project.vercel.app" defaultValue={v.project_url} />
          </Field>
          <Field label="GitHub repo (optional)" error={e.repo_url} hint="Public repos get a code review too.">
            <Input name="repo_url" placeholder="https://github.com/you/project" defaultValue={v.repo_url} />
          </Field>
          <Field label="What does it do, and for whom?" error={e.description}>
            <Textarea name="description" rows={4} defaultValue={v.description} placeholder="A resume screener that tells fresher candidates which skills the job post wants, so they know what to learn next." />
          </Field>
        </div>
        {state.error && (
          <p className="rounded-md border-[1.5px] border-destructive bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{state.error}</p>
        )}
        <Button type="submit" variant="flame" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Opening your project…
            </>
          ) : (
            <>
              <ScanSearch /> Score my project
            </>
          )}
        </Button>
      </form>

      <div>
        {!r && (
          <div className="paper-card p-6">
            <p className="label-mono text-flame">How it is scored</p>
            <ul className="mt-4 space-y-4">
              {RUBRIC.map((c) => (
                <li key={c.key} className="flex gap-3">
                  <span className="mt-1 font-mono text-xs text-muted-foreground">/20</span>
                  <div>
                    <p className="font-display text-xl leading-none">{c.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{c.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-ink/20 pt-4 text-xs text-muted-foreground">
              We open your live link and read your repo. The link check is automatic; the rest is reviewed by an AI against this rubric.
            </p>
          </div>
        )}

        {r && (
          <div className="paper-card hard-flame p-6" aria-live="polite">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-mono text-flame">Your score</p>
                <p className="font-display text-7xl leading-none">
                  {r.total}
                  <span className="text-3xl text-muted-foreground">/100</span>
                </p>
              </div>
              <Badge className={r.mode === "ai" ? "bg-marker" : "bg-card"}>{r.mode === "ai" ? "AI reviewed" : "Basic check"}</Badge>
            </div>
            <ul className="mt-6 space-y-3">
              {RUBRIC.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="font-mono">{r.scores[c.key]}/20</span>
                  </div>
                  <div className="mt-1 h-2.5 border-[1.5px] border-ink bg-card">
                    <div className="h-full bg-flame" style={{ width: `${(r.scores[c.key] / 20) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-ink/20 pt-4 text-sm">
              {r.feedback.split("\n").map((line, i) =>
                line.startsWith("- ") ? (
                  <p key={i} className="flex gap-2">
                    <span className="text-flame">→</span>
                    {line.slice(2)}
                  </p>
                ) : (
                  <p key={i} className="font-display text-xl leading-snug">
                    {line}
                  </p>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
