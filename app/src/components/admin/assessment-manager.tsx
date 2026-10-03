"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileUp, Loader2, Shuffle, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { createManual, generateVariant, savePolicyAction, type CreateState } from "@/app/admin/assessments/actions";
import { DIFFICULTIES, MAX_VARIANTS, REQUIREMENT_LABELS, type Policy } from "@/lib/challenge-types";
import type { Requirements } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Tab = "write" | "generate" | "policy";

const fileInput =
  "block w-full cursor-pointer rounded-md border-[1.5px] border-dashed border-ink bg-card p-2.5 text-sm file:mr-3 file:cursor-pointer file:rounded-sm file:border-[1.5px] file:border-ink file:bg-marker file:px-3 file:py-1 file:font-semibold file:text-[#16120e]";

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[] }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border-[1.5px] border-ink">
      {options.map((o, i) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={cn("px-3 py-1.5 text-sm font-medium", i > 0 && "border-l-[1.5px] border-ink", value === o.v ? "bg-ink text-paper" : "bg-card hover:bg-marker hover:text-[#16120e]")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ReqPicker({ value, onChange }: { value: Requirements; onChange: (r: Requirements) => void }) {
  return (
    <div className="space-y-2">
      <Label className="label-mono">What students must submit</Label>
      {(Object.keys(REQUIREMENT_LABELS) as (keyof Requirements)[]).map((k) => (
        <div key={k} className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm">{REQUIREMENT_LABELS[k]}</span>
          <Seg
            value={value[k]}
            onChange={(v) => onChange({ ...value, [k]: v })}
            options={[
              { v: "required", label: "Required" },
              { v: "optional", label: "Optional" },
              { v: "off", label: "Not asked" },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

export function AssessmentManager({ policy, aiOn }: { policy: Policy; aiOn: boolean }) {
  const [tab, setTab] = useState<Tab>("generate");
  const tabs: { id: Tab; label: string; icon: typeof Sparkles }[] = [
    { id: "generate", label: "Generate with AI", icon: Sparkles },
    { id: "write", label: "Write or upload", icon: FileUp },
    { id: "policy", label: "Who gets what", icon: Shuffle },
  ];
  return (
    <div className="paper-card hard">
      <div className="flex flex-wrap border-b-[1.5px] border-ink">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn("label-mono flex flex-1 items-center justify-center gap-2 px-4 py-3", i > 0 && "border-l-[1.5px] border-ink", tab === t.id ? "bg-ink text-paper" : "hover:bg-marker hover:text-[#16120e]")}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === "generate" && <GeneratePanel policy={policy} aiOn={aiOn} />}
        {tab === "write" && <WritePanel policy={policy} />}
        {tab === "policy" && <PolicyPanel policy={policy} aiOn={aiOn} />}
      </div>
    </div>
  );
}

// ───────────── generate ─────────────

function GeneratePanel({ policy, aiOn }: { policy: Policy; aiOn: boolean }) {
  const router = useRouter();
  const [topic, setTopic] = useState(policy.topic);
  const [difficulty, setDifficulty] = useState<Policy["difficulty"]>(policy.difficulty);
  const [duration, setDuration] = useState(policy.durationMinutes);
  const [count, setCount] = useState(5);
  const [reqs, setReqs] = useState<Requirements>(policy.requirements);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);
  const stop = useRef(false);

  async function run() {
    setRunning(true);
    stop.current = false;
    setLog([]);
    let made = 0;
    const seed = Math.floor(Math.random() * 1000);
    for (let i = 1; i <= count && !stop.current; i++) {
      const r = await generateVariant({ topic, difficulty, durationMinutes: duration, requirements: reqs, index: i, total: count, seed });
      setLog((l) => [...l, r.ok ? { ok: true, text: `${i}/${count} · ${r.title}` } : { ok: false, text: `${i}/${count} · ${r.error}` }]);
      if (r.ok) made++;
      else break; // a failing model will keep failing; don't burn the whole batch
    }
    setRunning(false);
    router.refresh();
    if (made) toast.success(`${made} challenge${made > 1 ? "s" : ""} created`);
  }

  return (
    <div className="space-y-5">
      {!aiOn && (
        <p className="rounded-md border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm">
          No AI model is switched on. <Link href="/admin/ai" className="font-semibold underline decoration-flame decoration-2 underline-offset-4">Choose a local model or add an API key</Link> to generate challenges.
        </p>
      )}
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="g-topic">Topic</Label>
        <Textarea id="g-topic" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-end gap-5">
        <div className="space-y-1.5">
          <Label className="label-mono">Difficulty</Label>
          <div><Seg value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((d) => ({ v: d, label: d[0].toUpperCase() + d.slice(1) }))} /></div>
        </div>
        <div className="space-y-1.5">
          <Label className="label-mono" htmlFor="g-n">How many variants</Label>
          <Input id="g-n" type="number" min={1} max={MAX_VARIANTS} value={count} onChange={(e) => setCount(Math.max(1, Math.min(MAX_VARIANTS, Number(e.target.value) || 1)))} className="w-28" />
        </div>
        <div className="space-y-1.5">
          <Label className="label-mono" htmlFor="g-d">Minutes</Label>
          <Input id="g-d" type="number" min={5} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} className="w-28" />
        </div>
      </div>
      <ReqPicker value={reqs} onChange={setReqs} />
      <p className="text-xs text-muted-foreground">
        With more than one variant, each is written to test the <strong>same skills at the same difficulty</strong> in a different scenario, so students can&apos;t copy each other and nobody gets an easier question. Students are then assigned one at random, evenly.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="flame" onClick={run} disabled={running || !aiOn || topic.trim().length < 3}>
          {running ? <Loader2 className="animate-spin" /> : <Sparkles />} {running ? "Generating…" : `Generate ${count} ${count === 1 ? "challenge" : "variants"}`}
        </Button>
        {running && (
          <Button type="button" variant="ghost" onClick={() => (stop.current = true)}>
            Stop after this one
          </Button>
        )}
      </div>
      {log.length > 0 && (
        <ul className="space-y-1 rounded-md border-[1.5px] border-ink bg-secondary p-3 text-sm" aria-live="polite">
          {log.map((l, i) => (
            <li key={i} className={cn("flex gap-2", !l.ok && "font-medium text-destructive")}>
              {l.ok ? <Check className="mt-0.5 size-4 shrink-0 text-moss" /> : <span aria-hidden>✕</span>} {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────── write / upload ─────────────

function WritePanel({ policy }: { policy: Policy }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateState, FormData>(createManual, {});
  const [reqs, setReqs] = useState<Requirements>(policy.requirements);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Assessment saved");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="req_code" value={reqs.code} />
      <input type="hidden" name="req_hosted" value={reqs.hosted} />
      <input type="hidden" name="req_video" value={reqs.video} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <Label className="label-mono" htmlFor="w-title">Title</Label>
          <Input id="w-title" name="title" />
        </div>
        <div className="space-y-1.5">
          <Label className="label-mono" htmlFor="w-dur">Minutes</Label>
          <Input id="w-dur" name="duration" type="number" min={5} max={600} defaultValue={policy.durationMinutes} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="w-brief">The question (markdown)</Label>
        <Textarea id="w-brief" name="brief" rows={9} className="font-mono text-sm" placeholder={"## Context\n…\n\n## Your task\n…\n\n## Requirements\n1. …"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="label-mono">…or upload it as .md / .txt</Label>
          <input name="briefFile" type="file" accept=".md,.txt,text/plain,text/markdown" className={fileInput} />
        </div>
        <div className="space-y-1.5">
          <Label className="label-mono">Attachment for students (optional)</Label>
          <input name="attachment" type="file" accept=".pdf,.zip,.md,.txt,.png,.jpg,.jpeg" className={fileInput} />
        </div>
      </div>
      <ReqPicker value={reqs} onChange={setReqs} />
      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" variant="flame" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Save assessment
      </Button>
    </form>
  );
}

// ───────────── policy ─────────────

function PolicyPanel({ policy, aiOn }: { policy: Policy; aiOn: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<Policy>(policy);
  const [busy, go] = useTransition();
  const modes = [
    { v: "pool" as const, icon: Shuffle, title: "Random from the pool", sub: "Each student gets one of your active assessments — handed out evenly at random." },
    { v: "per_student" as const, icon: Users, title: "Unique for every student", sub: "A fresh question is generated for each student when they press start. Falls back to the pool if the model fails." },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {modes.map((m) => (
          <button
            key={m.v}
            type="button"
            onClick={() => setP({ ...p, mode: m.v })}
            aria-pressed={p.mode === m.v}
            className={cn("flex flex-col items-start gap-1 rounded-md border-[1.5px] border-ink p-4 text-left", p.mode === m.v ? "bg-marker text-[#16120e] hard-sm" : "bg-card hover:-translate-y-px")}
          >
            <m.icon className="size-5" />
            <span className="font-display text-2xl leading-none">{m.title}</span>
            <span className={cn("text-xs", p.mode === m.v ? "text-[#16120e]/75" : "text-muted-foreground")}>{m.sub}</span>
          </button>
        ))}
      </div>
      {p.mode === "per_student" && !aiOn && <p className="text-sm font-medium text-destructive">This mode needs an AI model — switch one on in AI settings first.</p>}

      {p.mode === "per_student" && (
        <div className="space-y-4 rounded-md border-[1.5px] border-ink bg-secondary p-4">
          <div className="space-y-1.5">
            <Label className="label-mono" htmlFor="p-topic">Topic for generated questions</Label>
            <Textarea id="p-topic" rows={2} value={p.topic} onChange={(e) => setP({ ...p, topic: e.target.value })} />
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <div className="space-y-1.5">
              <Label className="label-mono">Difficulty</Label>
              <div><Seg value={p.difficulty} onChange={(v) => setP({ ...p, difficulty: v })} options={DIFFICULTIES.map((d) => ({ v: d, label: d[0].toUpperCase() + d.slice(1) }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-mono" htmlFor="p-dur">Minutes</Label>
              <Input id="p-dur" type="number" min={5} max={600} value={p.durationMinutes} onChange={(e) => setP({ ...p, durationMinutes: Number(e.target.value) || 60 })} className="w-28" />
            </div>
          </div>
          <ReqPicker value={p.requirements} onChange={(requirements) => setP({ ...p, requirements })} />
          <p className="text-xs text-muted-foreground">Heads up: separate questions can differ in difficulty, so scores are harder to compare. For a fair ranking prefer a few variants from the pool.</p>
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--flame)]" checked={p.showScores} onChange={(e) => setP({ ...p, showScores: e.target.checked })} />
        Show students their AI score and feedback after they submit
      </label>

      <Button
        type="button"
        variant="flame"
        disabled={busy}
        onClick={() =>
          go(async () => {
            const r = await savePolicyAction(p);
            if (!r.ok) return void toast.error(r.error ?? "Couldn't save");
            toast.success("Saved");
            router.refresh();
          })
        }
      >
        {busy ? <Loader2 className="animate-spin" /> : <Check />} Save
      </Button>
    </div>
  );
}
