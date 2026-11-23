import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { budgetSchema, researchSchema, routeSchema, tripInputSchema } from "./types";

const runAgentInput = z.object({
  agent: z.enum(["research", "budget", "route", "decision"]),
  trip: tripInputSchema,
  demo: z.boolean().optional(),
  context: z
    .object({
      research: researchSchema.optional(),
      budget: budgetSchema.optional(),
      route: routeSchema.optional(),
    })
    .default({}),
});

/** One specialised agent step; the client-side orchestrator calls these in sequence. */
export const runAgent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => runAgentInput.parse(data))
  .handler(async ({ data }) => {
    const { runAgentOnce } = await import("./agents.server");
    const ctx = {
      ...(data.context.research ? { research: data.context.research } : {}),
      ...(data.context.budget ? { budget: data.context.budget } : {}),
      ...(data.context.route ? { route: data.context.route } : {}),
    };
    return runAgentOnce(data.agent, data.trip, ctx, data.demo ?? false);
  });
