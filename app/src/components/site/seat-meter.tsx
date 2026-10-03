"use client";

import { animate, useInView, useMotionValue, useTransform } from "motion/react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.2, ease: "easeOut" });
    return () => controls.stop();
  }, [inView, to, mv]);

  return <motion.span ref={ref}>{text}</motion.span>;
}

/** A row of 50 ticks, each worth 10 seats. Filled ticks = claimed seats. */
export function SeatMeter({ claimed, target }: { claimed: number; target: number }) {
  const ticks = 50;
  const filled = Math.min(ticks, Math.floor((claimed / target) * ticks));
  const left = Math.max(0, target - claimed);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="font-display text-5xl leading-none md:text-6xl">
          <CountUp to={claimed} />
          <span className="text-muted-foreground"> / {target}</span>
        </div>
        <div className="label-mono pb-1 text-right text-muted-foreground">
          {left > 0 ? (
            <>
              <span className="text-flame">{left}</span> seats left
            </>
          ) : (
            "Full — join waitlist"
          )}
        </div>
      </div>
      <div className="mt-3 flex h-5 gap-[3px]" role="img" aria-label={`${claimed} of ${target} seats claimed`}>
        {Array.from({ length: ticks }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0.3, opacity: 0.4 }}
            whileInView={{ scaleY: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.012, duration: 0.25 }}
            className={`flex-1 origin-bottom border-[1.5px] border-ink ${i < filled ? "bg-flame" : "bg-card"}`}
          />
        ))}
      </div>
    </div>
  );
}
