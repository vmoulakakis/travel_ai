# Travel Intelligence Skill

Use this skill whenever TravelAI must rank or explain destinations, microplaces, stays, routes or seasonal trip opportunities.

## Goal
Return a small, defensible shortlist that fits the traveller better than a popularity list.

## Method
1. Normalize intent.
2. Apply hard constraints.
3. Resolve calendar opportunity.
4. Resolve seasonality.
5. Resolve route/spatial feasibility.
6. Retrieve broad destination candidates.
7. Retrieve microplaces inside viable clusters.
8. Score deterministic features.
9. Semantic rerank the viable set.
10. Run skeptical audit.
11. Return max 3 primary matches with one explicit trade-off each.

## Rules
- Never invent a ferry, flight, event, review score, opening time or availability.
- Unknown evidence stays unknown.
- Affiliate payout does not affect destination ranking.
- A model may interpret and rerank but may not override hard constraints.
- Prefer a surprising but defensible match over a famous weak match.
- For every recommendation, expose dominant reason, confidence and one downside.