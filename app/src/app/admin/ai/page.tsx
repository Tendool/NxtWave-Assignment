import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { LOCAL_MODELS_ALLOWED, getPublicAiState } from "@/lib/ai";
import { AiSettings } from "@/components/admin/ai-settings";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI settings — Build60", robots: { index: false } };

export default async function AiSettingsPage() {
  if (!(await isAdmin())) redirect("/admin");
  // Only booleans and labels cross to the client — never the key itself.
  const state = await getPublicAiState();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <AdminNav active="/admin/ai" />
      <p className="label-mono mt-6 text-flame">Admin</p>
      <h1 className="mt-1 text-5xl">AI settings</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Used for scoring submitted projects and writing campus-lead messages.{" "}
        {LOCAL_MODELS_ALLOWED ? "Pick a model that runs on this machine, or add an API key for a hosted one." : "Add an API key for a hosted model."} Nothing else in the site needs a model.
      </p>
      {state.source === "env" && (
        <p className="paper-card mt-5 p-3 text-sm">
          Currently using the <code className="font-mono">ANTHROPIC_API_KEY</code> environment variable. Saving settings here overrides it.
        </p>
      )}
      <div className="mt-8">
        <AiSettings initial={state} production={process.env.NODE_ENV === "production"} localAllowed={LOCAL_MODELS_ALLOWED} />
      </div>
    </main>
  );
}
