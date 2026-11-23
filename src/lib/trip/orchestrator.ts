import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { runAgent } from "./agents.functions";
import type {
  AgentId,
  AgentLog,
  AgentRunResult,
  BudgetResult,
  DecisionResult,
  ResearchResult,
  RouteResult,
  TripInput,
  TripPlan,
} from "./types";

export type AgentStatus = "idle" | "queued" | "running" | "done" | "fallback" | "error";

export const AGENTS: { id: AgentId; name: string; short: string; task: string }[] = [
  {
    id: "research",
    name: "Destination Research Agent",
    short: "Research",
    task: "Discovers attractions, food and local tips",
  },
  {
    id: "budget",
    name: "Budget Planning Agent",
    short: "Budget",
    task: "Allocates spend across transport, stay, food",
  },
  {
    id: "route",
    name: "Route & Itinerary Optimizer",
    short: "Route",
    task: "Orders stops and builds the day-wise plan",
  },
  {
    id: "decision",
    name: "Decision & Personalization Agent",
    short: "Decision",
    task: "Scores fit and proposes optimizations",
  },
];

const initialStatus = (): Record<AgentId, AgentStatus> => ({
  research: "idle",
  budget: "idle",
  route: "idle",
  decision: "idle",
});

/**
 * The orchestrator: dispatches the four agents in dependency order
 * (research → budget → route → decision), passing each one's output forward
 * as shared context, and streams activity logs to the UI.
 */
export function useTripOrchestrator() {
  const run = useServerFn(runAgent);
  const [status, setStatus] = useState(initialStatus);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const log = useCallback((agent: AgentLog["agent"], level: AgentLog["level"], message: string) => {
    setLogs((l) => [
      ...l,
      { id: `${Date.now()}-${Math.random()}`, at: Date.now(), agent, level, message },
    ]);
  }, []);

  const start = useCallback(
    async (trip: TripInput, opts: { demo?: boolean } = {}) => {
      const my = ++runId.current;
      setRunning(true);
      setError(null);
      setPlan(null);
      setLogs([]);
      setStatus({ research: "queued", budget: "queued", route: "queued", decision: "queued" });
      log(
        "orchestrator",
        "info",
        `Received trip: ${trip.origin} → ${trip.destination}, ${trip.days} day(s), ₹${trip.budget.toLocaleString("en-IN")}, ${trip.travelers} traveller(s).`,
      );
      log(
        "orchestrator",
        "info",
        `Planning pipeline: Research → Budget → Route → Decision${opts.demo ? " (offline demo mode)" : ""}.`,
      );

      const sources = {} as TripPlan["sources"];
      const ctx: { research?: ResearchResult; budget?: BudgetResult; route?: RouteResult } = {};

      async function step<K extends AgentId>(
        agent: K,
        label: string,
      ): Promise<AgentRunResult<K>["data"]> {
        setStatus((s) => ({ ...s, [agent]: "running" }));
        log(agent, "info", label);
        let res: AgentRunResult<K>;
        try {
          res = (await run({
            data: { agent, trip, demo: opts.demo ?? false, context: ctx },
          })) as AgentRunResult<K>;
        } catch (e) {
          setStatus((s) => ({ ...s, [agent]: "error" }));
          log(agent, "error", e instanceof Error ? e.message : "Agent failed");
          throw e;
        }
        if (my !== runId.current) throw new Error("cancelled");
        sources[agent] = res.source;
        res.notes.forEach((n) => log(agent, "warn", n));
        setStatus((s) => ({ ...s, [agent]: res.source === "gemini" ? "done" : "fallback" }));
        log(
          agent,
          "success",
          `Completed in ${(res.durationMs / 1000).toFixed(1)}s via ${res.source === "gemini" ? res.model : "offline knowledge"}.`,
        );
        return res.data;
      }

      try {
        const research = (await step(
          "research",
          `Researching ${trip.destination} for ${trip.interests.join(", ")}…`,
        )) as ResearchResult;
        ctx.research = research;
        log(
          "research",
          "info",
          `Found ${research.highlights.length} highlights and ${research.foodSpots.length} food spots.`,
        );
        log("orchestrator", "info", "Handing research to Budget Planning Agent.");

        const budget = (await step(
          "budget",
          `Allocating ₹${trip.budget.toLocaleString("en-IN")} for ${trip.style.toLowerCase()} travel…`,
        )) as BudgetResult;
        ctx.budget = budget;
        log(
          "budget",
          budget.withinBudget ? "success" : "warn",
          `Estimated ₹${Math.round(budget.estimatedTotal).toLocaleString("en-IN")} — ${budget.withinBudget ? "within" : "over"} budget.`,
        );
        log("orchestrator", "info", "Sending highlights + budget to Route Optimizer.");

        const route = (await step(
          "route",
          `Optimising route across ${trip.days} day(s)…`,
        )) as RouteResult;
        ctx.route = route;
        log(
          "route",
          "info",
          `Built ${route.days.length} day plan(s) with ${route.routeStops.length} ordered stops.`,
        );
        log("orchestrator", "info", "Requesting final decision & personalization review.");

        const decision = (await step(
          "decision",
          "Scoring trip fit and searching for optimizations…",
        )) as DecisionResult;
        log(
          "decision",
          "success",
          `Verdict: ${decision.verdict} (fit score ${Math.round(decision.score)}/100).`,
        );

        const final: TripPlan = {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now()),
          createdAt: new Date().toISOString(),
          input: trip,
          research,
          budget,
          route,
          decision,
          sources,
        };
        setPlan(final);
        log("orchestrator", "success", "All agents finished. Trip plan assembled.");
        return final;
      } catch (e) {
        if (my === runId.current) {
          const msg = e instanceof Error ? e.message : "Planning failed";
          setError(msg);
          log("orchestrator", "error", `Workflow stopped: ${msg}. Try again or use Demo mode.`);
        }
        return null;
      } finally {
        if (my === runId.current) setRunning(false);
      }
    },
    [run, log],
  );

  const reset = useCallback(() => {
    runId.current++;
    setStatus(initialStatus());
    setLogs([]);
    setPlan(null);
    setRunning(false);
    setError(null);
  }, []);

  return { status, logs, plan, running, error, start, reset, setPlan };
}
