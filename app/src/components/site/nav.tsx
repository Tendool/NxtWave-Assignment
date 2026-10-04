"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/gallery", label: "Gallery" },
  { href: "/kit", label: "Campus kit" },
  { href: "/challenge", label: "My challenge" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="label-mono hidden items-center gap-1 md:flex" aria-label="Main">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(`${n.href}/`);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className="relative px-2.5 py-1.5 transition-colors hover:text-flame">
              {n.label}
              {active && <motion.span layoutId="nav-underline" className="absolute inset-x-2.5 -bottom-px h-[2px] bg-flame" />}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link href="/#register" className="label-mono rounded-sm border-[1.5px] border-ink bg-ink px-3 py-1.5 text-paper transition-colors hover:bg-flame hover:text-white">
          Register
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex size-8 items-center justify-center rounded-sm border-[1.5px] border-ink bg-card md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full border-b-[1.5px] border-ink bg-paper md:hidden"
          >
            <ul className="mx-auto max-w-6xl divide-y divide-ink/15 px-5 py-2">
              {[...NAV, { href: "/evaluate", label: "Score your project" }].map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn("flex items-center justify-between py-3 font-display text-2xl", path === n.href && "text-flame")}
                  >
                    {n.label}
                    <span aria-hidden className="label-mono text-muted-foreground">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
