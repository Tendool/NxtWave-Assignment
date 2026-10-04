import { cn } from "@/lib/utils";

/**
 * A short streak of light travelling around the parent's border. Adapted from Magic UI's BorderBeam (CSS version).
 * The parent needs `relative` and a border radius. Browsers without `offset-path` simply don't show it.
 */
export function BorderBeam({ className, duration = 9, size = 160, delay = 0 }: { className?: string; duration?: number; size?: number; delay?: number }) {
  return (
    <span
      aria-hidden
      className={cn("border-beam", className)}
      style={{ "--beam-duration": `${duration}s`, "--beam-size": `${size}px`, "--beam-delay": `-${delay}s` } as React.CSSProperties}
    />
  );
}

/** A diagonal sheen that sweeps across a button now and then. The parent needs `relative overflow-hidden`. */
export function Shine({ className }: { className?: string }) {
  return <span aria-hidden className={cn("shine", className)} />;
}
