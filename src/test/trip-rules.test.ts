import { describe, expect, it } from "vitest";

import { fallbackBudget, fallbackRoute, fallbackResearch } from "@/lib/trip/fallback";
import { mapsDirectionsUrl, mapsSearchUrl } from "@/lib/trip/maps";
import { DEMO_INPUT, tripInputSchema } from "@/lib/trip/types";

describe("TripSync rules", () => {
  it("demo input is Bengaluru → Mysuru, 2 days, ₹5,000, 2 travellers, budget style", () => {
    expect(DEMO_INPUT).toMatchObject({ origin: "Bengaluru", destination: "Mysuru", days: 2, budget: 5000, travelers: 2, style: "Budget" });
    expect(DEMO_INPUT.interests).toEqual(["Nature", "Culture", "Food"]);
  });

  it("offline budget never exceeds the traveller's budget", () => {
    const b = fallbackBudget(DEMO_INPUT);
    expect(b.estimatedTotal).toBeLessThanOrEqual(5000);
    expect(b.withinBudget).toBe(true);
    expect(b.perPerson).toBe(Math.round(b.estimatedTotal / 2));
  });

  it("offline itinerary has one plan per trip day", () => {
    const r = fallbackRoute(DEMO_INPUT, fallbackResearch(DEMO_INPUT));
    expect(r.days.map((d) => d.day)).toEqual([1, 2]);
  });

  it("rejects trips longer than 14 days", () => {
    expect(tripInputSchema.safeParse({ ...DEMO_INPUT, days: 15 }).success).toBe(false);
  });

  it("builds Google Maps links", () => {
    expect(mapsSearchUrl("Mysore Palace", "Mysuru")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Mysore%20Palace%2C%20Mysuru",
    );
    expect(mapsDirectionsUrl("Bengaluru", "Mysuru")).toContain("origin=Bengaluru&destination=Mysuru");
  });
});
