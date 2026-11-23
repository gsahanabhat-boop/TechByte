import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Trash2, Users, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/trip/SiteHeader";
import { tripHistory } from "@/lib/trip/history";
import { formatINR } from "@/lib/trip/maps";
import type { TripPlan } from "@/lib/trip/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "My trips — TripSync AI" },
      { name: "description", content: "Every trip plan you've saved from TripSync AI's travel agents." },
      { property: "og:title", content: "My trips — TripSync AI" },
      { property: "og:description", content: "Your saved AI-generated travel plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [trips, setTrips] = useState<TripPlan[]>([]);
  useEffect(() => {
    const load = () => setTrips(tripHistory.list());
    load();
    window.addEventListener("tripsync:history", load);
    return () => window.removeEventListener("tripsync:history", load);
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Trip history</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-semibold">My saved trips</h1>
          {trips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => tripHistory.clear()}>
              Clear all
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Saved on this device.</p>

        {trips.length === 0 ? (
          <div className="journal-card mt-8 p-10 text-center">
            <p className="font-display text-2xl">No trips yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Plan one and hit "Save trip" to keep it here.</p>
            <Button variant="hero" className="mt-6" asChild>
              <Link to="/">Plan a trip</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {trips.map((t) => (
              <li key={t.id} className="journal-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {t.input.origin} → <span className="text-accent">{t.input.destination}</span>
                    </h2>
                  </div>
                  <span className="rounded-full bg-agent-decision/12 px-2.5 py-1 font-mono text-xs font-semibold text-agent-decision">
                    {Math.round(t.decision.score)}/100
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-4" /> {t.input.days}d
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-4" /> {t.input.travelers}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wallet className="size-4" /> {formatINR(t.budget.estimatedTotal)} / {formatINR(t.input.budget)}
                  </span>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button asChild className="flex-1">
                    <Link to="/trips/$tripId" params={{ tripId: t.id }}>
                      Open plan <ArrowRight />
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Delete trip" onClick={() => tripHistory.remove(t.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
