import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Cpu, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ActivityLog, AgentWorkflow } from "@/components/trip/AgentWorkflow";
import { AGENT_STYLE } from "@/components/trip/agent-meta";
import { SiteFooter, SiteHeader } from "@/components/trip/SiteHeader";
import { TripForm } from "@/components/trip/TripForm";
import { TripResults } from "@/components/trip/TripResults";
import { AGENTS, useTripOrchestrator } from "@/lib/trip/orchestrator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TripSync AI — Plan a trip with four autonomous AI agents" },
      {
        name: "description",
        content:
          "Enter where, when and how much. TripSync AI's research, budget, route and decision agents build a full day-wise plan with maps and charts.",
      },
      { property: "og:title", content: "TripSync AI — Plan a trip with four autonomous AI agents" },
      {
        property: "og:description",
        content:
          "Research, budget, route and personalisation agents coordinate to plan your trip in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const orc = useTripOrchestrator();
  const resultsRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orc.plan) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [orc.plan]);

  useEffect(() => {
    if (orc.error) toast.error("Planning hit a problem", { description: orc.error });
  }, [orc.error]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="topo relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Cpu className="size-3.5 text-accent" /> Autonomous multi-agent planner
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Four agents.
              <br />
              <span className="italic text-sun">One perfect trip.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Tell TripSync where you're headed. A research, budget, route and decision agent work
              together — powered by Gemini — to hand you a ready-to-go plan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <a href="#planner">
                  <Sparkles /> Plan my trip
                </a>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <a href="#how">
                  How it works <ArrowDown />
                </a>
              </Button>
            </div>
          </div>

          {/* Agent constellation */}
          <div
            className="relative mx-auto aspect-square w-full max-w-md animate-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden>
              {[
                [200, 70],
                [330, 200],
                [200, 330],
                [70, 200],
              ].map(([x, y], i) => (
                <line
                  key={i}
                  x1="200"
                  y1="200"
                  x2={x}
                  y2={y}
                  className="animate-dash stroke-primary/40"
                  strokeWidth="2"
                />
              ))}
              <circle
                cx="200"
                cy="200"
                r="150"
                className="fill-none stroke-border"
                strokeDasharray="4 6"
              />
            </svg>
            <div className="absolute left-1/2 top-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-center text-ink-foreground shadow-lift">
              <div>
                <Cpu className="mx-auto size-6" />
                <p className="mt-1 text-xs font-semibold">Orchestrator</p>
              </div>
            </div>
            {AGENTS.map((a, i) => {
              const st = AGENT_STYLE[a.id];
              const Icon = st.icon;
              const pos = [
                "left-1/2 top-[17.5%]",
                "left-[82.5%] top-1/2",
                "left-1/2 top-[82.5%]",
                "left-[17.5%] top-1/2",
              ][i];
              return (
                <div key={a.id} className={`absolute ${pos} -translate-x-1/2 -translate-y-1/2`}>
                  <div className="flex w-28 flex-col items-center gap-1.5 text-center">
                    <span
                      className={`grid size-14 place-items-center rounded-2xl border bg-card shadow-card ${st.border} ${st.text}`}
                    >
                      <Icon className="size-6" />
                    </span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold shadow-card">
                      {a.short}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">How it works</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">
          An orchestrator hands your trip down a relay of specialists.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((a, i) => {
            const st = AGENT_STYLE[a.id];
            const Icon = st.icon;
            return (
              <div key={a.id} className="journal-card p-5">
                <div className="flex items-center justify-between">
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${st.bg} ${st.text}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-3xl italic text-border">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{a.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.task}.</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Planner */}
      <section id="planner" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <TripForm
            running={orc.running}
            onSubmit={(trip, opts) => {
              workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              void orc.start(trip, opts);
            }}
          />
          <div ref={workflowRef} className="scroll-mt-20 space-y-6">
            <AgentWorkflow status={orc.status} running={orc.running} />
            <ActivityLog logs={orc.logs} />
          </div>
        </div>
      </section>

      <div ref={resultsRef} className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-12 sm:px-6">
        {orc.plan && <TripResults plan={orc.plan} />}
      </div>

      <SiteFooter />
    </div>
  );
}
