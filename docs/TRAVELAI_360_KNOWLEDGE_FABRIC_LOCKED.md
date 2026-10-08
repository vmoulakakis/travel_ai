# TravelAI 360° Knowledge Fabric — Architecture Contract v1.0
**LOCKED: 2026-10-08 | Owner: travel_ai | Status: architecture frozen, implementation gated**

## Product outcome
For a specific origin, group, dates, interests, access needs and total budget, return a defensible end-to-end Greek escape: destination + stay + daily real stops + transfer feasibility + why now + evidence and uncertainties. A page of ranked hotels is never an accepted output.

## Six interlinked evidence domains
| Domain | Entities / fields | Required relationships |
| --- | --- | --- |
| Geospatial | region, destination, microplace, POI, ferry/road connection, coordinates, travel duration, route provider, accessibility | located-in, reachable-from, distance-to, transfer-required |
| Temporal | dates, daylight, season, school/national holiday, official event, opening window, forecast timestamp | suitable-in, opens-on, occurs-at, expires-on |
| Experiences | walk, museum, activity, local food, scenic viewpoint, culture, family activity; duration, season, booking requirement | near, complements, conflicts, sequence-after |
| Stays | canonical place, offer, unit, price basis, availability verification, latest timestamp, tracking | belongs-to, close-to, valid-on; booking not inferred from feed |
| Traveler Intelligence | explicit requests, group, limitations, exclusions, preferences, choice feedback, consent | prefers, avoids, requires; request outranks memory |
| Evidence & Trust | provider URL, license, observation timestamp, valid_from/to, confidence, review status, source hash, uncertainty | supports, disputes, supersedes |

## Canonical storage and identity
Reuse existing Supabase `stay_places`, `stay_offers`, `stay_product_knowledge_v43`, `travel_knowledge_entities_v44`, `travel_knowledge_facts_v44`, `travel_knowledge_evidence_v44`, `travel_knowledge_edges_v44`, `travel_destination_nodes_v46`. Do not replace them. Canonical entity ID is stable; place, offer, experience and destination are distinct grains. Separate provenance rows for observations. One source update must not overwrite contrary verified evidence; record competing claims and review status. Save `observed_at` separate from `valid_for_date` and `ingested_at`. Use privacy-safe session identifiers and delete expired behavioral data.

## Additional capability (versioned shadow tables, not destructive schema rewrite)
`travel360_corpus_v1` stores per-entity language, content, source fingerprints, evidence timestamp and quality tier.
`travel360_embeddings_v1` stores entity+model+revision+vector, generation metadata and QA status; separate from existing 16d interpretable intent vectors.
`travel360_eval_scenarios_v1` stores labeled intents, mandatory gates, acceptable/rejected destinations and evidence references.
`travel360_eval_runs_v1` records baseline/model variants, metrics, cost and decision to release.
`travel360_feature_snapshots_v1` stores as-of-date feature coverage and retrieval/ranking evidence without personal health or private raw conversations.
All tables RLS-protected: service-role internal only; no anon writes. Add indexes after EXPLAIN/ANALYZE and actual workload validation.

## Intelligent decision hierarchy (not one universal weight)
0. **Hard eligibility**: date feasibility, origin is not destination (unless explicitly requested), closed locations, explicit exclusions, accessibility, physical constraints, invalid offer. Fail => removed, with reason.
1. **Candidate generation**: structured geo/time filters + full-catalog lexical/tsvector + optional multilingual embeddings + graph traversal; reciprocal-rank fusion with source provenance.
2. **Destination pass**: evaluate time/season fit, trip effort, experience richness and itinerary feasibility; consider uncertainty. Inventory scarcity must not manufacture a destination preference.
3. **Stay and itinerary pass**: available/unknown stock distinction, value vs full travel budget, stay-to-experience reachability and day-by-day coherence. Hard routing and opening hours dominate LLM prose.
4. **Personalized ranking**: initial monotonic interpretable score only across eligible *complete trips*. Proposed *experiment only* starting weights: time/season 0.22, transport feasibility 0.20, experience fit 0.22, traveler needs 0.18, total value 0.12, evidence/quality 0.06. Renormalize only over supported signals; never treat missing evidence as positive. Evaluate weight sensitivity per traveler archetype and calibrate using labeled expert preferences. Never claim weights are already optimized.
5. **Skeptic**: seeks counterevidence, missing stock/closures, unsafe itinerary pacing, pricing units, source staleness and winter/summer mismatch. May veto or lower confidence.
6. **Advocate**: choose diverse top 3-5 explainable trips; attach trade-offs and practical next action. Top 100 is a secondary explore surface, not the main product.
7. **Post-trip**: gather consent-based impressions, clicks and verified bookings; train rerankers only after enough clean, attributed outcomes.

