"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Check, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareConfetti({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ff4a1c", "#ffe14d", "#16120e"];
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.35 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 60, origin: { x: 1, y: 0.5 }, colors }), 250);
    return () => clearTimeout(t);
  }, [enabled]);
  return null;
}

export function SharePanel({ link, message }: { link: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const waText = `${message}\n${link}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy — long-press the link instead");
    }
  }

  return (
    <div className="space-y-4">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-ink bg-[#25d366] text-lg font-semibold text-ink hard transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--ink)]"
      >
        <Send className="size-5" /> Share on WhatsApp
      </a>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border-[1.5px] border-ink bg-card px-3 font-mono text-sm"
          aria-label="Your referral link"
        />
        <Button type="button" variant="outline" onClick={copy} aria-label="Copy link">
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
