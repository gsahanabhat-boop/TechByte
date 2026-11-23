"""
TripSync AI — optional standalone FastAPI backend.

The hosted app runs the same four agents as built-in server functions, so this
file is only needed if you want to run the agent pipeline as a Python service
(for example for a college/demo submission). It exposes:

  POST /api/plan            -> runs the orchestrator (all four agents) and returns the full plan
  POST /api/agents/{agent}  -> runs a single agent (research | budget | route | decision)
  GET  /api/health

Set GEMINI_API_KEY in backend/.env. Without a key (or if Gemini fails) every
agent falls back to an offline demo plan so the API always answers.
"""
from __future__ import annotations

import json
import os
import time
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
AgentId = Literal["research", "budget", "route", "decision"]


class TripInput(BaseModel):
    origin: str = Field(min_length=2, max_length=80)
    destination: str = Field(min_length=2, max_length=80)
    days: int = Field(ge=1, le=14)
    budget: float = Field(ge=500)
    travelers: int = Field(ge=1, le=20)
    interests: list[str] = Field(min_length=1, max_length=10)
    style: Literal["Budget", "Comfort", "Luxury", "Backpacker"] = "Budget"


class AgentRequest(BaseModel):
    trip: TripInput
    context: dict[str, Any] = {}
    demo: bool = False


PROMPTS: dict[str, tuple[str, str]] = {
    "research": (
        "You are the Destination Research Agent. Research real attractions, food spots and local tips.",
        '{"overview":str,"bestTimeToVisit":str,"weatherNote":str,"highlights":[{"name":str,"category":str,"description":str,"entryFee":number,"timeNeeded":str,"rating":number,"interestMatch":str}],"foodSpots":[{"name":str,"specialty":str,"priceRange":str}],"localTips":[str]}',
    ),
    "budget": (
        "You are the Budget Planning Agent. Build a realistic INR estimate for the whole group that stays within budget.",
        '{"totalBudget":number,"estimatedTotal":number,"perPerson":number,"breakdown":[{"category":"Transport|Accommodation|Food|Activities|Misc","amount":number,"note":str}],"dailySpend":[{"day":number,"amount":number}],"savingsTips":[str],"withinBudget":bool}',
    ),
    "route": (
        "You are the Route and Itinerary Optimizer Agent. Order stops to minimise backtracking and build a day-wise schedule.",
        '{"transportMode":str,"travelTimeFromOrigin":str,"distanceKm":number,"routeStops":[{"name":str,"note":str}],"days":[{"day":number,"theme":str,"items":[{"time":"HH:MM","title":str,"description":str,"location":str,"cost":number,"durationMins":number}]}]}',
    ),
    "decision": (
        "You are the Trip Decision and Personalization Agent. Score the trip fit and propose optimizations.",
        '{"verdict":str,"score":number,"summary":str,"matchReasons":[{"interest":str,"score":number,"reason":str}],"optimizations":[{"title":str,"impact":str,"detail":str}],"alternatives":[{"name":str,"reason":str}],"packingList":[str]}',
    ),
}


# ---------- offline fallback ----------
def fb_research(t: TripInput) -> dict:
    d = t.destination
    names = ["Old Town Heritage Walk", "Viewpoint", "Central Market", "City Museum", "Lakeside Promenade", "Food Street"]
    return {
        "overview": f"{d} offers {', '.join(t.interests).lower()} experiences (offline demo data).",
        "bestTimeToVisit": "October to March",
        "weatherNote": "Check the forecast a day before travelling.",
        "highlights": [
            {"name": f"{d} {n}", "category": t.interests[i % len(t.interests)], "description": f"Popular stop in {d}.",
             "entryFee": 0 if i % 2 == 0 else 100, "timeNeeded": "1.5 hrs", "rating": 4.2,
             "interestMatch": t.interests[i % len(t.interests)]}
            for i, n in enumerate(names)
        ],
        "foodSpots": [{"name": f"{d} thali house", "specialty": "Regional thali", "priceRange": "₹150–300"}],
        "localTips": ["Use public transport.", "Carry cash for small vendors.", "Start early."],
    }


SPLIT = {"Transport": 0.22, "Accommodation": 0.32, "Food": 0.24, "Activities": 0.12, "Misc": 0.10}


