"use client";

import { useActionState } from "react";
import { recover, type RecoverState } from "@/app/challenge/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecoverForm() {
  const [state, action, pending] = useActionState<RecoverState, FormData>(recover, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="rc-email">Email</Label>
        <Input id="rc-email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="rc-wa">WhatsApp number</Label>
        <Input id="rc-wa" name="whatsapp" type="tel" inputMode="numeric" autoComplete="tel" />
      </div>
      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" variant="flame" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Find my challenge"}
      </Button>
    </form>
  );
}
