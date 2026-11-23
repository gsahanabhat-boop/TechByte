import { z } from "zod";

export const INTERESTS = [
  "Nature",
  "Culture",
  "Food",
  "Adventure",
  "History",
  "Shopping",
  "Nightlife",
  "Spiritual",
  "Photography",
  "Relaxation",
] as const;

export const TRAVEL_STYLES = ["Budget", "Comfort", "Luxury", "Backpacker"] as const;

export const tripInputSchema = z.object({
  origin: z.string().trim().min(2, "Enter where you start from").max(80),
  destination: z.string().trim().min(2, "Enter a destination").max(80),
  days: z.coerce.number().int().min(1, "At least 1 day").max(14, "Up to 14 days"),
  budget: z.coerce.number().min(500, "Budget should be at least ₹500").max(10_000_000),
  travelers: z.coerce.number().int().min(1).max(20),
  interests: z.array(z.string().max(30)).min(1, "Pick at least one interest").max(10),
  style: z.enum(TRAVEL_STYLES),
});
export type TripInput = z.infer<typeof tripInputSchema>;

export const DEMO_INPUT: TripInput = {
  origin: "Bengaluru",
  destination: "Mysuru",
  days: 2,
  budget: 5000,
  travelers: 2,
  interests: ["Nature", "Culture", "Food"],
  style: "Budget",
};

const num = z.coerce.number().catch(0);
const str = z.coerce.string().catch("");
const strList = z.array(z.coerce.string()).catch([]);

export const researchSchema = z.object({
  overview: str,
  bestTimeToVisit: str,
  weatherNote: str,
  highlights: z
    .array(
      z.object({
        name: str,
        category: str,
        description: str,
        entryFee: num,
        timeNeeded: str,
        rating: z.coerce.number().min(0).max(5).catch(4),
        interestMatch: str,
      }),
    )
    .catch([]),
  foodSpots: z.array(z.object({ name: str, specialty: str, priceRange: str })).catch([]),
  localTips: strList,
});
export type ResearchResult = z.infer<typeof researchSchema>;

export const BUDGET_CATEGORIES = ["Transport", "Accommodation", "Food", "Activities", "Misc"] as const;

export const budgetSchema = z.object({
  totalBudget: num,
  estimatedTotal: num,
  perPerson: num,
  breakdown: z.array(z.object({ category: str, amount: num, note: str })).catch([]),
  dailySpend: z.array(z.object({ day: num, amount: num })).catch([]),
  savingsTips: strList,
  withinBudget: z.coerce.boolean().catch(true),
});
export type BudgetResult = z.infer<typeof budgetSchema>;

export const routeSchema = z.object({
  transportMode: str,
  travelTimeFromOrigin: str,
  distanceKm: num,
  routeStops: z.array(z.object({ name: str, note: str })).catch([]),
  days: z
    .array(
      z.object({
        day: num,
        theme: str,
        items: z
          .array(
            z.object({
              time: str,
              title: str,
              description: str,
              location: str,
              cost: num,
              durationMins: num,
            }),
          )
          .catch([]),
      }),
    )
    .catch([]),
});
export type RouteResult = z.infer<typeof routeSchema>;

export const decisionSchema = z.object({
  verdict: str,
  score: z.coerce.number().min(0).max(100).catch(75),
  summary: str,
  matchReasons: z.array(z.object({ interest: str, score: num, reason: str })).catch([]),
  optimizations: z.array(z.object({ title: str, impact: str, detail: str })).catch([]),
  alternatives: z.array(z.object({ name: str, reason: str })).catch([]),
  packingList: strList,
});
export type DecisionResult = z.infer<typeof decisionSchema>;

export type AgentId = "research" | "budget" | "route" | "decision";

export interface AgentOutputMap {
  research: ResearchResult;
  budget: BudgetResult;
  route: RouteResult;
  decision: DecisionResult;
}

export interface AgentRunResult<K extends AgentId = AgentId> {
  agent: K;
  data: AgentOutputMap[K];
  source: "gemini" | "fallback";
  model: string;
  durationMs: number;
  notes: string[];
}

export interface TripPlan {
  id: string;
  createdAt: string;
  input: TripInput;
  research: ResearchResult;
  budget: BudgetResult;
  route: RouteResult;
  decision: DecisionResult;
  sources: Record<AgentId, "gemini" | "fallback">;
}

export interface AgentLog {
  id: string;
  at: number;
  agent: AgentId | "orchestrator";
  level: "info" | "success" | "warn" | "error";
  message: string;
}
