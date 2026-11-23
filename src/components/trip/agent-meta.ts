import { Compass, Wallet, Route as RouteIcon, Sparkles, Cpu, type LucideIcon } from "lucide-react";
import type { AgentId } from "@/lib/trip/types";

export const AGENT_STYLE: Record<
  AgentId | "orchestrator",
  { icon: LucideIcon; text: string; bg: string; border: string; label: string }
> = {
  orchestrator: {
    icon: Cpu,
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/40",
    label: "Orchestrator",
  },
  research: {
    icon: Compass,
    text: "text-agent-research",
    bg: "bg-agent-research/12",
    border: "border-agent-research/50",
    label: "Research",
  },
  budget: {
    icon: Wallet,
    text: "text-agent-budget",
    bg: "bg-agent-budget/15",
    border: "border-agent-budget/60",
    label: "Budget",
  },
  route: {
    icon: RouteIcon,
    text: "text-agent-route",
    bg: "bg-agent-route/12",
    border: "border-agent-route/50",
    label: "Route",
  },
  decision: {
    icon: Sparkles,
    text: "text-agent-decision",
    bg: "bg-agent-decision/12",
    border: "border-agent-decision/50",
    label: "Decision",
  },
};
