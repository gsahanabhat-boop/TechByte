import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  Lightbulb,
  MapPin,
  Navigation,
  Star,
  Ticket,
  TrendingDown,
  Utensils,
  Backpack,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { tripHistory } from "@/lib/trip/history";
import { formatINR, mapsDirectionsUrl, mapsSearchUrl } from "@/lib/trip/maps";
import type { TripPlan } from "@/lib/trip/types";
import { AGENT_STYLE } from "./agent-meta";

function SectionTitle({ agent, title, kicker }: { agent: keyof typeof AGENT_STYLE; title: string; kicker: string }) {
  const st = AGENT_STYLE[agent];
  const Icon = st.icon;
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest", st.text)}>
          <Icon className="size-3.5" /> {kicker}
        </p>
        <h3 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h3>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "gemini" | "fallback" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        source === "gemini" ? "bg-success/15 text-success" : "bg-warning/20 text-foreground",
      )}
    >
      {source === "gemini" ? "Gemini" : "Offline demo"}
    </span>
  );
}

export function TripResults({ plan }: { plan: TripPlan }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(tripHistory.has(plan.id)), [plan.id]);
  const { input, research, budget, route, decision } = plan;

  const save = () => {
    tripHistory.save(plan);
    setSaved(true);
    toast.success("Trip saved to My trips");
  };

  return (
    <div className="space-y-10">
      {/* Summary ticket */}
      <div className="overflow-hidden rounded-3xl bg-dusk text-ink-foreground shadow-lift animate-fade-up">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest opacity-70">Your trip · {input.days} day(s) · {input.travelers} traveller(s)</p>
            <h2 className="mt-2 text-4xl font-semibold sm:text-5xl">
              {input.origin} <ArrowRightLeft className="inline size-7 opacity-60" /> <span className="text-sun">{input.destination}</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-85">{research.overview}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant={saved ? "glass" : "hero"} onClick={save} disabled={saved}>
                {saved ? <BookmarkCheck /> : <Bookmark />} {saved ? "Saved" : "Save trip"}
              </Button>
              <Button variant="glass" asChild>
                <a href={mapsDirectionsUrl(input.origin, input.destination)} target="_blank" rel="noreferrer">
                  <Navigation /> Directions
                </a>
              </Button>
              {saved && (
                <Button variant="glass" asChild>
                  <Link to="/history">My trips</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "Fit score", v: `${Math.round(decision.score)}/100` },
              { k: "Estimated", v: formatINR(budget.estimatedTotal) },
              { k: "Per person", v: formatINR(budget.perPerson) },
              { k: "Travel", v: route.travelTimeFromOrigin || "—" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-ink-foreground/15 bg-ink-foreground/5 p-4">
                <p className="text-xs uppercase tracking-wider opacity-60">{s.k}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DecisionPanel plan={plan} />
      <Destinations plan={plan} />
      <Itinerary plan={plan} />
      <BudgetDashboard plan={plan} />
      <RouteSection plan={plan} />
    </div>
  );
}

function DecisionPanel({ plan }: { plan: TripPlan }) {
  const { decision } = plan;
  const good = decision.score >= 70;
  return (
    <section className="journal-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle agent="decision" kicker="Decision & optimization" title="Should you go?" />
        <SourceBadge source={plan.sources.decision} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-secondary p-6 text-center">
          <div
            className="grid size-36 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--agent-decision) ${decision.score * 3.6}deg, var(--muted) 0)` }}
          >
            <div className="grid size-28 place-items-center rounded-full bg-card">
              <span className="font-display text-4xl font-semibold">{Math.round(decision.score)}</span>
            </div>
          </div>
          <p className={cn("mt-4 flex items-center gap-1.5 font-semibold", good ? "text-success" : "text-warning")}>
            <BadgeCheck className="size-4" /> {decision.verdict}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{decision.summary}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold">Interest match</p>
            <div className="space-y-3">
              {decision.matchReasons.map((m) => (
                <div key={m.interest}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{m.interest}</span>
                    <span className="font-mono text-muted-foreground">{Math.round(m.score)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-agent-decision" style={{ width: `${Math.min(100, m.score)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Optimizations applied</p>
            <ul className="space-y-2.5">
              {decision.optimizations.map((o) => (
                <li key={o.title} className="rounded-xl border border-border p-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <TrendingDown className="size-4 text-agent-decision" /> {o.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-agent-decision/12 px-2 py-0.5 text-[11px] font-semibold text-agent-decision">{o.impact}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{o.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          {decision.alternatives.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Alternatives to consider</p>
              <ul className="space-y-2">
                {decision.alternatives.map((a) => (
                  <li key={a.name} className="text-sm">
                    <a href={mapsSearchUrl(a.name)} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                      {a.name}
                    </a>
                    <span className="text-muted-foreground"> — {a.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {decision.packingList.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Backpack className="size-4" /> Packing list
              </p>
              <div className="flex flex-wrap gap-1.5">
                {decision.packingList.map((p) => (
                  <span key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Destinations({ plan }: { plan: TripPlan }) {
  const { research, input } = plan;
  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle agent="research" kicker="Destination discovery" title={`Highlights of ${input.destination}`} />
        <SourceBadge source={plan.sources.research} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {research.highlights.map((h, i) => (
          <a
            key={`${h.name}-${i}`}
            href={mapsSearchUrl(h.name, input.destination)}
            target="_blank"
            rel="noreferrer"
            className="group journal-card flex flex-col p-5 transition-all hover:-translate-y-1 hover:shadow-lift animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-agent-research/12 px-2.5 py-0.5 text-xs font-semibold text-agent-research">{h.category}</span>
              <span className="flex items-center gap-1 text-xs font-semibold">
                <Star className="size-3.5 fill-marigold text-marigold" /> {h.rating.toFixed(1)}
              </span>
            </div>
            <h4 className="mt-3 text-lg font-semibold leading-snug">{h.name}</h4>
            <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{h.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Ticket className="size-3.5" /> {h.entryFee ? `${formatINR(h.entryFee)}/person` : "Free"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {h.timeNeeded}
              </span>
              <ExternalLink className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </a>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="journal-card p-5">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Utensils className="size-4 text-accent" /> Must-try food
          </p>
          <ul className="divide-y divide-border">
            {research.foodSpots.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <a href={mapsSearchUrl(f.name, input.destination)} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">
                    {f.name}
                  </a>
                  <p className="text-xs text-muted-foreground">{f.specialty}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{f.priceRange}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="journal-card p-5">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="size-4 text-marigold" /> Local tips
          </p>
          <ul className="space-y-2 text-sm">
            {research.localTips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Best time:</span> {research.bestTimeToVisit} · {research.weatherNote}
          </p>
        </div>
      </div>
    </section>
  );
}

function Itinerary({ plan }: { plan: TripPlan }) {
  const { route, input } = plan;
  const first = route.days[0]?.day ?? 1;
  return (
    <section className="journal-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle agent="route" kicker="Day-wise itinerary" title="Your schedule" />
        <SourceBadge source={plan.sources.route} />
      </div>
      <Tabs defaultValue={`day-${first}`}>
        <TabsList className="mb-5 h-auto flex-wrap">
          {route.days.map((d) => (
            <TabsTrigger key={d.day} value={`day-${d.day}`} className="px-4 py-1.5">
              Day {d.day}
            </TabsTrigger>
          ))}
        </TabsList>
        {route.days.map((d) => (
          <TabsContent key={d.day} value={`day-${d.day}`}>
            <p className="mb-4 font-display text-lg italic text-muted-foreground">{d.theme}</p>
            <ol className="relative space-y-4 border-l-2 border-dashed border-agent-route/40 pl-6">
              {d.items.map((it, i) => (
                <li key={`${it.time}-${i}`} className="relative">
                  <span className="absolute -left-[33px] top-1 grid size-4 place-items-center rounded-full border-2 border-agent-route bg-card" />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                    <span className="w-14 shrink-0 font-mono text-sm font-semibold text-agent-route">{it.time}</span>
                    <div className="flex-1 rounded-xl bg-muted/60 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{it.title}</p>
                        <span className="font-mono text-xs text-muted-foreground">
                          {it.cost ? formatINR(it.cost) : "Free"} · {it.durationMins ? `${it.durationMins} min` : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>
                      {it.location && (
                        <a
                          href={mapsSearchUrl(it.location, input.destination)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <MapPin className="size-3.5" /> {it.location}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function BudgetDashboard({ plan }: { plan: TripPlan }) {
  const { budget, input } = plan;
  const used = Math.min(100, (budget.estimatedTotal / Math.max(input.budget, 1)) * 100);
  const config: ChartConfig = Object.fromEntries(
    budget.breakdown.map((b, i) => [b.category, { label: b.category, color: PIE_COLORS[i % PIE_COLORS.length] ?? "var(--chart-1)" }]),
  );
  const pieData = budget.breakdown.map((b) => ({ name: b.category, value: Math.round(b.amount) }));
  const dayData = budget.dailySpend.map((d) => ({ day: `Day ${d.day}`, amount: Math.round(d.amount) }));
  return (
    <section className="journal-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle agent="budget" kicker="Budget dashboard" title="Where the money goes" />
        <SourceBadge source={plan.sources.budget} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { k: "Your budget", v: formatINR(input.budget) },
          { k: "Estimated spend", v: formatINR(budget.estimatedTotal) },
          { k: budget.withinBudget ? "Left as buffer" : "Over budget by", v: formatINR(Math.abs(input.budget - budget.estimatedTotal)) },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl bg-secondary p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.k}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Budget used</span>
          <span className="font-mono">{used.toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", budget.withinBudget ? "bg-sun" : "bg-destructive")} style={{ width: `${used}%` }} />
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
        <ChartContainer config={config} className="mx-auto aspect-square h-64">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} strokeWidth={0}>
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="space-y-2.5 self-center">
          {budget.breakdown.map((b, i) => (
            <li key={b.category} className="flex items-start gap-3">
              <span className="mt-1.5 size-3 shrink-0 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{b.category}</span>
                  <span className="font-mono">{formatINR(b.amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{b.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <p className="mb-2 text-sm font-semibold">Spend per day</p>
          <ChartContainer config={{ amount: { label: "Spend", color: "var(--chart-2)" } }} className="h-56 w-full">
            <BarChart data={dayData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
      {budget.savingsTips.length > 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-agent-budget/60 bg-agent-budget/10 p-4">
          <p className="text-sm font-semibold">Money-saving moves</p>
          <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {budget.savingsTips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-agent-budget">₹</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RouteSection({ plan }: { plan: TripPlan }) {
  const { route, input } = plan;
  const stops = route.routeStops.map((s) => `${s.name}, ${input.destination}`);
  return (
    <section className="journal-card overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1.2fr]">
        <div className="p-5 sm:p-7">
          <SectionTitle agent="route" kicker="Optimised route" title="Getting around" />
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Mode</dt>
              <dd className="mt-1 font-medium">{route.transportMode}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Time</dt>
              <dd className="mt-1 font-medium">{route.travelTimeFromOrigin}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Distance</dt>
              <dd className="mt-1 font-medium">{route.distanceKm ? `${Math.round(route.distanceKm)} km` : "—"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <a href={mapsDirectionsUrl(input.origin, input.destination)} target="_blank" rel="noreferrer">
                <Navigation /> {input.origin} → {input.destination}
              </a>
            </Button>
            {stops.length > 1 && (
              <Button variant="outline" asChild>
                <a href={mapsDirectionsUrl(stops[0] ?? input.destination, stops[stops.length - 1] ?? input.destination, stops.slice(1, -1))} target="_blank" rel="noreferrer">
                  <MapPin /> Full sightseeing loop
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="topo bg-secondary/60 p-5 sm:p-7">
          <ol className="space-y-0">
            {[{ name: input.origin, note: "Start" }, ...route.routeStops].map((s, i, arr) => (
              <li key={`${s.name}-${i}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold",
                      i === 0 ? "bg-ink text-ink-foreground" : "bg-agent-route text-accent-foreground",
                    )}
                  >
                    {i === 0 ? "A" : i}
                  </span>
                  {i < arr.length - 1 && <span className="my-1 w-0.5 flex-1 bg-agent-route/40" />}
                </div>
                <a
                  href={mapsSearchUrl(s.name, i === 0 ? undefined : input.destination)}
                  target="_blank"
                  rel="noreferrer"
                  className="group mb-4 flex-1 rounded-xl bg-card/90 px-4 py-2.5 shadow-card transition-colors hover:bg-card"
                >
                  <p className="flex items-center justify-between text-sm font-semibold">
                    {s.name} <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </p>
                  <p className="text-xs text-muted-foreground">{s.note}</p>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
