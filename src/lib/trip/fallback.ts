import type { BudgetResult, DecisionResult, ResearchResult, RouteResult, TripInput } from "./types";

/** Curated offline knowledge so the demo works without any AI call. */
const MYSURU: ResearchResult = {
  overview:
    "Mysuru, the City of Palaces, blends royal Wodeyar heritage, sandalwood-scented markets and green hills. It is an easy 3-hour drive or train ride from Bengaluru and ideal for a compact culture-and-food weekend.",
  bestTimeToVisit: "October to February (Dasara festival in Sep–Oct lights up the palace)",
  weatherNote: "Pleasant 18–30°C most of the year; carry light layers and an umbrella in monsoon.",
  highlights: [
    {
      name: "Mysore Palace",
      category: "Culture",
      description: "Indo-Saracenic royal palace; Sunday evening illumination with ~97,000 bulbs.",
      entryFee: 120,
      timeNeeded: "2 hrs",
      rating: 4.8,
      interestMatch: "Culture",
    },
    {
      name: "Chamundi Hills",
      category: "Nature",
      description: "Hilltop temple with city views; climb the 1,000 steps past the giant Nandi.",
      entryFee: 0,
      timeNeeded: "2–3 hrs",
      rating: 4.6,
      interestMatch: "Nature",
    },
    {
      name: "Devaraja Market",
      category: "Food",
      description: "Century-old market of flowers, kumkum, spices and Mysore pak.",
      entryFee: 0,
      timeNeeded: "1 hr",
      rating: 4.4,
      interestMatch: "Food",
    },
    {
      name: "Karanji Lake",
      category: "Nature",
      description: "Lakeside walk with a butterfly park and walk-through aviary.",
      entryFee: 50,
      timeNeeded: "1.5 hrs",
      rating: 4.3,
      interestMatch: "Nature",
    },
    {
      name: "Jaganmohan Palace Art Gallery",
      category: "Culture",
      description: "Raja Ravi Varma paintings and royal artefacts in a quiet palace.",
      entryFee: 120,
      timeNeeded: "1 hr",
      rating: 4.2,
      interestMatch: "Culture",
    },
    {
      name: "St. Philomena's Church",
      category: "Culture",
      description: "Neo-Gothic twin spires, one of the tallest churches in India.",
      entryFee: 0,
      timeNeeded: "45 min",
      rating: 4.5,
      interestMatch: "Culture",
    },
    {
      name: "Brindavan Gardens (KRS Dam)",
      category: "Nature",
      description: "Terraced gardens with an evening musical fountain show.",
      entryFee: 100,
      timeNeeded: "2–3 hrs",
      rating: 4.2,
      interestMatch: "Nature",
    },
  ],
  foodSpots: [
    { name: "Mylari Hotel", specialty: "Butter-soft Mylari dosa", priceRange: "₹80–150" },
    { name: "Vinayaka Mylari", specialty: "Dosa with coconut chutney", priceRange: "₹80–150" },
    { name: "Hotel RRR", specialty: "Andhra-style banana-leaf meals", priceRange: "₹200–350" },
    { name: "Guru Sweet Mart", specialty: "Original Mysore pak", priceRange: "₹100–300" },
  ],
  localTips: [
    "Buy a combined palace + audio guide ticket at the south gate to skip queues.",
    "Take KSRTC or the Mysuru Express train from Bengaluru — cheaper than a cab for two.",
    "Hire a shared auto for Chamundi Hills; agree on a fare first (~₹300 round trip).",
    "Palace illumination runs Sundays and public holidays, 7–7:45 pm.",
  ],
};

