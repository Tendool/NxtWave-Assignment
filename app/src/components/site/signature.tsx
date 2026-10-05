"use client";

import { useEffect } from "react";
import { AUTHOR } from "@/lib/constants";

/** Signs the browser console once per page load, for anyone who opens dev tools. */
export function Signature() {
  useEffect(() => {
    console.log(`%cBuild60%c designed & built by ${AUTHOR}`, "font: 600 14px serif; color: #ff4a1c", "font: 12px monospace; color: inherit");
  }, []);
  return null;
}
