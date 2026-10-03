"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeAssessment, toggleActive } from "@/app/admin/assessments/actions";
import { Button } from "@/components/ui/button";

export function AssessmentRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, go] = useTransition();
  return (
    <div className="flex gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          go(async () => {
            await toggleActive(id, !active);
            router.refresh();
          })
        }
        title={active ? "Stop assigning this to new students" : "Start assigning this again"}
      >
        {active ? <EyeOff /> : <Eye />} {active ? "Deactivate" : "Activate"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        aria-label="Delete assessment"
        onClick={() => {
          if (!confirm("Delete this assessment?")) return;
          go(async () => {
            const r = await removeAssessment(id);
            if (!r.ok) toast.error(r.error);
            router.refresh();
          });
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
