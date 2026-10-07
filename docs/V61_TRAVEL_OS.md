# TravelAI V61 — Agentic Travel OS

## Product thesis
TravelAI is not a generic itinerary generator. It is a Greece-first decision engine that turns a traveller's intent, dates, origin, budget and constraints into a ranked set of destinations and microplaces, then explains the trade-offs and converts the selected trip into bookable actions.

The 1,700+ destination/microplace dataset remains a backend intelligence asset. The user should see a small, high-confidence shortlist.

## Core experience
1. Natural-language brief.
2. Adaptive clarifying questions only when they can change the decision.
3. Internal calendar resolves Greek public holidays, global themed days, school/season windows and long-weekend opportunities.
4. Spatial reasoning checks origin, travel time, ferry/road/flight friction, nearby clusters and route feasibility.
5. Destination + microplace retrieval.
6. Seasonal/intent/value/crowd/logistics scoring.
7. Multilingual semantic reranking.
8. Interactive map renders ranked destination pins and stays.
9. Hover reveals: why now, fit, crowd, season, travel time, stay anchor and confidence.
10. Affiliate inventory enters only after destination fit is established.

## Agent graph
- Orchestrator Agent
- Intent Agent
- Calendar Agent
- Seasonality Agent
- Spatial Agent
- Destination Retrieval Agent
- Microplace Agent
- Stay Curator Agent
- Review Intelligence Agent
- Value Agent
- Editorial/SEO Agent
- Conversion Agent
- Skeptical Auditor

Hard constraints and verified data always outrank model prose.

## Ranking contract
Final destination score is a bounded composition of semantic fit, seasonality, calendar opportunity, spatial/logistics feasibility, budget/value fit, crowd tolerance, novelty preference, stay quality/availability confidence and evidence confidence.

Affiliate commission must never affect destination rank.

## Hugging Face integration
Use model adapters rather than hard-coding a provider: multilingual embeddings for intent/destination retrieval, a multilingual reranker for the viable candidate set, optional vision tagging for media QA, and optional image generation only for clearly labelled editorial creative.

Recommended initial reranker class: BGE multilingual reranker family. Keep deterministic eligibility and evidence outside ML.

## Signature UX
The signature interaction is a living map reveal. As the traveller describes the trip, Greece narrows into a spatial cluster and pins change priority from time, season, effort, crowd and value.

## Map pin layers
- AI best match
- hidden discovery
- seasonal opportunity
- high demand
- best value
- stay anchors
- experiences when verified

## Internal calendar
Combine Greek official public holidays, selected global observance days with genuine travel relevance, long-weekend detection, school/peak-season context, destination-specific season windows and verified events. Never imply an observance is an official holiday.

## Blog / SEO
The Editorial Agent publishes evidence-backed ~500-word articles around real near-term travel opportunities in Greece. Each article includes date context, why now, 3–5 destinations or microplaces, season/weather caveat, access note, internal links and useful structured data. No fabricated search volume, fake reviews or thin template pages.

## PWA
The existing Next.js manifest is the base. V61 adds a mobile install affordance, standalone layout QA, icon/splash polish and an offline shell for previously visited destination dossiers where practical. Do not prompt installation before the user has received value.

## Conversion funnel
brief → shortlist → inspect → build trip → stay/experience selection → affiliate outbound.

Do not lead with Book now. Build confidence first.

## V61 acceptance gates
- no more than 3 primary destination answers
- every result explains why it fits and one trade-off
- map and cards share one ranking state
- hover content is evidence-driven
- calendar can change ranking
- spatial feasibility can reject a destination
- affiliate economics cannot change destination rank
- mobile install affordance works on supporting browsers
- blog content has freshness metadata and evidence state