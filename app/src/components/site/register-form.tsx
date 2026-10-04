"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { register, type RegisterState } from "@/app/actions";
import { BRANCHES, YEARS } from "@/lib/constants";
import { CollegeInput } from "@/components/site/college-input";
import { Button } from "@/components/ui/button";
import { Shine } from "@/components/fx/border-beam";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function RegisterForm({ refCode, source }: { refCode?: string; source?: string }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [branch, setBranch] = useState<string | null>(v.branch ?? null);
  const [year, setYear] = useState<string | null>(v.year ?? YEARS[0]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="ref" value={refCode ?? ""} />
      <input type="hidden" name="src" value={source ?? ""} />
      {/* Remount fields when the server returns values, so defaultValue stays in sync after React resets the form. */}
      <div key={JSON.stringify(v)} className="space-y-4">

      <Field label="Full name" error={e.name}>
        <Input name="name" autoComplete="name" placeholder="As on your college ID" defaultValue={v.name} aria-invalid={!!e.name} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={e.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="you@college.edu" defaultValue={v.email} aria-invalid={!!e.email} />
        </Field>
        <Field label="WhatsApp number" error={e.whatsapp}>
          <Input name="whatsapp" type="tel" inputMode="numeric" autoComplete="tel" placeholder="98765 43210" defaultValue={v.whatsapp} aria-invalid={!!e.whatsapp} />
        </Field>
      </div>

      <Field label="College" error={e.college}>
        <CollegeInput name="college" defaultValue={v.college} invalid={!!e.college} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch" error={e.branch}>
          <Select name="branch" value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-full" aria-invalid={!!e.branch}>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Year" error={e.year}>
          <Select name="year" value={year} onValueChange={setYear}>
            <SelectTrigger className="w-full" aria-invalid={!!e.year}>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      </div>

      {state.error && (
        <p className="rounded-md border-[1.5px] border-destructive bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="flame" size="lg" className="relative w-full overflow-hidden" disabled={pending}>
        {!pending && <Shine />}
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Saving your seat…
          </>
        ) : (
          <>
            Save my free seat <ArrowRight />
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Free. No spam. We only message you about this workshop.
      </p>
    </form>
  );
}
