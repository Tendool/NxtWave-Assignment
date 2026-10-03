"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Cloud, Cpu, EyeOff, KeyRound, Loader2, Lock, PlugZap, Power, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteKey, detectModels, revealKey, saveAi, testAi } from "@/app/admin/ai/actions";
import { API_PROVIDERS, LOCAL_MODELS, LOCAL_RUNTIMES, isLocalUrl, type AiConfig, type Mode } from "@/lib/llm-presets";
import type { TestResult } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Initial = { config: AiConfig; hasKey: boolean; keyUnreadable: boolean; keyUpdatedAt: string | null; source: "db" | "env" | "none" };

const REVEAL_SECONDS = 30;

function Choice({ active, onClick, icon: Icon, title, sub }: { active: boolean; onClick: () => void; icon: typeof Cpu; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 flex-col items-start gap-1 rounded-md border-[1.5px] border-ink p-4 text-left transition-all",
        active ? "bg-marker text-[#16120e] hard-sm" : "bg-card hover:-translate-y-px",
      )}
    >
      <Icon className="size-5" />
      <span className="font-display text-2xl leading-none">{title}</span>
      <span className={cn("text-xs", active ? "text-[#16120e]/75" : "text-muted-foreground")}>{sub}</span>
    </button>
  );
}

export function AiSettings({ initial, production }: { initial: Initial; production: boolean }) {
  const c = initial.config;
  const [mode, setMode] = useState<Mode>(c.mode);

  // local
  const [runtime, setRuntime] = useState(c.mode === "local" ? c.provider : "ollama");
  const [localBase, setLocalBase] = useState(c.mode === "local" ? c.baseUrl : LOCAL_RUNTIMES[0].baseUrl);
  const [localModel, setLocalModel] = useState(c.mode === "local" ? c.model : "qwen3:4b");
  const [detected, setDetected] = useState<string[] | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  // api
  const startProvider = c.mode === "api" ? c.provider : "gemini";
  const [provider, setProvider] = useState(startProvider);
  const [apiBase, setApiBase] = useState(c.mode === "api" ? c.baseUrl : API_PROVIDERS.find((p) => p.id === "gemini")!.baseUrl);
  const [apiModel, setApiModel] = useState(c.mode === "api" ? c.model : API_PROVIDERS.find((p) => p.id === "gemini")!.defaultModel);
  const [hasKey, setHasKey] = useState(initial.hasKey);
  const [replacing, setReplacing] = useState(!initial.hasKey);
  const [newKey, setNewKey] = useState("");

  // reveal
  const [askPw, setAskPw] = useState(false);
  const [pw, setPw] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [revealError, setRevealError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [test, setTest] = useState<TestResult | null>(null);
  const [busy, startBusy] = useTransition();
  const [which, setWhich] = useState<"save" | "test" | "detect" | "reveal" | null>(null);

  const providerInfo = API_PROVIDERS.find((p) => p.id === provider)!;
  const runtimeInfo = LOCAL_RUNTIMES.find((r) => r.id === runtime)!;

  function hideKey() {
    if (timer.current) clearInterval(timer.current);
    setRevealed(null);
    setLeft(0);
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  // Never leave a revealed key on screen when the user navigates away from the tab.
  useEffect(() => {
    const h = () => document.hidden && hideKey();
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);

  function payload() {
    if (mode === "local") return { mode, provider: runtime, baseUrl: localBase, model: localModel };
    if (mode === "api") return { mode, provider, baseUrl: apiBase, model: apiModel, apiKey: newKey || undefined };
    return { mode, provider: "", baseUrl: "", model: "" };
  }

  function pickProvider(id: string) {
    const prev = API_PROVIDERS.find((p) => p.id === provider)!;
    const next = API_PROVIDERS.find((p) => p.id === id)!;
    setProvider(id);
    setApiBase(next.baseUrl);
    if (!apiModel || apiModel === prev.defaultModel) setApiModel(next.defaultModel);
    setTest(null);
  }

  function pickRuntime(id: string) {
    setRuntime(id);
    setLocalBase(LOCAL_RUNTIMES.find((r) => r.id === id)!.baseUrl);
    setDetected(null);
    setDetectError(null);
    setTest(null);
  }

  const run = (w: typeof which, fn: () => Promise<void>) => {
    setWhich(w);
    startBusy(async () => {
      await fn();
      setWhich(null);
    });
  };

  const onDetect = () =>
    run("detect", async () => {
      const r = await detectModels({ baseUrl: localBase, runtime });
      setDetected(r.ok ? r.models : null);
      setDetectError(r.ok ? null : (r.error ?? "Failed"));
    });

  const onTest = () =>
    run("test", async () => {
      setTest(await testAi(payload()));
    });

  const onSave = () =>
    run("save", async () => {
      const r = await saveAi(payload());
      if (!r.ok) return void toast.error(r.error ?? "Could not save");
      toast.success(mode === "off" ? "AI switched off" : "Saved");
      if (newKey) {
        setNewKey("");
        setHasKey(true);
        setReplacing(false);
        hideKey();
      }
    });

  const onReveal = () =>
    run("reveal", async () => {
      setRevealError(null);
      const r = await revealKey(pw);
      setPw("");
      if (!r.ok || !r.key) return void setRevealError(r.error ?? "Failed");
      setAskPw(false);
      setRevealed(r.key);
      setLeft(REVEAL_SECONDS);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setLeft((n) => {
          if (n <= 1) {
            hideKey();
            return 0;
          }
          return n - 1;
        });
      }, 1000);
    });

  const onDelete = () => {
    if (!confirm("Delete the saved API key? AI features will fall back to basic checks until you add another.")) return;
    run("save", async () => {
      await deleteKey();
      setHasKey(false);
      setReplacing(true);
      hideKey();
      toast.success("Key deleted");
    });
  };

  const modelChosen = mode === "local" ? !!localModel : mode === "api" ? !!apiModel : true;

  return (
    <div className="space-y-6">
      {/* MODE */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Choice active={mode === "local"} onClick={() => { setMode("local"); setTest(null); }} icon={Cpu} title="Run a local model" sub="Qwen, Llama, Gemma… on this machine. Free, private." />
        <Choice active={mode === "api"} onClick={() => { setMode("api"); setTest(null); }} icon={Cloud} title="Use an API key" sub="Gemini, Groq, OpenRouter, OpenAI, Claude…" />
        <Choice active={mode === "off"} onClick={() => { setMode("off"); setTest(null); }} icon={Power} title="Off" sub="Basic automated checks, no AI." />
      </div>

      {/* LOCAL */}
      {mode === "local" && (
        <section className="paper-card space-y-5 p-5">
          {production && (
            <p className="flex gap-2 rounded-md border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>
                This looks like a hosted deployment. <code className="font-mono">localhost</code> here means the <em>server</em>, not your laptop, so a local model only works if it runs on the same machine as this app. Otherwise use an API key.
              </span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="label-mono">Runtime</Label>
              <div className="flex flex-wrap gap-2">
                {LOCAL_RUNTIMES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pickRuntime(r.id)}
                    aria-pressed={runtime === r.id}
                    className={cn("rounded-md border-[1.5px] border-ink px-3 py-1.5 text-sm font-medium", runtime === r.id ? "bg-ink text-paper" : "bg-card hover:bg-marker hover:text-[#16120e]")}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{runtimeInfo.hint}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="label-mono" htmlFor="local-base">Server address</Label>
              <Input id="local-base" value={localBase} onChange={(e) => setLocalBase(e.target.value)} spellCheck={false} className="font-mono text-sm" />
            </div>
          </div>

          <div>
            <Label className="label-mono">Model</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LOCAL_MODELS.map((m) => (
                <button
                  key={m.tag}
                  type="button"
                  onClick={() => { setLocalModel(m.tag); setTest(null); }}
                  aria-pressed={localModel === m.tag}
                  className={cn("rounded-md border-[1.5px] border-ink p-3 text-left transition-all", localModel === m.tag ? "bg-marker text-[#16120e] hard-sm" : "bg-card hover:-translate-y-px")}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{m.label}</span>
                    <span className="label-mono text-[0.65rem] opacity-70">{m.size}</span>
                  </span>
                  <span className={cn("mt-1 block text-xs", localModel === m.tag ? "text-[#16120e]/75" : "text-muted-foreground")}>{m.note}</span>
                  <code className="mt-1.5 block font-mono text-[0.7rem] opacity-70">{m.tag}</code>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="label-mono" htmlFor="local-model">Or any other model name</Label>
              <Input id="local-model" value={localModel} onChange={(e) => { setLocalModel(e.target.value); setTest(null); }} spellCheck={false} placeholder="e.g. deepseek-r1:8b" className="font-mono text-sm" />
            </div>
          </div>

          <div className="space-y-3 border-t border-ink/20 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={onDetect} disabled={busy}>
                {which === "detect" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Detect installed models
              </Button>
              {detected && detected.length === 0 && <span className="text-sm text-muted-foreground">Connected, but no models installed yet.</span>}
            </div>
            {detected && detected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detected.map((m) => (
                  <button key={m} type="button" onClick={() => { setLocalModel(m); setTest(null); }} className={cn("rounded-sm border-[1.5px] border-ink px-2 py-1 font-mono text-xs", localModel === m ? "bg-marker text-[#16120e]" : "bg-card hover:bg-marker hover:text-[#16120e]")}>
                    {m}
                  </button>
                ))}
              </div>
            )}
            {(detectError || (detected && detected.length === 0)) && (
              <div className="rounded-md border-[1.5px] border-ink bg-secondary p-3 text-sm">
                {detectError && <p className="font-medium">{detectError}</p>}
                {runtime === "ollama" && (
                  <p className="mt-1 text-muted-foreground">
                    Install Ollama, then run <code className="font-mono text-foreground">ollama pull {localModel || "qwen3:4b"}</code> in a terminal.
                  </p>
                )}
                <p className="mt-2">
                  Can&apos;t run it locally?{" "}
                  <button type="button" className="font-semibold underline decoration-flame decoration-2 underline-offset-4" onClick={() => setMode("api")}>
                    Use an API key instead
                  </button>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* API */}
      {mode === "api" && (
        <section className="paper-card space-y-5 p-5">
          <div className="space-y-1.5">
            <Label className="label-mono">Provider</Label>
            <div className="flex flex-wrap gap-2">
              {API_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickProvider(p.id)}
                  aria-pressed={provider === p.id}
                  className={cn("flex items-center gap-1.5 rounded-md border-[1.5px] border-ink px-3 py-1.5 text-sm font-medium", provider === p.id ? "bg-ink text-paper" : "bg-card hover:bg-marker hover:text-[#16120e]")}
                >
                  {p.label}
                  {p.free && <span className="label-mono rounded-sm bg-marker px-1 text-[0.6rem] text-[#16120e]">free tier</span>}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{providerInfo.keyHint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="label-mono" htmlFor="api-model">Model</Label>
              <Input id="api-model" value={apiModel} onChange={(e) => { setApiModel(e.target.value); setTest(null); }} spellCheck={false} className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="label-mono" htmlFor="api-base">API address</Label>
              <Input id="api-base" value={apiBase} onChange={(e) => setApiBase(e.target.value)} spellCheck={false} className="font-mono text-sm" />
            </div>
          </div>

          {/* KEY */}
          <div className="space-y-2">
            <Label className="label-mono">API key{provider === "custom-api" ? " (optional)" : ""}</Label>

            {hasKey && !replacing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-md border-[1.5px] border-ink bg-card px-3 py-2.5">
                  <Lock className="size-4 text-moss" />
                  {revealed ? (
                    <code className="min-w-0 flex-1 break-all font-mono text-sm" data-testid="revealed-key">{revealed}</code>
                  ) : (
                    <span className="flex-1 font-mono tracking-[0.25em] text-muted-foreground" aria-label="API key hidden">••••••••••••••••••••</span>
                  )}
                  {revealed ? (
                    <>
                      <span className="label-mono text-muted-foreground">hides in {left}s</span>
                      <Button type="button" size="sm" variant="outline" onClick={hideKey}>
                        <EyeOff /> Hide
                      </Button>
                    </>
                  ) : (
                    <Badge className="bg-card">
                      <Check className="size-3" /> saved · encrypted
                    </Badge>
                  )}
                </div>

                {initial.keyUnreadable && (
                  <p className="text-sm font-medium text-destructive">The saved key can&apos;t be decrypted (the server secret changed). Replace it.</p>
                )}

                {askPw && !revealed && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onReveal();
                    }}
                    className="space-y-2 rounded-md border-[1.5px] border-ink bg-secondary p-3"
                  >
                    <Label className="label-mono" htmlFor="reveal-pw">Enter the admin password to show the key</Label>
                    <div className="flex gap-2">
                      <Input id="reveal-pw" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
                      <Button type="submit" disabled={busy || !pw}>
                        {which === "reveal" ? <Loader2 className="animate-spin" /> : <KeyRound />} Show
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setAskPw(false); setPw(""); setRevealError(null); }}>
                        Cancel
                      </Button>
                    </div>
                    {revealError && <p className="text-xs font-medium text-destructive">{revealError}</p>}
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  {!revealed && !askPw && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setAskPw(true)}>
                      <KeyRound /> Reveal key
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => { setReplacing(true); hideKey(); }}>
                    Replace
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={busy}>
                    <Trash2 /> Delete
                  </Button>
                </div>
                {initial.keyUpdatedAt && <p className="label-mono text-muted-foreground">Saved {new Date(initial.keyUpdatedAt).toLocaleString("en-IN")}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={newKey}
                  onChange={(e) => { setNewKey(e.target.value); setTest(null); }}
                  placeholder={providerInfo.keyHint}
                  className="font-mono text-sm"
                  aria-label="API key"
                />
                <p className="text-xs text-muted-foreground">
                  Stored encrypted on the server. It is never sent back to this page — to see it again you&apos;ll need to re-enter your admin password.
                </p>
                {hasKey && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setReplacing(false); setNewKey(""); }}>
                    Keep the saved key
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {mode === "off" && (
        <section className="paper-card p-5 text-sm text-muted-foreground">
          The project evaluator will do a basic automated check (does the link load, is there a repo and README) and the campus kit will use its built-in message templates.
        </section>
      )}

      {/* ACTIONS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {mode !== "off" && (
            <Button type="button" variant="outline" onClick={onTest} disabled={busy || !modelChosen}>
              {which === "test" ? <Loader2 className="animate-spin" /> : <PlugZap />} Test connection
            </Button>
          )}
          <Button type="button" variant="flame" onClick={onSave} disabled={busy || !modelChosen}>
            {which === "save" ? <Loader2 className="animate-spin" /> : <Check />} Save settings
          </Button>
          {mode === "local" && isLocalUrl(localBase) === false && <span className="text-xs text-muted-foreground">Not a localhost address — make sure it&apos;s reachable from the server.</span>}
        </div>

        {test && (
          <p
            role="status"
            className={cn("rounded-md border-[1.5px] px-3 py-2 text-sm", test.ok ? "border-moss bg-moss/10" : "border-destructive bg-destructive/10")}
          >
            {test.ok ? (
              <>
                <strong>Working.</strong> Answered in {(test.ms / 1000).toFixed(1)}s.
              </>
            ) : (
              <>
                <strong>Didn&apos;t work.</strong> {test.error}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
