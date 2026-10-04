"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Loader2, Send } from "lucide-react";
import { submitChallenge, type SubmitState } from "@/app/challenge/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Req = "required" | "optional" | "off";
type Props = {
  deadlineAt: string;
  startedAt: string;
  serverNow: string;
  graceSeconds: number;
  requirements: { code: Req; hosted: Req; video: Req };
  maxUploadMb: number;
  attachment: { id: string; filename: string } | null;
  children: React.ReactNode; // the rendered brief
};

const pad = (n: number) => String(n).padStart(2, "0");
function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return `${h > 0 ? `${h}:` : ""}${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function Field({ label, tag, error, hint, children }: { label: string; tag?: Req; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">
        {label} {tag === "required" ? <span className="text-flame">· required</span> : tag === "optional" ? <span className="text-muted-foreground">· optional</span> : null}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

const fileInput =
  "block w-full cursor-pointer rounded-md border-[1.5px] border-dashed border-ink bg-card p-2.5 text-sm file:mr-3 file:cursor-pointer file:rounded-sm file:border-[1.5px] file:border-ink file:bg-marker file:px-3 file:py-1 file:font-semibold file:text-[#16120e]";

export function Runner({ deadlineAt, startedAt, serverNow, graceSeconds, requirements: r, maxUploadMb, attachment, children }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitChallenge, {});
  const e = state.fieldErrors ?? {};

  // Count down against the server's clock, so a wrong laptop clock can't add or remove time.
  const deadline = Date.parse(deadlineAt);
  const [left, setLeft] = useState(() => deadline - Date.parse(serverNow)); // pure: derived from the server's own timestamps
  useEffect(() => {
    const skew = Date.parse(serverNow) - Date.now();
    const t = setInterval(() => setLeft(deadline - (Date.now() + skew)), 500);
    return () => clearInterval(t);
  }, [deadline, serverNow]);

  const over = left <= 0;
  const locked = left <= -graceSeconds * 1000;
  useEffect(() => {
    if (locked) router.refresh(); // server flips the page to "time's up"
  }, [locked, router]);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const urgent = left <= 5 * 60_000;
  const total = Math.max(1, deadline - Date.parse(startedAt));
  const frac = Math.min(1, Math.max(0, left / total));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Sticky timer */}
      <div className="lg:col-span-2">
        <div className={cn("sticky top-16 z-20 flex items-center justify-between gap-4 rounded-md border-[1.5px] border-ink px-4 py-3 hard transition-colors duration-500", urgent ? "bg-flame text-white" : "bg-card")}>
          <div className="flex items-center gap-4">
          <TimerRing frac={frac} urgent={urgent} />
          <div>
            <p className={cn("label-mono", urgent ? "text-white/80" : "text-muted-foreground")}>{over ? "Time's up" : "Time left"}</p>
            <p className={cn("font-display text-5xl leading-none tabular-nums", left <= 60_000 && !over && "animate-pulse")} aria-live="off">
              {format(left)}
            </p>
          </div>
          </div>
          <p className={cn("max-w-[16rem] text-right text-xs", urgent ? "text-white/90" : "text-muted-foreground")}>
            {over ? (locked ? "The submission window has closed." : "Submit now — a short grace period applies.") : "The deadline is enforced by the server, even if you close this tab."}
          </p>
        </div>
      </div>

      {/* Brief */}
      <article className="paper-card p-5 sm:p-7">
        <p className="label-mono mb-4 text-flame">Your challenge</p>
        {children}
        {attachment && (
          <a href="/challenge/attachment" className="mt-6 inline-flex items-center gap-2 rounded-md border-[1.5px] border-ink bg-secondary px-3 py-2 text-sm font-semibold hover:bg-marker hover:text-[#16120e]">
            <Download className="size-4" /> {attachment.filename}
          </a>
        )}
      </article>

      {/* Submission */}
      <form action={action} className="paper-card hard h-fit space-y-5 p-5 sm:p-6">
        <h2 className="text-3xl">Submit your work</h2>

        {r.code !== "off" && (
          <div className="space-y-4">
            <Field label="GitHub repo link" tag={r.code} error={e.repo} hint="Public repo. Or upload a zip below — either works.">
              <Input name="repo" type="url" placeholder="https://github.com/you/project" disabled={locked} aria-invalid={!!e.repo} />
            </Field>
            <Field label="…or a zip of your code" error={e.zip} hint={`.zip, up to ${maxUploadMb} MB. Leave out node_modules.`}>
              <input name="zip" type="file" accept=".zip,application/zip" disabled={locked} className={fileInput} />
            </Field>
          </div>
        )}

        {r.hosted !== "off" && (
          <Field label="Hosted link" tag={r.hosted} error={e.hosted} hint="Where it's running, e.g. a Vercel or Streamlit link.">
            <Input name="hosted" type="url" placeholder="https://my-project.vercel.app" disabled={locked} aria-invalid={!!e.hosted} />
          </Field>
        )}

        {r.video !== "off" && (
          <div className="space-y-4">
            <Field label="Demo video link" tag={r.video} error={e.video} hint="YouTube, Loom or Drive — make sure anyone with the link can view.">
              <Input name="video" type="url" placeholder="https://youtu.be/…" disabled={locked} aria-invalid={!!e.video} />
            </Field>
            <Field label="…or upload the video" error={e.videoFile} hint={`mp4, mov, webm or mkv, up to ${maxUploadMb} MB. Bigger? Use a link.`}>
              <input name="videoFile" type="file" accept="video/*,.mkv" disabled={locked} className={fileInput} />
            </Field>
          </div>
        )}

        <Field label="Notes for the reviewer" error={e.notes} hint="Which model did you use? What should we look at first? Anything that doesn't work yet?">
          <Textarea name="notes" rows={4} maxLength={2000} disabled={locked} />
        </Field>

        {state.error && (
          <p className="flex gap-2 rounded-md border-[1.5px] border-destructive bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {state.error}
          </p>
        )}

        <Button
          type="submit"
          variant="flame"
          size="lg"
          className="w-full"
          disabled={pending || locked}
          onClick={(ev) => {
            if (!confirm("Submit now? You can't change your submission afterwards.")) ev.preventDefault();
          }}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Send /> Submit final work
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Final. Once submitted, your work is scored automatically.</p>
      </form>
    </div>
  );
}

/** A ring that drains as time runs out. Purely decorative; the digits carry the information. */
function TimerRing({ frac, urgent }: { frac: number; urgent: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="size-14 shrink-0 -rotate-90" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className={urgent ? "stroke-white/25" : "stroke-secondary"} />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        className={cn("transition-[stroke-dashoffset] duration-500 ease-linear", urgent ? "stroke-white" : "stroke-flame")}
      />
    </svg>
  );
}
