"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Send, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { buildKit, type KitState } from "@/app/kit/actions";
import { CollegeInput } from "@/components/site/college-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/fx/blur-fade";

const AUDIENCES = ["class group", "hostel group", "coding club", "department group"];

function Message({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="paper-card hard-sm p-4">
      <p className="label-mono text-flame">{label}</p>
      <p className="mt-2 text-sm leading-relaxed">{text}</p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setDone(true);
              toast.success("Copied — paste it into the group");
              setTimeout(() => setDone(false), 1600);
            } catch {
              toast.error("Copy failed");
            }
          }}
        >
          {done ? <Check /> : <Copy />} {done ? "Copied" : "Copy"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-md border-[1.5px] border-ink bg-[#25d366] px-2.5 text-[0.8rem] font-semibold"
        >
          <Send className="size-3.5" /> Send
        </a>
      </div>
    </div>
  );
}

export function KitForm() {
  const [state, action, pending] = useActionState<KitState, FormData>(buildKit, {});
  const [audience, setAudience] = useState<string | null>(state.values?.audience ?? AUDIENCES[0]);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <form action={action} className="paper-card hard h-fit space-y-4 p-6" noValidate>
        <div key={JSON.stringify(v)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="label-mono">Your name</Label>
            <Input name="name" defaultValue={v.name} />
            {e.name && <p className="text-xs font-medium text-destructive">{e.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="label-mono">Your college</Label>
            <CollegeInput name="college" defaultValue={v.college} invalid={!!e.college} />
            {e.college && <p className="text-xs font-medium text-destructive">{e.college}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="label-mono">Where will you post it?</Label>
          <Select name="audience" value={audience} onValueChange={setAudience}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="flame" size="lg" className="w-full" disabled={pending}>
          <Wand2 /> {pending ? "Writing…" : "Make my kit"}
        </Button>
      </form>

      <div>
        {!state.kit ? (
          <div className="paper-card hard-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b-[1.5px] border-ink bg-[#075e54] px-4 py-3 text-white">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/20 font-display text-lg">C</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Your {audience ?? "class group"}</p>
                <p className="text-xs text-white/70">Preview — your messages land here</p>
              </div>
            </div>
            <div className="space-y-3 bg-[#efe7dc] p-4 dark:bg-[#1d1914]">
              {[78, 92, 64].map((w, i) => (
                <div key={i} className="ml-auto max-w-[85%] rounded-lg rounded-tr-none border border-ink/10 bg-[#dcf8c6] p-3 shadow-sm dark:bg-[#1f3b2d]">
                  <div className="space-y-1.5">
                    <div className="h-2.5 rounded-full bg-[#0b2e17]/15 dark:bg-white/15" style={{ width: `${w}%` }} />
                    <div className="h-2.5 rounded-full bg-[#0b2e17]/15 dark:bg-white/15" style={{ width: `${w - 18}%` }} />
                    <div className="h-2.5 w-2/5 rounded-full bg-[#0b2e17]/15 dark:bg-white/15" />
                  </div>
                  <p className="mt-2 text-right text-[0.65rem] text-ink/50">{["curiosity", "placements", "college pride"][i]}</p>
                </div>
              ))}
              <p className="pt-1 text-center text-xs text-muted-foreground">
                You get a tracking link that credits your college, plus three ready-to-forward messages — each a different angle.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <p className="label-mono text-muted-foreground">Your tracking link</p>
              <Badge className={state.kit.source === "ai" ? "bg-marker" : "bg-card"}>{state.kit.source === "ai" ? "AI-written" : "Template"}</Badge>
            </div>
            <code className="block break-all rounded-md border-[1.5px] border-ink bg-card p-3 font-mono text-sm">{state.kit.link}</code>
            <ul className="space-y-3">
              {state.kit.messages.map((m, i) => (
                <BlurFade as="li" key={m.label} delay={i * 0.12}>
                  <Message {...m} />
                </BlurFade>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
