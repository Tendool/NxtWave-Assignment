"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveCampaignSettings, type CampaignFormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CampaignForm({ startsAt, whatsappGroupUrl }: { startsAt: string; whatsappGroupUrl: string }) {
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(saveCampaignSettings, {});
  // Controlled, so a failed save keeps what was typed and a successful one doesn't swap defaults under the inputs.
  const [when, setWhen] = useState(startsAt);
  const [group, setGroup] = useState(whatsappGroupUrl);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-end">
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="startsAt">
          Workshop starts (IST)
        </Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label className="label-mono" htmlFor="whatsappGroupUrl">
          WhatsApp group / channel invite link
        </Label>
        <Input id="whatsappGroupUrl" name="whatsappGroupUrl" type="url" placeholder="https://chat.whatsapp.com/…" value={group} onChange={(e) => setGroup(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>
        <Save /> {pending ? "Saving…" : "Save"}
      </Button>
      <p className="text-xs md:col-span-3">
        {state.error ? (
          <span className="font-medium text-destructive">{state.error}</span>
        ) : state.saved ? (
          <span className="font-medium text-flame">Saved. The site, calendar links and thanks page now use these.</span>
        ) : (
          <span className="text-muted-foreground">
            The thanks page shows a <em>Join the WhatsApp group</em> button once a link is set — that group is where the joining link and reminders go.
          </span>
        )}
      </p>
    </form>
  );
}
