"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A card with a soft flame-coloured light that follows the pointer. Adapted from Aceternity's card spotlight /
 * Magic UI's MagicCard. Pure CSS variables — no re-render on pointer move.
 */
export function SpotlightCard({
  children,
  className,
  as = "div",
  size = 260,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
  size?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      }}
      style={{ "--spot-size": `${size}px` } as React.CSSProperties}
      className={cn("spotlight group/spot relative isolate overflow-hidden", className)}
    >
      {children}
    </Tag>
  );
}
