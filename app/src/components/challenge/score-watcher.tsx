"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the page every few seconds while the score is still being produced, then stops. */
export function ScoreWatcher() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > 45) return clearInterval(t); // ~3 minutes
      router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
