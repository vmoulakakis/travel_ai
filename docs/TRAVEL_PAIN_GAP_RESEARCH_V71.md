# TravelAI Greece — Pain-Gap & Research Intelligence V71
**Status:** architecture + evidence research proposal (not deployed)
**Date:** 2026-10-09
**Canonical project:** vmoulakakis/travel_ai; Supabase project travelai
**Constraints:** keep V45 deterministic hard gates, reuse V44 facts/evidence, preserve affiliate independence, open/free models first; no paid API calls without approval.

## 1. Verified live database audit (2026-10-09)
- travel_knowledge_entities_v44: 2,357; travel_knowledge_facts_v44: 1,819; travel_knowledge_evidence_v44: 1,819; travel_knowledge_edges_v44: 2,975.
- destination_knowledge_v8: 50; travel_destination_nodes_v46: 574; stay_places: 1,625; seo_intelligence_opportunities_v46: 169.
- All 1,819 facts carry status verified, but all 1,819 evidence rows have source_type=database and **zero have a nonempty source_url**. This is a provenance gap, not evidence that the facts are false.
- Destination nodes: 50 canonical/indexable, 158 research-ready but research-required, 366 discovered but research-required.
- 50 destination-evidence-refresh jobs queued; travel_agent_runs_v44 and travel_research_runs have zero records.
- SEO opportunities: 50 draft/index-eligible; 119 research/not index-eligible.

## 2. Research-source hierarchy
| Source | Purpose | Trust for operational facts | Ingest conditions |
| --- | --- | --- | --- |
| Own Search Console + opt-in traveler feedback | Proven search and product demand | First party | Consent / aggregate; avoid user identifiers |
| Official ferry operator, KTEL, local sites, archaeological sites | Current timings, closures, transport | High when fresh | Check terms; record observed time; recheck before recommendation |
| Local tourism organizations, ELSTAT, INSETE | Destination context + demand | High for their measured scope | Preserve definitions, citations, time period, reuse rights |
| OpenStreetMap | POI / spatial reference | High for geography, not opening-hours guarantee | ODbL and attribution; do not bulk use public infrastructure beyond policy |
| Travelstories.gr, Tripadvisor, Rick Steves | Pain hypotheses + neglected travel questions | Qualitative, unverified for operational facts | Follow terms, link-only by default, no bulk copying |
| Reddit r/GreeceTravel / r/travel | Pain hypotheses and traveler language | Qualitative, unverified | Commercial/API/AI restrictions: no harvesting, training or reuse without authorization |
| Google Trends | Comparative seasonal interest | Trends index, not absolute search volume | Do not treat normalized interest as actual searches |

**Non-negotiable:** treat forum content as *hypothesis discovery only* unless rights are confirmed. Do not train/fine-tune on third-party forum posts. Any app-reusable signal must be independent, licensed/first-party, source-backed, verified, date-stamped, and privacy-safe.

## 3. Evidence-backed candidate pain clusters
The URLs below are **research leads**, not approved training data or automatically verified facts.

| Pain key | Observed question/problem | Original evidence lead | Verification source | Practical feature |
| --- | --- | --- | --- | --- |
| KTEL_CONFUSION | Operator schedule exists but booking site shows no route | https://www.reddit.com/r/greece/comments/1wj4kjv/route_bus_advice_for_1week_trip_in_northern_greece/ | Local KTEL operator | Route status + last checked + booking window |
| FERRY_CONFLICT | Distributor lists route while operator does not | https://www.reddit.com/r/GreeceTravel/comments/1vm71q1/september_29th_ferries_cancelled/ | Ferry operator and port authority | Schedule discrepancy flag |
| ISLAND_NO_CAR | Traveler struggles to choose an island reachable without a car | https://www.reddit.com/r/GreeceTravel/comments/1w9296r/greece_in_october_no_car_from_athens/ | KTEL / operator / OSM | Transit-first island scoring |
| OFF_SEASON_SHUTDOWN | October island infrastructure may not match summer guides | https://www.reddit.com/r/GreeceTravel/comments/1w9296r/greece_in_october_no_car_from_athens/ | Official POI and local business sites | Month-specific operating confidence |
| FERRY_HOPPING_COST | Round-trip ferry fares can erase cheaper base-city accommodation | https://www.reddit.com/r/GreeceTravel/comments/1wqmo9y/is_basing_in_athens_doing_ferry_day_trips_to/ | Quoted itinerary costs | End-to-end trip budget |
| TIME_WASTED | Too many islands and transfers in a short itinerary | https://www.reddit.com/r/GreeceTravel/comments/1v73e4r/traveling_to_greece_in_late_october_what_would_i/ | Actual itinerary + transport schedules | Usable-hours model / transfer penalty |
| ACCESS_WITHOUT_CAR | Buses, taxis and geography change feasibility substantially | https://www.travelstories.gr/community/threads/%CE%9C%CE%B9%CE%BA%CF%81%CF%8C-%CE%BD%CE%B7%CF%83%CE%AF-%CF%87%CF%89%CF%81%CE%AF%CF%82-%CE%B1%CF%85%CF%84%CE%BF%CE%BA%CE%AF%CE%BD%CE%B7%CF%84%CE%BF.61508/page-2 | Operators + first-party feedback | Car-free feasibility per base |
| FAMILY_AND_ACCESS | Family, walking effort, accessibility change itinerary choices | https://community.ricksteves.com/travel-forum/greece/ | Official access information | Age, mobility and pace gates |