function genericResearch(t: TripInput): ResearchResult {
  const d = t.destination;
  const cats = t.interests.length ? t.interests : ["Culture"];
  const templates = [
    { suffix: "Old Town Heritage Walk", fee: 0, time: "2 hrs" },
    { suffix: "Viewpoint", fee: 50, time: "1.5 hrs" },
    { suffix: "Central Market", fee: 0, time: "1 hr" },
    { suffix: "City Museum", fee: 100, time: "1.5 hrs" },
    { suffix: "Lakeside / Riverside Promenade", fee: 0, time: "1 hr" },
    { suffix: "Local Food Street", fee: 0, time: "1.5 hrs" },
  ];
  return {
    overview: `${d} offers a mix of ${cats.join(", ").toLowerCase()} experiences. This offline plan uses typical highlights — verify timings locally.`,
    bestTimeToVisit: "October to March for most of India",
    weatherNote: "Check the forecast a day before travelling.",
    highlights: templates.map((tp, i) => ({
      name: `${d} ${tp.suffix}`,
      category: cats[i % cats.length] ?? "Culture",
      description: `A popular ${String(cats[i % cats.length]).toLowerCase()} stop in ${d}.`,
      entryFee: tp.fee,
      timeNeeded: tp.time,
      rating: 4.2,
      interestMatch: cats[i % cats.length] ?? "Culture",
    })),
    foodSpots: [
      { name: `${d} local thali house`, specialty: "Regional thali", priceRange: "₹150–300" },
      { name: `${d} street food lane`, specialty: "Local snacks", priceRange: "₹50–150" },
    ],
    localTips: [
      "Use public transport where possible.",
      "Carry cash for small vendors.",
      "Start early to beat crowds.",
    ],
  };
}

export function fallbackResearch(t: TripInput): ResearchResult {
  return /mys(o|u)r/i.test(t.destination) ? MYSURU : genericResearch(t);
}

const STYLE_SPLIT: Record<TripInput["style"], Record<string, number>> = {
  Backpacker: { Transport: 0.25, Accommodation: 0.25, Food: 0.25, Activities: 0.15, Misc: 0.1 },
  Budget: { Transport: 0.22, Accommodation: 0.32, Food: 0.24, Activities: 0.12, Misc: 0.1 },
  Comfort: { Transport: 0.2, Accommodation: 0.4, Food: 0.22, Activities: 0.12, Misc: 0.06 },
  Luxury: { Transport: 0.18, Accommodation: 0.5, Food: 0.2, Activities: 0.08, Misc: 0.04 },
};

const NOTES: Record<string, string> = {
  Transport: "Round-trip bus/train for the group plus local autos",
  Accommodation: "Nights in a well-rated stay matching your style",
  Food: "Local breakfasts, meals and snacks",
  Activities: "Entry tickets and guided experiences",
  Misc: "Buffer for shopping, tips and surprises",
};

/** Plans spending at 92% of the stated budget so there is always a safety buffer. */
export function fallbackBudget(t: TripInput): BudgetResult {
  const split = STYLE_SPLIT[t.style];
  const target = Math.round(t.budget * 0.92);
  const breakdown = Object.entries(split).map(([category, share]) => ({
    category,
    amount: Math.round(target * share),
    note: NOTES[category] ?? "",
  }));
  const estimatedTotal = breakdown.reduce((s, b) => s + b.amount, 0);
  const perDay = Math.round(estimatedTotal / t.days);
  return {
    totalBudget: t.budget,
    estimatedTotal,
    perPerson: Math.round(estimatedTotal / t.travelers),
    breakdown,
    dailySpend: Array.from({ length: t.days }, (_, i) => ({ day: i + 1, amount: perDay })),
    savingsTips: [
      "Travel by state bus or train instead of a private cab.",
      "Eat at busy local eateries — great food at a fraction of restaurant prices.",
      "Book stays a week ahead on weekdays for better rates.",
    ],
    withinBudget: estimatedTotal <= t.budget,
  };
}

const SLOTS = ["08:00", "10:30", "13:00", "15:00", "17:30", "19:30"];

