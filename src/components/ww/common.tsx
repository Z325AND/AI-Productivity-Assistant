import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { AlertTriangle, Copy, Loader2, RotateCcw, ShieldCheck, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiResult } from "@/lib/ai.functions";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-ai shadow-ai">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M5 12.5l3.5 3.5L19 5.5" stroke="currentColor" className="text-ai-foreground dark:text-primary-foreground" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18.5" cy="17.5" r="2.2" className="fill-ai-foreground dark:fill-primary-foreground" />
        </svg>
      </div>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight">
          WorkWise <span className="text-ai">AI</span>
        </span>
      )}
    </div>
  );
}

export function PageHeader({ icon: Icon, title, description, children }: { icon: typeof BrainCircuit; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-ai-soft text-ai">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border bg-card p-5 shadow-card", className)}>{children}</div>;
}

export function AiNotice() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="h-3.5 w-3.5 text-ai" />
      AI-generated content — review before use.
    </div>
  );
}

export function PrivacyHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Don't paste passwords, sensitive personal data or confidential company information.
    </p>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-ww">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied to clipboard"),
    () => toast.error("Couldn't copy — please select and copy manually"),
  );
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function CopyButton({ text }: { text: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => copyText(text)}>
      <Copy className="h-3.5 w-3.5" /> Copy
    </Button>
  );
}

/** Calls a server AI function and tracks loading / error state. Never fakes success. */
export function useAi<I, T>(fn: (args: { data: I }) => Promise<AiResult<T>>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<I | null>(null);
  const run = async (input: I): Promise<T | null> => {
    setLoading(true);
    setError(null);
    setLast(input);
    try {
      const r = await fn({ data: input });
      if (!r.ok) {
        setError(r.error);
        return null;
      }
      return r.data;
    } catch {
      setError("Couldn't reach the AI service. Check your connection and retry.");
      return null;
    } finally {
      setLoading(false);
    }
  };
  return { run, loading, error, last, clearError: () => setError(null) };
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1">{error}</div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

export function Thinking({ label = "WorkWise AI is thinking…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3 py-6" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-ai">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </div>
      {[90, 75, 82, 60].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: typeof BrainCircuit; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-ai-soft text-ai">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
