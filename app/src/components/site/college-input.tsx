"use client";

import { useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type CollegeOption = { id: number; name: string; city: string | null; state: string | null; kind: string | null };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Searchable college picker. Free text is allowed — a missing college is saved for review. */
export function CollegeInput({
  name,
  options,
  defaultValue = "",
  invalid,
  placeholder = "Search your college, city or state",
}: {
  name: string;
  options: CollegeOption[];
  defaultValue?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => options.map((o) => ({ o, hay: norm(`${o.name} ${o.city ?? ""} ${o.state ?? ""} ${o.kind ?? ""}`) })), [options]);

  const results = useMemo(() => {
    const q = norm(value);
    if (q.length < 2) return [];
    const words = q.split(" ");
    return index
      .filter(({ hay }) => words.every((w) => hay.includes(w)))
      .sort((a, b) => {
        // Names that start with the query first, then shorter names.
        const as = norm(a.o.name).startsWith(q) ? 0 : 1;
        const bs = norm(b.o.name).startsWith(q) ? 0 : 1;
        return as - bs || a.o.name.length - b.o.name.length;
      })
      .slice(0, 8)
      .map((r) => r.o);
  }, [value, index]);

  const exact = results.some((r) => norm(r.name) === norm(value));
  const listId = `${id}-list`;

  function pick(o: CollegeOption) {
    setValue(o.name);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-11 w-full min-w-0 rounded-md border-[1.5px] border-ink bg-card px-3 py-1 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[3px_3px_0_0_var(--flame)] aria-invalid:border-destructive md:text-sm"
      />

      {open && value.trim().length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-md border-[1.5px] border-ink bg-popover hard"
        >
          {results.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-3 py-2 text-sm", i === active && "bg-marker text-[#16120e]")}
            >
              <span className="block font-medium leading-snug">{o.name}</span>
              <span className={cn("label-mono mt-0.5 flex items-center gap-1", i === active ? "text-[#16120e]/70" : "text-muted-foreground")}>
                <MapPin className="size-3" />
                {[o.city, o.state].filter(Boolean).join(", ")}
                {o.kind ? ` · ${o.kind}` : ""}
              </span>
            </li>
          ))}
          {!exact && (
            <li className="border-t border-ink/20 px-3 py-2 text-xs text-muted-foreground">
              {results.length === 0 ? "No match. " : "Not listed? "}
              Keep typing — we&apos;ll add <span className="font-semibold text-foreground">&ldquo;{value.trim()}&rdquo;</span> as written.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
