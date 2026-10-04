"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Counts up to `value` when it scrolls into view. Adapted from Magic UI's NumberTicker.
 * Server-renders the final number, so it's correct without JavaScript and for screen readers.
 */
export function NumberTicker({ value, className, delay = 0 }: { value: number; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 40, stiffness: 140 });
  const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

  useEffect(() => {
    if (!inView || reduce) return;
    if (ref.current) ref.current.textContent = fmt(0);
    const t = setTimeout(() => mv.set(value), delay * 1000);
    return () => clearTimeout(t);
  }, [inView, reduce, value, delay, mv]);

  useEffect(
    () =>
      spring.on("change", (v) => {
        if (ref.current) ref.current.textContent = fmt(v);
      }),
    [spring],
  );

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {fmt(value)}
    </span>
  );
}
