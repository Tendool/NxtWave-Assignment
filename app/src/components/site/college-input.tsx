"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type CollegeOption = { id: number; name: string; city: string | null; state: string | null; kind: string | null };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Results per normalised query, shared by every picker on the page. */
const cache = new Map<string, CollegeOption[]>();

/** Searchable college picker. Search runs on the server; free text is allowed — a missing college is saved for review. */
export function CollegeInput({
  name,
  defaultValue = "",
  invalid,
  placeholder = "Search your college, city or state",
}: {
  name: string;
  defaultValue?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = norm(value);
  const [fetched, setFetched] = useState<{ q: string; results: CollegeOption[] }>({ q: "", results: [] });
  const cached = cache.get(q);
  const results = q.length < 2 ? [] : (cached ?? (fetched.q === q ? fetched.results : []));
  const loading = q.length >= 2 && !cached && fetched.q !== q;

  useEffect(() => {
    if (q.length < 2 || cache.has(q)) return;
    const ctrl = new AbortController();
    // A short pause so typing "vit vellore" is one request, not eleven.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/colleges?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const list = (await res.json()) as CollegeOption[];
        cache.set(q, list);
        setFetched({ q, results: list });
      } catch {
        if (!ctrl.signal.aborted) setFetched({ q, results: [] }); // offline: free text still works
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

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
          if (e.key === "Escape") return setOpen(false); // also while results are still loading
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
          {loading && results.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
          {!exact && !loading && (
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