def fb_budget(t: TripInput) -> dict:
    target = round(t.budget * 0.92)
    breakdown = [{"category": k, "amount": round(target * v), "note": ""} for k, v in SPLIT.items()]
    total = sum(b["amount"] for b in breakdown)
    return {"totalBudget": t.budget, "estimatedTotal": total, "perPerson": round(total / t.travelers),
            "breakdown": breakdown, "dailySpend": [{"day": i + 1, "amount": round(total / t.days)} for i in range(t.days)],
            "savingsTips": ["Take the bus or train.", "Eat at local eateries."], "withinBudget": total <= t.budget}


def fb_route(t: TripInput, research: dict) -> dict:
    spots = research["highlights"]
    per = max(2, -(-len(spots) // t.days))
    days = []
    for i in range(t.days):
        chunk = spots[i * per:(i + 1) * per] or spots[:2]
        days.append({"day": i + 1, "theme": chunk[0]["category"], "items": [
            {"time": f"{9 + j * 2:02d}:00", "title": s["name"], "description": s["description"], "location": s["name"],
             "cost": s["entryFee"] * t.travelers, "durationMins": 90} for j, s in enumerate(chunk)]})
    return {"transportMode": "Bus or train", "travelTimeFromOrigin": "Varies", "distanceKm": 0,
            "routeStops": [{"name": s["name"], "note": s["timeNeeded"]} for s in spots[:6]], "days": days}


def fb_decision(t: TripInput, budget: dict) -> dict:
    ok = budget["estimatedTotal"] <= t.budget
    return {"verdict": "Go — great fit" if ok else "Adjust before booking", "score": 85 if ok else 60,
            "summary": f"{t.destination} suits a {t.days}-day {t.style.lower()} trip.",
            "matchReasons": [{"interest": i, "score": 80, "reason": f"Good {i.lower()} options."} for i in t.interests],
            "optimizations": [{"title": "Cluster nearby sights", "impact": "Saves ~1 hr/day", "detail": "Grouped by area."}],
            "alternatives": [], "packingList": ["Walking shoes", "Water bottle", "Power bank"]}


def fallback(agent: str, t: TripInput, ctx: dict) -> dict:
    research = ctx.get("research") or fb_research(t)
    budget = ctx.get("budget") or fb_budget(t)
    return {"research": lambda: fb_research(t), "budget": lambda: fb_budget(t),
            "route": lambda: fb_route(t, research), "decision": lambda: fb_decision(t, budget)}[agent]()


# ---------- Gemini ----------
def call_gemini(agent: str, t: TripInput, ctx: dict) -> dict:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY not set")
    from google import genai  # imported lazily so the API boots without the key

    role, shape = PROMPTS[agent]
    client = genai.Client(api_key=key)
    prompt = (
        f"{role}\nReturn JSON only matching: {shape}\nMoney values are INR numbers.\n\n"
        f"Trip: {t.model_dump_json()}\n\nContext from previous agents: {json.dumps(ctx)[:12000]}"
    )
    res = client.models.generate_content(model=MODEL, contents=prompt, config={"response_mime_type": "application/json"})
    return json.loads(res.text or "{}")


def run_agent(agent: str, t: TripInput, ctx: dict, demo: bool = False) -> dict:
    started = time.time()
    notes: list[str] = []
    if not demo:
        try:
            data = call_gemini(agent, t, ctx)
            return {"agent": agent, "data": data, "source": "gemini", "model": MODEL,
                    "durationMs": int((time.time() - started) * 1000), "notes": notes}
        except Exception as e:  # noqa: BLE001 — any failure degrades gracefully
            notes.append(f"Gemini unavailable ({e}) — using offline demo knowledge.")
    return {"agent": agent, "data": fallback(agent, t, ctx), "source": "fallback", "model": "offline-demo",
            "durationMs": int((time.time() - started) * 1000), "notes": notes}


# ---------- API ----------
app = FastAPI(title="TripSync AI Agents", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"ok": True, "model": MODEL, "gemini": bool(os.getenv("GEMINI_API_KEY"))}


@app.post("/api/agents/{agent}")
def agent_endpoint(agent: AgentId, req: AgentRequest):
    if agent not in PROMPTS:
        raise HTTPException(404, "Unknown agent")
    return run_agent(agent, req.trip, req.context, req.demo)


@app.post("/api/plan")
def plan(req: AgentRequest):
    """Orchestrator: research -> budget -> route -> decision, passing context forward."""
    ctx: dict[str, Any] = {}
    logs = []
    for agent in ("research", "budget", "route", "decision"):
        r = run_agent(agent, req.trip, ctx, req.demo)
        ctx[agent] = r["data"]
        logs.append({"agent": agent, "source": r["source"], "durationMs": r["durationMs"], "notes": r["notes"]})
    return {"input": req.trip.model_dump(), **ctx, "logs": logs}
