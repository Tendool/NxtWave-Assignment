"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { rescore } from "@/app/admin/assessments/actions";
import { Button } from "@/components/ui/button";

export function RescoreButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, go] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() =>
        go(async () => {
          await rescore(submissionId);
          toast.success("Re-scored");
          router.refresh();
        })
      }
    >
      {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Re-score
    </Button>
  );
}
