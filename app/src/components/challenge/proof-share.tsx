"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createProofCard, recordShare } from "@/app/challenge/actions";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/share";
import { Button } from "@/components/ui/button";

/** Opt-in: nothing about the student's result is public until they press the button. */
export function ProofShare({ origin, initialSlug, title, minutes }: { origin: string; initialSlug: string | null; title: string; minutes: number | null }) {
  const [slug, setSlug] = useState(initialSlug);
  const [busy, go] = useTransition();
  const [copied, setCopied] = useState(false);

  const link = slug ? `${origin}/proof/${slug}` : "";
  const text = `I just built “${title}”${minutes ? ` in ${minutes} minutes` : ""} in a free 60-minute AI challenge. Join the next one:`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
      return false;
    }
  }

  async function share(c: ShareChannel) {
    void recordShare(`proof:${c.id}`);
    if (c.action === "native") {
      if (navigator.share) await navigator.share({ title, text, url: link }).catch(() => {});
      else if (await copy()) toast.success("Link copied");
      return;
    }
    if (c.action === "copy") {
      if (await copy()) {
        toast.success(c.hint ?? "Link copied");
        if (c.after) window.open(c.after, "_blank", "noopener,noreferrer");
      }
      return;
    }
    const u = c.url(link, text);
    if (!u) return;
    if (u.startsWith("mailto:")) window.location.assign(u);
    else window.open(u, "_blank", "noopener,noreferrer");
  }

  if (!slug) {
    return (
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Turn your result into a card you can post. It only becomes public when you press this.</p>
        <Button
          type="button"
          variant="flame"
          disabled={busy}
          onClick={() =>
            go(async () => {
              const r = await createProofCard();
              if (!r.ok || !r.slug) return void toast.error(r.error ?? "Couldn't create the card");
              setSlug(r.slug);
            })
          }
        >
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Create my result card
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/og/proof/${slug}`} alt="Your result card" width={1200} height={630} className="w-full rounded-md border-[1.5px] border-ink bg-card hard-sm" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SHARE_CHANNELS.map((c) => (
          <button key={c.id} type="button" onClick={() => share(c)} className="flex h-11 items-center justify-center rounded-md border-[1.5px] border-ink bg-card text-sm font-semibold transition-all hover:-translate-y-px hover:bg-marker hover:text-[#16120e] hard-sm">
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-stretch gap-2">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Your result link" className="min-w-0 flex-1 rounded-md border-[1.5px] border-ink bg-card px-3 font-mono text-sm" />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            if (await copy()) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
        <a href={`/og/proof/${slug}?format=story&download=1`} download className="inline-flex h-10 items-center gap-2 rounded-md border-[1.5px] border-ink bg-secondary px-4 text-sm font-semibold hover:bg-marker hover:text-[#16120e]">
          <Download className="size-4" /> Story image
        </a>
      </div>
    </div>
  );
}
