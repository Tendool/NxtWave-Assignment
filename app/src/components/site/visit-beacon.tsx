"use client";

import { useEffect } from "react";
import { recordVisit } from "@/app/visit/actions";

/** Logs one landing-page visit per tab session, with its ?src= tag, so the dashboard can show conversion per channel. */
export function VisitBeacon({ source, referred }: { source: string | null; referred: boolean }) {
  useEffect(() => {
    const key = `b60_visit:${source ?? ""}:${referred ? 1 : 0}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked — the server dedupes per day anyway */
    }
    void recordVisit(source, referred);
  }, [source, referred]);
  return null;
}
