"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { recordShare, startChallenge } from "@/app/challenge/actions";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ChallengeState = "none" | "running" | "submitted" | "expired";

export function ShareHub({ link, text, state, minutes, refCode }: { link: string; text: string; state: ChallengeState; minutes: number; refCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"shared" | "manual">("manual");
  const [via, setVia] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, startBusy] = useTransition();
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After a share we wait for the student to come back to this tab, then ask about the timer.
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible" && pending.current) {
        pending.current = false;
        if (timer.current) clearTimeout(timer.current);
        setReason("shared");
        setOpen(true);
      }
    };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function afterShare(label: string, immediate = false) {
    setVia(label);
    if (immediate) {
      setReason("shared");
      setOpen(true);
      return;
    }
    pending.current = true;
    // If the share opened in a window that never hid this tab, still ask after a moment.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (pending.current) {
        pending.current = false;
        setReason("shared");
        setOpen(true);
      }
    }, 7000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
      return false;
    }
  }

  async function onShare(c: ShareChannel) {
    void recordShare(c.id);
    if (c.action === "native") {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Build60 workshop", text, url: link });
          afterShare(c.label, true);
        } catch {
          /* cancelled */
        }
      } else if (await copy()) {
        toast.success("Link copied");
        afterShare(c.label);
      }
      return;
    }
    if (c.action === "copy") {
      if (await copy()) {
        toast.success(c.hint ?? "Link copied");
        if (c.after) window.open(c.after, "_blank", "noopener,noreferrer");
        afterShare(c.label);
      }
      return;
    }
    const u = c.url(link, text);
    if (!u) return;
    if (u.startsWith("mailto:")) window.location.assign(u);
    else window.open(u, "_blank", "noopener,noreferrer");
    afterShare(c.label);
  }

  async function onCopyOnly() {
    void recordShare("copy");
    if (await copy()) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function start() {
    startBusy(async () => {
      const r = await startChallenge();
      if (!r.ok) return void toast.error(r.error ?? "Couldn't start");
      router.push("/challenge");
    });
  }

  const title =
    state === "running" ? "Your challenge is running" : state === "submitted" ? "You've already submitted" : reason === "shared" ? `Thanks for sharing${via ? ` on ${via}` : ""}!` : "Start the challenge?";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SHARE_CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onShare(c)}
            className="flex h-11 items-center justify-center rounded-md border-[1.5px] border-ink bg-card text-sm font-semibold transition-all hover:-translate-y-px hover:bg-marker hover:text-[#16120e] hard-sm"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* What a friend sees when the link is pasted into a chat — and a portrait version for Instagram. */}
      <div className="rounded-md border-[1.5px] border-ink bg-secondary p-3">
        <p className="label-mono mb-2 text-muted-foreground">This is how your link looks when you share it</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/og/ref/${encodeURIComponent(refCode)}`} alt="Your personalised invite card" width={1200} height={630} className="w-full rounded-sm border-[1.5px] border-ink bg-card" />
        <a href={`/og/ref/${encodeURIComponent(refCode)}?format=story&download=1`} download className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline decoration-flame decoration-2 underline-offset-4">
          Download the story image for Instagram
        </a>
      </div>

      <div className="flex items-stretch gap-2">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Your referral link" className="min-w-0 flex-1 rounded-md border-[1.5px] border-ink bg-card px-3 font-mono text-sm" />
        <Button type="button" variant="outline" onClick={onCopyOnly} aria-label="Copy link">
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Always available, so sharing is encouraged but never a gate. */}
      <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-ink bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl leading-none">
            {state === "none" ? "Ready for the challenge?" : state === "running" ? "Your challenge is running" : "Challenge submitted"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === "none" ? `A ${minutes}-minute timed build. Share first if you like — then start whenever you're ready.` : state === "running" ? "Pick up where you left off." : "See your score and feedback."}
          </p>
        </div>
        {state === "none" ? (
          <Button type="button" variant="flame" onClick={() => { setReason("manual"); setOpen(true); }}>
            <Timer /> Start the challenge
          </Button>
        ) : (
          <Button type="button" variant="flame" onClick={() => router.push("/challenge")}>
            {state === "running" ? "Continue" : "View result"}
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-normal leading-none">{title}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {state === "none" ? (
                <>
                  Want to start your timer now? You&apos;ll get a challenge and <strong>{minutes} minutes</strong> to build and submit it. Once you start, the clock runs and can&apos;t be paused or restarted.
                </>
              ) : state === "running" ? (
                "The clock is already running. Head back and finish your submission."
              ) : (
                "Open your result to see your score and feedback."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {state === "none" ? "Not yet" : "Close"}
            </Button>
            {state === "none" ? (
              <Button type="button" variant="flame" onClick={start} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Timer />} Start the timer
              </Button>
            ) : (
              <Button type="button" variant="flame" onClick={() => router.push("/challenge")}>
                {state === "running" ? "Continue challenge" : "View result"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
