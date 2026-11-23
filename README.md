# TripSync AI — Autonomous Travel Planning Agents

Enter an origin, destination, days, budget, travellers, interests and style. An **orchestrator** dispatches four specialised **Gemini** agents in order, each building on the previous one's output:

| # | Agent | Output |
|---|-------|--------|
| 1 | Destination Research | Highlights, food spots, local tips, best time |
| 2 | Budget Planning | INR breakdown, per-person cost, daily spend, savings tips |
| 3 | Route & Itinerary Optimizer | Ordered route stops, day-wise schedule, transport |
| 4 | Decision & Personalization | Fit score, verdict, interest match, optimizations, alternatives, packing list |

Features: trip form with validation · live workflow visualisation · agent activity log · destination cards · day-wise itinerary · budget dashboard with charts · route section with Google Maps links · decision panel · save trips + history (stored in the browser) · Demo mode and automatic offline fallback when AI is unavailable.

Demo input (pre-filled): Bengaluru → Mysuru, 2 days, ₹5,000, 2 travellers, Nature/Culture/Food, Budget.

## Stack

- React 19 + Vite + TanStack Start, Tailwind CSS v4, shadcn/ui, Recharts
- Agents run as server functions (`src/lib/trip/agents.server.ts`) calling Gemini (`google/gemini-3.8-flash`) through the Lovable AI gateway — no API key needed in the browser.
- Orchestrator: `src/lib/trip/orchestrator.ts` · Offline fallback: `src/lib/trip/fallback.ts`
- Optional **Python FastAPI** backend with the same agents: `backend/main.py`

## Run the web app

```bash
bun install        # or npm install
bun run dev        # http://localhost:8080
bun run test       # rule tests
```

Copy `.env.example` to `.env`. Inside Lovable `LOVABLE_API_KEY` is provided automatically; without it the agents fall back to the offline demo plan, so the app still works.

## Run the optional FastAPI backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # add GEMINI_API_KEY from https://aistudio.google.com/apikey
uvicorn main:app --reload --port 8000
```

Endpoints: `GET /api/health`, `POST /api/agents/{research|budget|route|decision}`, `POST /api/plan` (full orchestrated plan). Example:

```bash
curl -X POST localhost:8000/api/plan -H 'content-type: application/json' -d '{"trip":{"origin":"Bengaluru","destination":"Mysuru","days":2,"budget":5000,"travelers":2,"interests":["Nature","Culture","Food"],"style":"Budget"}}'
```

Interactive docs at http://localhost:8000/docs.
