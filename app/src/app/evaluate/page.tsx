import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { EvaluateForm } from "@/components/site/evaluate-form";

export const metadata = { title: "Score your project — Build60" };

export default function EvaluatePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <p className="label-mono text-flame">After the workshop</p>
        <h1 className="mt-2 max-w-2xl text-5xl md:text-6xl">Submit your project. Get scored in seconds.</h1>
        <p className="mt-4 max-w-2xl text-ink/75">
          Paste your live link and repo. We open them, check they actually work, and score the build against a clear
          rubric — with three specific things to fix next. Every submission also lands on the public gallery.
        </p>
        <div className="mt-10">
          <EvaluateForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
