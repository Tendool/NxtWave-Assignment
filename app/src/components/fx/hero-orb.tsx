"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// three.js is ~150 KB gzipped: only fetched when it will actually be shown.
const NeuralOrb = dynamic(() => import("./neural-orb"), { ssr: false });

type NavigatorExtras = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/**
 * Shows the 3D orb on capable desktops only: skipped on small screens, with "reduce motion" on,
 * in data-saver mode, or on low-memory devices. Loaded after the page is idle so it never delays the form.
 */
export function HeroOrb({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nav = navigator as NavigatorExtras;
    const ok =
      window.matchMedia("(min-width: 1024px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !nav.connection?.saveData &&
      (nav.deviceMemory ?? 8) >= 4;
    if (!ok) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
    const id = idle(() => setShow(true));
    return () => (window.cancelIdleCallback ?? clearTimeout)(id as number);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div aria-hidden className={cn("pointer-events-none transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0", className)}>
      <NeuralOrb />
    </div>
  );
}
