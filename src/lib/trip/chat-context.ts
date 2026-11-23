import { tripHistory } from "./history";

/** Compact summary of the user's saved trips (stored in this browser) for the chat assistant. */
export function buildTripContext(max = 3): string {
  const trips = tripHistory.list().slice(0, max);
  if (!trips.length) return "";
  return trips
    .map((t) => {
      const days = t.route.days
        .map((d) => `Day ${d.day}: ${d.items.map((i) => `${i.time} ${i.title}`).join("; ")}`)
        .join(" | ");
      return `- ${t.input.origin} → ${t.input.destination}, ${t.input.days} day(s), ${t.input.travelers} traveller(s), budget ₹${t.input.budget}, estimate ₹${Math.round(t.budget.estimatedTotal)}, style ${t.input.style}, interests ${t.input.interests.join("/")}. Verdict: ${t.decision.verdict} (${Math.round(t.decision.score)}/100). ${days}`;
    })
    .join("\n")
    .slice(0, 6000);
}
