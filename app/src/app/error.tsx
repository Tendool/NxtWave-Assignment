"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

/** Shown when a page fails to render. Never displays the error itself: messages can contain internals. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="rise mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-start justify-center px-5 py-20">
      <p className="label-mono text-flame">Something broke</p>
      <h1 className="mt-3 text-5xl leading-[0.95] md:text-7xl">That didn&apos;t load.</h1>
      <p className="mt-5 max-w-md text-lg text-ink/75">
        It&apos;s on our side, not yours. Try again — your registration and challenge timer are safe on the server.
      </p>
      {error.digest && <p className="label-mono mt-3 text-muted-foreground">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-ink bg-flame px-5 font-semibold text-white hard-sm transition-transform hover:-translate-y-0.5"
        >
          <RotateCcw className="size-4" /> Try again
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-md border-[1.5px] border-ink bg-card px-5 font-semibold transition-colors hover:bg-marker">
          Home
        </Link>
      </div>
    </main>
  );
}
