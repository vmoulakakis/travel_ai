# TravelAI Greece — UX Contract (Agentic Discovery v1)
## Entry
- Hero free text requires non-empty content; maximum 1,000 characters.
- Form submission invokes existing `runAgent(prompt)` and preserves current origin, dates, traveler profile, budget and intent.
- Quick prompts invoke the same runtime, not a staged demonstration.
- Busy state disables repeated requests and keeps the primary control stable.
- Agent results use the existing results/map flow; no fabricated result cards.
- Agent runtime errors retain input and present the existing fallback message.

## Journey
1. Prompt or choose exploratory map.
2. Agent interprets user intent; asks follow-up where needed.
3. Explore destinations/stays grounded in real inventory.
4. Open existing stay detail route (tracking must remain unchanged).
5. Continue to pre-existing escape/book funnel.

## Trust, consistency and navigation
- Default map scores are internal context; never describe a live demand prediction unless verified.
- No fake availability, review counts or pricing.
- Link to map is genuine document anchor, not faux click.
- Mobile and keyboard actions equivalent.
- Existing map, stays, planner and affiliate routes retain their behavior.

## Release gates
Vercel preview READY; inspect rendered screens; smoke-test prompt API and property navigation; green CI/typecheck; explicit manual approval before production promotion.