export function fallbackRoute(t: TripInput, research: ResearchResult): RouteResult {
  const spots = research.highlights.length ? research.highlights : genericResearch(t).highlights;
  const food = research.foodSpots;
  const perDay = Math.max(2, Math.ceil(spots.length / t.days));
  const days = Array.from({ length: t.days }, (_, i) => {
    const daySpots = spots.slice(i * perDay, i * perDay + perDay);
    const pool = daySpots.length ? daySpots : spots.slice(0, 2);
    const meal = food[i % Math.max(food.length, 1)];
    const items = [
      ...(i === 0
        ? [
            {
              time: "06:30",
              title: `Depart ${t.origin}`,
              description: `Head to ${t.destination} early to maximise the day.`,
              location: t.origin,
              cost: 0,
              durationMins: 180,
            },
          ]
        : []),
      ...pool.map((s, j) => ({
        time: SLOTS[(j + (i === 0 ? 1 : 0)) % SLOTS.length] ?? "10:00",
        title: s.name,
        description: s.description,
        location: s.name,
        cost: s.entryFee * t.travelers,
        durationMins: 90,
      })),
      ...(meal
        ? [
            {
              time: "13:00",
              title: `Lunch at ${meal.name}`,
              description: meal.specialty,
              location: meal.name,
              cost: 250 * t.travelers,
              durationMins: 60,
            },
          ]
        : []),
      ...(i === t.days - 1
        ? [
            {
              time: "18:30",
              title: `Return to ${t.origin}`,
              description: "Evening departure home.",
              location: t.destination,
              cost: 0,
              durationMins: 180,
            },
          ]
        : []),
    ].sort((a, b) => a.time.localeCompare(b.time));
    return {
      day: i + 1,
      theme:
        pool
          .map((p) => p.category)
          .filter((v, k, a) => a.indexOf(v) === k)
          .join(" & ") || "Explore",
      items,
    };
  });
  const isMysuru = /mys(o|u)r/i.test(t.destination) && /bengal|bangal/i.test(t.origin);
  return {
    transportMode: isMysuru ? "Train (Mysuru Express) or KSRTC bus" : "Bus or train",
    travelTimeFromOrigin: isMysuru ? "~3 hrs" : "Varies",
    distanceKm: isMysuru ? 145 : 0,
    routeStops: spots.slice(0, 6).map((s) => ({ name: s.name, note: s.timeNeeded })),
    days,
  };
}

export function fallbackDecision(
  t: TripInput,
  budget: BudgetResult,
  research: ResearchResult,
): DecisionResult {
  const within = budget.estimatedTotal <= t.budget;
  const matchReasons = t.interests.map((interest) => {
    const hits = research.highlights.filter(
      (h) => h.interestMatch.toLowerCase() === interest.toLowerCase(),
    ).length;
    return {
      interest,
      score: Math.min(100, 55 + hits * 15),
      reason: hits
        ? `${hits} highlight${hits > 1 ? "s" : ""} match your love of ${interest.toLowerCase()}.`
        : `Limited dedicated ${interest.toLowerCase()} spots — mixed in where possible.`,
    };
  });
  const avg = matchReasons.reduce((s, m) => s + m.score, 0) / Math.max(matchReasons.length, 1);
  const score = Math.round(avg * 0.7 + (within ? 30 : 10));
  return {
    verdict: within ? "Go — great fit" : "Adjust before booking",
    score,
    summary: `${t.destination} suits a ${t.days}-day ${t.style.toLowerCase()} trip for ${t.travelers} from ${t.origin}. The plan stays ${within ? "inside" : "above"} your budget and covers ${t.interests.join(", ").toLowerCase()}.`,
    matchReasons,
    optimizations: [
      {
        title: "Cluster nearby sights",
        impact: "Saves ~1 hr/day",
        detail: "Itinerary groups palace-area sights together to cut local transport.",
      },
      {
        title: "Public transport first",
        impact: `Saves ~₹${Math.round(t.budget * 0.08)}`,
        detail: "Bus/train beats a private cab for small groups.",
      },
      {
        title: "Keep a 8% buffer",
        impact: "Lower risk",
        detail: "Unplanned costs are covered without overspending.",
      },
    ],
    alternatives: /mys(o|u)r/i.test(t.destination)
      ? [
          { name: "Srirangapatna", reason: "20 km away — Tipu Sultan history, add as a half-day." },
          { name: "Coorg", reason: "More nature and coffee estates if you extend by a day." },
        ]
      : [{ name: "A nearby hill town", reason: "Swap in if you want more nature." }],
    packingList: [
      "Comfortable walking shoes",
      "Light cotton layers",
      "Reusable water bottle",
      "Cash for local vendors",
      "Phone power bank",
    ],
  };
}