## Open neural model and training curriculum (no paid APIs)
- Embedding baseline: local `intfloat/multilingual-e5-small`, version-pinned MIT, EL/EN, input `query:` or `passage:`; compare `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. Do not use unverified vector dimension; measure actual model output and enforce the storage dimension. Cache per normalized input SHA-256 and model revision.
- Phase 1: normalize/de-duplicate/verify corpus and create *gold* held-out scenarios. No training required to use pretrained embeddings. Backfill in bounded local batches with source license checks.
- Phase 2: run dense vs lexical vs hybrid shadow evaluations: recall@10, nDCG@10, counterfactual missingness, exact eligibility violations (target zero), Greece EL/EN quality, freshness, p95 latency and zero-cost operating budget.
- Phase 3: supervised learning-to-rank (LightGBM/selected open method) only with sufficient expert labels and non-overlapping temporal splits. Tune hyperparameters using validation split; hold out a strict test split and compare baseline; data leakage audits.
- Phase 4: outcome learning only after instrumentation and privacy/consent, adequate exposures, attribution windows and *confirmed* bookings. Outbound clicks are *not* conversions. Run shadow before canary, and rollback automatically on hard gate violations.
- Every run stores training corpus revision, model weights hash, data split, metrics, runtime, reviewer and active/shadow status. No claims of self-learning without logged runs.

## Agentic division and truthful output
V45 Orchestrator owns decisions. Spatial analyst validates routes; Temporal verifies timing; Experience curator proposes authentic local sequences; Stay matcher verifies actual offer facts; Source auditor checks trust; Skeptic challenges; Traveler advocate selects; Itinerary builder uses only grounded waypoints/times; SEO publisher uses published, reviewed public facts not private traveler profiles. Each stage emits schema-validated facts, scores, filters, warnings, references and tool-call traces.

## Release gates
A. No origin-city result in origin-not-destination scenarios. B. No claimed in-stock if unknown. C. No expired price/link, no unverified event/weather. D. End-to-end itinerary stops traceable to canonical IDs, realistic transfer times, day-level opening validity. E. Greek and English labeled scenario benchmark with evidence and recall@10/nDCG@10 comparing baseline. F. Coverage tracked: stays, places, microplaces, events, dining, dates, embedding status, source age. G. Typecheck, strict tests, build, CI and live smoke verified. H. No deploy by skill commit alone.

## Observed audit (2026-10-08)
1,632 stay places; 1,283 product knowledge profiles; 2,357 entities; 1,819 knowledge facts; 2,975 edges; 0 populated stay_places.embedding; 0 travel_agent_runs_v44. Data availability is not verified simply from stay_offers validity.

## Next milestones with definition of done
M1 schema shadow + corpus validation + audit endpoint, no business-logic activation.
M2 384-d embeddings backfilled locally for genuine text corpus, >95% eligible coverage and validated Greek/English retrieval.
M3 V45 shadow trip-ranking with golden scenarios and 0 eligibility violations; evidence-first full itinerary.
M4 user-verified end-to-end Escape Book (mobile desktop map + saved itinerary + lawful booking handoff); production only after release gates.

## Evidence-based multisource research expansion (required before full-360 training)
**Verified structural audit 2026-10-08:** knowledge entity types: stay=1,769; locality=524; destination=50; region=13; country=1. The current entity table is overwhelmingly lodging+geographic nodes, not a complete experience/review/event graph. Do not use “360 trained” as a claim.

### Distinct research corpora (each requires independent source and licensing provenance)
1. **Geographic discovery:** Wikidata CC0 entity labels, multilingual aliases, coordinates, subclass/type and parent region; Wikipedia/Wikivoyage text must observe individual CC BY-SA obligations, not assume Wikidata CC0 covers prose. Use OSM/Overpass only under ODbL and usage restrictions; use bounded geographic extracts, no heavy anonymous global queries.
2. **Culture/history:** official Greek Ministry of Culture and public museum/open-data feeds, individual monument opening hours and tickets with latest verified timestamp; editorial descriptions grounded in official sources and licensing.
3. **Experiences:** trails/hikes, viewpoints, beaches, nature, local activities, family suitability, duration, season and accessibility; evaluate physical suitability from real maps/provider evidence, not language generation.
4. **Food/drink:** restaurant/cafe/producer/market POIs, regional dishes, cuisines, opening hours, authenticity evidence and distance to itinerary stops. Never infer quality from cuisine tags.
5. **Transport and weather:** routes, ferry schedules, live operational exceptions, station timetables, public transport, road closures, forecast with timestamps and uncertainty; do not describe routing as real-time unless queried successfully.
6. **Temporal and cultural calendar:** public holidays, named Greek local festivals, religious observances where relevant, seasonal activities, events with confirmed year/date/source, school breaks; historical traditions separated from verified upcoming events.
7. **Accommodation:** current 1,632 stay places and offers, actual booking-unit availability distinct from in-stock feed flags; connect location and activity reachability.
8. **Reviews and reputation:** authorized first-party feedback, openly licensed datasets, partner-provided ratings with compatible terms and attribution. Keep review count, date, provider, scale, place-identity certainty and consent. No invented reviews or averaged ratings across incomparable providers. **Google Places generally restricts caching and requires author/Google attribution**, so do not bulk train/store Google/Tripadvisor/Booking reviews without specific contractual permission.
9. **Community discovery:** human-curated microplaces and hidden places verified by multiple grounded sources; never scrape private community data or invent “secret” places.
10. **Traveler outcomes:** opted-in explicit utility ratings, itinerary edits, real visited points, satisfaction and confirmed bookings; avoid equating clicks with success.

### Agentic research factory
`Source Scout -> Terms/License Gate -> Scheduled Authorized Harvester -> Entity Resolver (EL/EN names + coordinates + identifiers) -> Claim Extraction -> Dual Source Verification -> Freshness/Disagreement Tracker -> Graph Relation Builder -> Corpus Builder -> EL/EN Dense Embedding -> Hybrid Retrieval -> Expert Preference Labels -> Trip-Ranker Eval -> Skeptic and Traveler Advocate`.
Every extracted field has `source_url,license,attribution,observed_at,valid_from/to,confidence,reviewer,status`. Missing an authoritative source is an unknown, never an optimistic negative/positive. Maintain *raw immutable claims* separate from inferred features. Revisions and challenged/disputed claims must not be silently overwritten.

### Training priorities (experience-centered)
- Pass 1: gold relevance labels for destination, attractions, microplaces, food, season and accessibility, independent of hotel feed.
- Pass 2: multilingual E5 semantic retrieval for all permitted travel entity types; user Greek, English and Greeklish benchmark queries.
- Pass 3: cross-entity graph neighborhood generation (place -> local experiences -> nearby stay -> feasible route -> calendar), with point-in-time joins; relevance ablations: lexical-only vs semantic vs graph vs hybrid.
- Pass 4: itinerary-level ranking with hard gates on origin, driving limits, daylight, opening times, cost and accessibility; expert rating for coherence and surprise value.
- Pass 5: outcome-based LightGBM/other LTR only when verified labels exist; quantify generalization for underrepresented islands/microplaces. No synthetic labels treated as human ground truth.

### Anti-shortcut release conditions
* Minimum thresholds are **evaluation goals**, not achievements: 95%+ verified coordinates and provenance on each active entity type; 90%+ EL and EN lexical alias coverage for priority POIs; all promoted event/availability claims time-valid; zero hard constraint violations across manually reviewed golden cases.
* Coverage dashboard by geography, region, island/mainland, business type, accessible experience, season and update age; audit and target sparsity rather than chasing raw millions of datapoints.
* User output requires a full **experience first** itinerary with grounded POIs, non-lodging evidence, practical transfers and optional truthful booking handoff.
