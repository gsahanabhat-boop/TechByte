import { useEffect, useRef } from "react";
import { CheckCircle2, CircleDashed, Loader2, TriangleAlert, XCircle, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENTS, type AgentStatus } from "@/lib/trip/orchestrator";
import type { AgentId, AgentLog } from "@/lib/trip/types";
import { AGENT_STYLE } from "./agent-meta";

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Standing by",
  queued: "Queued",
  running: "Working",
  done: "Done · Gemini",
  fallback: "Done · Offline",
  error: "Failed",
};

function StatusIcon({ s }: { s: AgentStatus }) {
  if (s === "running") return <Loader2 className="size-4 animate-spin" />;
  if (s === "done") return <CheckCircle2 className="size-4 text-success" />;
  if (s === "fallback") return <TriangleAlert className="size-4 text-warning" />;
  if (s === "error") return <XCircle className="size-4 text-destructive" />;
  return <CircleDashed className="size-4 text-muted-foreground" />;
}

export function AgentWorkflow({ status, running }: { status: Record<AgentId, AgentStatus>; running: boolean }) {
  const Orc = AGENT_STYLE.orchestrator.icon;
  const doneCount = Object.values(status).filter((s) => s === "done" || s === "fallback").length;
  return (
    <div className="journal-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-11 place-items-center rounded-full bg-ink text-ink-foreground", running && "animate-agent-pulse")}>
            <Orc className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orchestrator</p>
            <p className="font-display text-lg font-semibold">
              {running ? "Coordinating agents…" : doneCount === 4 ? "Plan complete" : "Ready to dispatch"}
            </p>
          </div>
        </div>
        <span className="font-mono text-sm text-muted-foreground">{doneCount}/4</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-sun transition-all duration-700" style={{ width: `${(doneCount / 4) * 100}%` }} />
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {AGENTS.map((a, i) => {
          const st = AGENT_STYLE[a.id];
          const s = status[a.id];
          const Icon = st.icon;
          return (
            <li key={a.id} className="relative">
              <div
                className={cn(
                  "h-full rounded-xl border bg-background p-4 transition-all duration-500",
                  s === "running" ? cn(st.border, "shadow-lift -translate-y-0.5") : "border-border",
                  (s === "done" || s === "fallback") && st.border,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("grid size-9 place-items-center rounded-lg", st.bg, st.text, s === "running" && "animate-agent-pulse")}>
                    <Icon className="size-4.5" />
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-tight">{a.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.task}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium">
                  <StatusIcon s={s} /> {STATUS_LABEL[s]}
                </p>
              </div>
              {i < AGENTS.length - 1 && (
                <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-card text-muted-foreground xl:block" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const LEVEL_CLASS: Record<AgentLog["level"], string> = {
  info: "text-ink-foreground/80",
  success: "text-success",
  warn: "text-marigold",
  error: "text-destructive",
};

export function ActivityLog({ logs }: { logs: AgentLog[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [logs.length]);
  const t0 = logs[0]?.at ?? 0;
  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-lift">
      <div className="flex items-center justify-between border-b border-ink-foreground/10 px-4 py-3">
        <p className="font-mono text-xs uppercase tracking-widest opacity-70">Agent activity log</p>
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-agent-route" />
          <span className="size-2.5 rounded-full bg-agent-budget" />
          <span className="size-2.5 rounded-full bg-agent-decision" />
        </span>
      </div>
      <div ref={ref} className="h-72 space-y-1.5 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed" aria-live="polite">
        {logs.length === 0 && <p className="opacity-50">$ waiting for a trip request…</p>}
        {logs.map((l) => {
          const st = AGENT_STYLE[l.agent];
          return (
            <p key={l.id} className="animate-fade-up">
              <span className="opacity-40">+{((l.at - t0) / 1000).toFixed(1)}s </span>
              <span className={cn("font-semibold", l.agent === "orchestrator" ? "text-marigold" : st.text)}>[{st.label}]</span>{" "}
              <span className={LEVEL_CLASS[l.level]}>{l.message}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
