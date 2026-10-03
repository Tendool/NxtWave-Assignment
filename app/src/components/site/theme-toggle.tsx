"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Icons swap with CSS (`dark:`) so server and client markup match and there is no flash. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="inline-flex size-8 items-center justify-center rounded-sm border-[1.5px] border-ink bg-card transition-colors hover:bg-marker hover:text-[#16120e]"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
