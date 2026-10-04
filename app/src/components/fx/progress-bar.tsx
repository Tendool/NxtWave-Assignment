"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** A bar that fills to value/max when it comes into view, with tick marks at the milestones. */
export function ProgressBar({ value, max, marks = [], className }: { value: number; max: number; marks?: number[]; className?: string }) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div className={cn("relative", className)}>
      <div
        className="h-3 overflow-hidden rounded-full border-[1.5px] border-ink bg-card"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
      >
        <motion.div
          className="h-full rounded-full bg-flame"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>
      {marks.map((m) => (
        <span
          key={m}
          aria-hidden
          className={cn("label-mono absolute top-4 -translate-x-1/2 text-[0.65rem]", value >= m ? "text-flame" : "text-muted-foreground")}
          style={{ left: `${(m / Math.max(1, max)) * 100}%` }}
        >
          {m}
        </span>
      ))}
      {marks.length > 0 && <div className="h-5" />}
    </div>
  );
}
