import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
import type { z } from "zod";

import { fallbackBudget, fallbackDecision, fallbackResearch, fallbackRoute } from "./fallback";
import {
  budgetSchema,
  decisionSchema,
  researchSchema,
  routeSchema,
  type AgentId,
  type AgentOutputMap,
  type AgentRunResult,
  type BudgetResult,
  type ResearchResult,
  type RouteResult,
  type TripInput,
} from "./types";

export const MODEL = "google/gemini-3.8-flash" as const;

function describeTrip(t: TripInput): string {
  return `Origin: ${t.origin}\nDestination: ${t.destination}\nDuration: ${t.days} day(s)\nTotal budget: ₹${t.budget} INR for the whole group\nTravelers: ${t.travelers}\nInterests: ${t.interests.join(", ")}\nTravel style: ${t.style}`;
}

const PROMPTS: Record<AgentId, { role: string; shape: string }> = {
  research: {
    role: "You are the Destination Research Agent of TripSync AI. You research real, verifiable attractions, food spots and practical local tips for Indian and global destinations. Prefer real place names that exist on Google Maps.",
    shape: `{"overview":string,"bestTimeToVisit":string,"weatherNote":string,"highlights":[{"name":string,"category":string,"description":string,"entryFee":number (INR per person),"timeNeeded":string,"rating":number (0-5),"interestMatch":string (one of the traveller interests)}] (6-8 items),"foodSpots":[{"name":string,"specialty":string,"priceRange":string}] (3-5 items),"localTips":string[] (3-5)}`,
  },
  budget: {
    role: "You are the Budget Planning Agent of TripSync AI. You build realistic Indian-rupee cost estimates for the whole group and must keep the estimated total at or below the traveller's budget whenever possible, leaving a small buffer.",
    shape: `{"totalBudget":number,"estimatedTotal":number,"perPerson":number,"breakdown":[{"category":"Transport"|"Accommodation"|"Food"|"Activities"|"Misc","amount":number,"note":string}] (exactly these 5 categories),"dailySpend":[{"day":number,"amount":number}] (one per day),"savingsTips":string[] (3-4),"withinBudget":boolean}`,
  },
  route: {
    role: "You are the Route and Itinerary Optimizer Agent of TripSync AI. You order attractions to minimise backtracking, respect opening hours, and produce a realistic day-wise schedule including travel from the origin on day 1 and return on the last day.",
    shape: `{"transportMode":string,"travelTimeFromOrigin":string,"distanceKm":number,"routeStops":[{"name":string,"note":string}] (ordered optimal route, real place names),"days":[{"day":number,"theme":string,"items":[{"time":"HH:MM","title":string,"description":string,"location":string (real place name for Google Maps),"cost":number (INR for whole group),"durationMins":number}] (5-7 items)}] (one per day)}`,
  },
  decision: {
    role: "You are the Trip Decision and Personalization Agent of TripSync AI. You critically review the research, budget and itinerary, score how well the trip fits the traveller, and propose concrete optimizations.",
    shape: `{"verdict":string (short, e.g. "Go — great fit" or "Adjust before booking"),"score":number (0-100),"summary":string (2-3 sentences),"matchReasons":[{"interest":string,"score":number (0-100),"reason":string}] (one per interest),"optimizations":[{"title":string,"impact":string,"detail":string}] (3-4),"alternatives":[{"name":string,"reason":string}] (2-3),"packingList":string[] (5-7)}`,
  },
};

const SCHEMAS = {
  research: researchSchema,
  budget: budgetSchema,
  route: routeSchema,
  decision: decisionSchema,
} satisfies Record<AgentId, z.ZodTypeAny>;

export interface AgentContext {
  research?: ResearchResult;
  budget?: BudgetResult;
  route?: RouteResult;
}

function contextText(agent: AgentId, ctx: AgentContext): string {
  const parts: string[] = [];
  if (agent !== "research" && ctx.research)
    parts.push(`Research findings: ${JSON.stringify({ highlights: ctx.research.highlights, foodSpots: ctx.research.foodSpots })}`);
  if ((agent === "route" || agent === "decision") && ctx.budget)
    parts.push(`Budget plan: ${JSON.stringify(ctx.budget)}`);
  if (agent === "decision" && ctx.route)
    parts.push(`Itinerary: ${JSON.stringify(ctx.route.days.map((d) => ({ day: d.day, items: d.items.map((i) => i.title) })))}`);
  return parts.join("\n\n");
}

function fallbackFor<K extends AgentId>(agent: K, t: TripInput, ctx: AgentContext): AgentOutputMap[K] {
  const research = ctx.research ?? fallbackResearch(t);
  const budget = ctx.budget ?? fallbackBudget(t);
  const map: AgentOutputMap = {
    research,
    budget,
    route: ctx.route ?? fallbackRoute(t, research),
    decision: fallbackDecision(t, budget, research),
  };
  if (agent === "research") return fallbackResearch(t) as AgentOutputMap[K];
  if (agent === "budget") return fallbackBudget(t) as AgentOutputMap[K];
  if (agent === "route") return fallbackRoute(t, research) as AgentOutputMap[K];
  return map[agent];
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Runs one specialised agent against Gemini; any failure degrades to the offline plan. */
export async function runAgentOnce<K extends AgentId>(
  agent: K,
  trip: TripInput,
  ctx: AgentContext,
  forceDemo = false,
): Promise<AgentRunResult<K>> {
  const started = Date.now();
  const notes: string[] = [];
  if (!forceDemo) {
    try {
      const p = PROMPTS[agent];
      const res = await generateChatCompletion({
        model: MODEL,
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content: `${p.role}\nReturn JSON only, no markdown, matching exactly this shape:\n${p.shape}\nAll money values are numbers in Indian Rupees without symbols.`,
          },
          {
            role: "user",
            content: `Trip request:\n${describeTrip(trip)}\n\n${contextText(agent, ctx)}`.trim(),
          },
        ],
      });
      const text = res.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new Error("Empty model response");
      const parsed = SCHEMAS[agent].safeParse(extractJson(text));
      if (!parsed.success) throw new Error("Model output did not match the expected structure");
      const data = parsed.data as AgentOutputMap[K];
      if (agent === "budget") {
        const b = data as BudgetResult;
        b.totalBudget = trip.budget;
        b.withinBudget = b.estimatedTotal <= trip.budget;
        if (!b.breakdown.length) throw new Error("Budget agent returned no breakdown");
      }
      if (agent === "route" && !(data as RouteResult).days.length) throw new Error("Route agent returned no days");
      if (agent === "research" && !(data as ResearchResult).highlights.length)
        throw new Error("Research agent returned no highlights");
      return { agent, data, source: "gemini", model: MODEL, durationMs: Date.now() - started, notes };
    } catch (err) {
      const msg =
        err instanceof GatewayError
          ? `Gemini unavailable (${err.code ?? err.httpStatus ?? "gateway error"})`
          : err instanceof Error
            ? err.message
            : "Unknown AI error";
      console.error(`[agent:${agent}]`, err);
      notes.push(`${msg} — switched to offline demo knowledge.`);
    }
  } else {
    notes.push("Demo mode — using offline knowledge base.");
  }
  return {
    agent,
    data: fallbackFor(agent, trip, ctx),
    source: "fallback",
    model: "offline-demo",
    durationMs: Date.now() - started,
    notes,
  };
}
