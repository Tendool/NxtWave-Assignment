import Link from "next/link";
import { House } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/assessments", label: "Assessments" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/scores", label: "Scores" },
  { href: "/admin/ai", label: "AI settings" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav aria-label="Admin" className="-mx-1 flex flex-wrap gap-1.5">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active === i.href ? "page" : undefined}
          className={cn("label-mono rounded-md border-[1.5px] border-ink px-3 py-1.5", active === i.href ? "bg-ink text-paper" : "bg-card hover:bg-marker hover:text-[#16120e]")}
        >
          {i.label}
        </Link>
      ))}
      <Link href="/" className="label-mono ml-auto inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 py-1.5 hover:bg-marker hover:text-[#16120e]">
        <House className="size-3.5" /> Site home
      </Link>
    </nav>
  );
}
