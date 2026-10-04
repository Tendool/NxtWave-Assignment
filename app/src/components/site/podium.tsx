"use client";

import { motion } from "motion/react";
import { Crown } from "lucide-react";
import { NumberTicker } from "@/components/fx/number-ticker";
import { cn } from "@/lib/utils";

type Entry = { name: string; sub?: string | null; value: number };

/** Top three as a podium: 2nd · 1st · 3rd, columns rising to their share of the leader's count. */
export function Podium({ entries, unit }: { entries: Entry[]; unit: string }) {
  if (entries.length === 0) return null;
  const max = Math.max(1, ...entries.map((e) => e.value));
  const order = [entries[1], entries[0], entries[2]].map((e, i) => ({ e, place: [2, 1, 3][i] })).filter((x) => x.e);

  return (
    <div className="grid grid-cols-3 items-end gap-3 sm:gap-5" role="list" aria-label={`Top ${entries.length}`}>
      {order.map(({ e, place }, i) => (
        <div key={e.name} role="listitem" className="flex min-w-0 flex-col items-center text-center">
          {place === 1 && <Crown className="mb-1 size-6 text-flame" strokeWidth={1.75} aria-hidden />}
          <p className={cn("line-clamp-2 font-medium leading-tight", place === 1 ? "text-base sm:text-lg" : "text-sm sm:text-base")}>{e.name}</p>
          {e.sub && <p className="label-mono mt-0.5 line-clamp-1 text-muted-foreground">{e.sub}</p>}
          <motion.div
            className={cn(
              "mt-3 flex w-full origin-bottom flex-col items-center justify-start rounded-t-md border-[1.5px] border-b-0 border-ink pt-3 hard-sm",
              place === 1 ? "bg-marker" : place === 2 ? "bg-card" : "bg-secondary",
            )}
            style={{ height: `${70 + (e.value / max) * 110}px` }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 * i, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <span className="font-display text-4xl leading-none sm:text-5xl">
              <NumberTicker value={e.value} delay={0.3 + 0.15 * i} />
            </span>
            <span className="label-mono mt-1 text-[0.65rem] opacity-70">{unit}</span>
            <span className="mt-auto mb-2 font-display text-2xl opacity-40">#{place}</span>
          </motion.div>
        </div>
      ))}
    </div>
  );
}

/** A ranked row with a bar showing its share of the leader's count. */
export function RankRow({ rank, name, sub, value, max, delay = 0 }: { rank: number; name: string; sub?: string | null; value: number; max: number; delay?: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay }}
      className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-4 py-3"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-sm border-[1.5px] border-ink bg-card font-display text-lg">{rank}</span>
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-flame"
            initial={{ width: 0 }}
            whileInView={{ width: `${Math.max(4, (value / Math.max(1, max)) * 100)}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: delay + 0.1, ease: "easeOut" }}
          />
        </div>
      </div>
      <span className="font-display text-2xl tabular-nums">{value}</span>
    </motion.li>
  );
}
