"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { login } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="password">
          Password
        </Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" autoFocus />
        {state.error && <p className="text-xs font-medium text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        <Lock /> {pending ? "Checking…" : "Open dashboard"}
      </Button>
    </form>
  );
}