## 4. Root-cause / long-tail search program
Search research is query-intent driven. Generate both Greek and English queries for each destination x month x constraint x journey origin, but *deduplicate* equivalent queries before research. Example recipes:
- Greek: "εκδρομή 2ήμερο [destination] χωρίς αυτοκίνητο"; "ΚΤΕΛ [origin] [destination] Κυριακή επιστροφή"; "[destination] Οκτώβριος τι είναι ανοιχτό"; "[destination] με μικρά παιδιά βροχή"; "2ήμερο [destination] συνολικό κόστος".
- English: "is [destination] worth visiting in November without a car"; "how to get from [origin] to [destination] on Sunday"; "ferries [origin] [destination] October cancellation"; "what is open in [destination] in October"; "two days in [destination] realistic itinerary".
- Research operator example, human-reviewed: site:reddit.com/r/GreeceTravel "October" "no car"; site:travelstories.gr/community/threads "ΚΤΕΛ" "Κυριακή"; site:community.ricksteves.com/travel-forum/greece "Meteora" "car".
- Google Search Console: group real query impressions/clicks/CTR/position by intent, region, month and canonical page; mark no data as unknown.
- Google Trends: use only normalized relative trend comparisons, with region and window recorded.
- Search engines: store query, timestamp, result URL, language, and internal editorial note; never present a search query itself as proof of popularity.

See companion CSV: data/research/greek_weekend_search_queries_v71.csv.

## 5. Proposed workflow (reuse existing agents)
1. **Demand Miner** (batch offline, not a new runtime agent): extract high-intent first-party queries, identify candidate search pain intents, manually review permitted forum research.
2. **Entity Resolver:** map aliases and region to travel_destination_nodes_v46.node_key. Never guess a missing canonical slug; do not fabricate coordinates.
3. **Source Rights Gate:** confirm commercial/AI reuse conditions. Otherwise keep link-only research in human review and out of product data.
4. **Evidence Verifier:** operator/official sources for hours, routes, fares, availability; link to V44 evidence/fact IDs, keep observed_at + expires_at + confidence.
5. **Contradiction Auditor:** detect operator vs aggregator conflicts, stale schedules and unsupported claims; fail closed for hard constraints.
6. **Opportunity Ranker:** opportunity score based on actual first-party search evidence, repeated independent signals, severity, geographic coverage and how solvable the problem is; score is product prioritization only and NEVER destination suitability.
7. **SEO Publisher:** attach distinct question-answer content to one verified canonical page where possible. Do not auto-publish thousands of near-duplicate pages; use publication gate.
8. **Runtime Integration:** use existing Route & Friction, Season & Weather, Location Truth, Skeptical Auditor and Traveler Advocate roles. Read only approved, source-backed and unexpired research. Hard gates always win.

### Example opportunity score (proposed, requires calibration)
Priority 0–100 = 30% validated first-party demand + 25% severity + 20% coverage gap + 15% multi-source corroboration + 10% solution feasibility. Keep all component scores, original metrics and source IDs. **Never invent search volume or pretend forum frequency is market prevalence.**

## 6. Initial product differentiators
- **Weekend Feasibility Score:** start location, departure/return time, realistic connection time, usable activity hours and itinerary pacing.
- **Car-Free Truth:** recommended base area, verified operator link, last-mile needs, no invented schedules.
- **Off-Season Reality:** what's likely operational, dates last checked, confidence, winter alternative.
- **Whole-Trip Cost:** accommodation + transport + fuel/tolls + parking + tickets; unknowns stay unknown.
- **Anti-Disappointment Engine:** explicit "why not" reasons and two verified alternatives.
- **Question-first SEO:** answer specific real questions and show source/date evidence on a canonical destination.

## 7. Release / rights controls
- Keep a source-rights registry and block unlicensed sources from AI ingestion.
- No raw personal information, account IDs, handles, forum post bodies or privately scraped reviews.
- A source URL without independent checking is not verification.
- Allow 'unverified', 'verified', 'contradicted', 'expired'; require two independent observations for high-impact conflicts when feasible.
- Route/ferry/weather/operating status requires an expiry and new pre-trip check.
- Existing V44 16D semantic vectors are **structured intent vectors**, not BGE multilingual embeddings. Introduce dense embeddings only as a separately versioned model + populated column, with evaluation.
- Keep operational research / product opportunity scores separate from recommendation ranking and affiliate payouts.
- Before any deployment: run typecheck, test:strict, build, source-rights security checks, migration dry run and recommendation regressions.
- All new DB objects must enforce RLS and default deny for public clients; source ingestion and approval require authorized server-side workflow.

## 8. Suggested measurement
- % critical traveler-facing claims with valid external provenance;
- % destinations with verified current transport + at least two POIs;
- source freshness SLA breaches by field type;
- source conflicts resolved vs unresolved;
- query clusters with genuine first-party demand but no useful answer;
- weekend trip invalidation/undo rate;
- research cost / approved evidence record;
- factual correction rate and unsupported claim rate.

## References & licensing
- Reddit API restrictions: https://redditinc.com/policies/data-api-terms
- Reddit commercial developer restrictions: https://redditinc.com/policies/developer-terms
- Google people-first SEO: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search
- OpenStreetMap licensing: https://www.openstreetmap.org/copyright
- Open-Meteo commercial-use terms: https://open-meteo.com/en/terms

## Implementation boundary
This document and query matrix are committed on a dedicated GitHub branch for review. **No production Supabase tables, jobs, rows, model budgets, crawler connections or public SEO pages have been modified**. Next implementation step: create a reviewed V71 additive migration for permitted signal provenance + query clusters; pilot 10 weekend destinations; measure actual citations and correction rate before any auto-enrichment.
