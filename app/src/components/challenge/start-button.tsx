"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { startChallenge } from "@/app/challenge/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function StartButton({ minutes }: { minutes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, go] = useTransition();

  return (
    <>
      <Button type="button" variant="flame" size="lg" onClick={() => setOpen(true)}>
        <Timer /> Start the timer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-normal leading-none">Start now?</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              You&apos;ll see your challenge and have <strong>{minutes} minutes</strong>. The clock keeps running if you close the tab, and it can&apos;t be paused or restarted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button
              type="button"
              variant="flame"
              disabled={busy}
              onClick={() =>
                go(async () => {
                  const r = await startChallenge();
                  if (!r.ok) return void toast.error(r.error ?? "Couldn't start");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {busy ? <Loader2 className="animate-spin" /> : <Timer />} Yes, start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
