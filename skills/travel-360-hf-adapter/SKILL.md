---
name: travel-360-intelligence
description: Evidence-first multimodal, geospatial, seasonal and commercial-analytics control plane for TravelAI Greece; optional Hugging Face embeddings and reproducible ranking/evaluation.
version: 0.1.0
reviewed: 2026-10-08
owner: travel_ai
status: research-and-integration-contract
---

# TravelAI 360° Intelligence — MyAgenticTeam Skill

## Goal and hierarchy
Find the right Greek destination and real stay for a specific traveler at the right time. Never equate high affiliate payout, raw demand proxy, model similarity or low price with user suitability.

Current request > explicit hard constraints > verified spatial/time/availability evidence > semantic retrieval > taste/utility ranking > bounded learning. Research is advisory, not a substitute for verified observations.

## Canonical ownership
- TravelAI runtime: `travel_ai/skills/travel-orchestrator/SKILL.md`
- User preference learning: `travel_ai/skills/travel-learning/SKILL.md`
- Cross-project runtime: `skills/agent-runtime-2026/SKILL.md`
- Greece demand research: `skills/greece-demand-intelligence/SKILL.md`
- SEO: `agents/black-belt-seo/` and `skills/ai-search-visibility/`
- Product design/CRO: `skills/web-design-intelligence/` and `skills/ai-page-builder-dev/`

This skill orchestrates data quality, retrieval and evaluation; it does not replace or duplicate these owners.

## Source inventory to reconcile, not add blindly
Supabase project `bgvgstpoypqbjnemqcqp`: `stay_places`, `stay_offers`, `stay_product_knowledge_v43`, `destination_knowledge_v8`, `travel_destination_nodes_v46`, `travel_knowledge_entities_v44`, `travel_knowledge_facts_v44`, `travel_knowledge_evidence_v44`, `travel_knowledge_edges_v44`, traveler/agent/outcome event logs. Partition by entity ID and evidence provenance; record completeness, confidence, observed_at, expires_at, valid_date_range, spatial precision, and whether the fact is observed or inferred. A database row is not a unique place.

Observed 2026-10-08: 1,632 stay places, 1,635 offers, 1,283 stay knowledge profiles, 50 core destination records and 574 destination nodes. `stay_places.embedding` had 0 populated vectors and all offers had unknown `in_stock`; do not claim trained neural recommendation or verified live availability. Repeat diagnostics before publishing counts.

## Intelligence feature families
1. Intent: dates, duration, origin, group, needs, avoidances, budget, language, explicit destination.
2. Geospatial: coordinates, microplaces, drive/ferry/flight friction, accessibility, distances and region hierarchy.
3. Temporal: travel dates, shoulder-season vs high-season, Greek holidays, opening periods, dated events, daylight and weather confidence.
4. Product: accommodation archetype, amenities, quality/verified reputation, location, photos, price units and provenance.
5. Local discovery: beaches, culture, walks, food, events, hidden experiences and practical transport.
6. Commercial integrity: valid exact tracking link, feed freshness, stock unknown/confirmed, reported click outcomes; keep affiliate yield separate from traveler suitability.
7. Data uncertainty: missingness, stale observations, geographic mismatch, evidence strength, and unverified pricing.

## Candidate and model strategy
Retrieve over all eligible records, not merely the first page or popularity-sorted first N. Hard gates run before all soft ranking and diversity. Use two independent passes: destination suitability followed by stay/inventory reality. Keep an explainable rank ledger for all eligible candidates and expose up to 100 exploration options; show only 3-5 strongest choices prominently.

Hybrid retrieval: structured filters + multilingual lexical/BM25/tsvector + multilingual dense similarity when embeddings are populated and evaluated. Prefer `intfloat/multilingual-e5-small` (EL/EN, MIT) as embedding baseline; compare with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (Apache-2.0). Check licenses and model cards at runtime. Use E5 `query:` and `passage:` prefixes and consistent normalization. Never represent the existing 16-dimensional structured travel vector as a multilingual text embedding.

Start ranking with interpretable monotonic rules, hard vetoes and category-specific weights. Calibrate weights with traveler scenarios/labels, not intuition alone. Later evaluate LightGBM/LambdaMART or shallow learning-to-rank against the deterministic baseline. Train propensity only with legitimate, sufficiently populated, attribution-correct impression/click/confirmed booking outcomes. Cold start => label as relevance estimate, never numeric booking probability. Apply propensity correction and time-based validation; no training on unobserved conversions or affiliate commission uplift to suitability.

## Hugging Face connection and cost rules
The user's HF account is readable as `vmoulakakis` via OAuth, with Jobs scope, not evidence of a paid inference deployment. Public model weights may be downloaded locally or run on an eligible free allowance, subject to resource/billing limits. Never expose OAuth credentials or service-role keys. Choose feature extraction in a bounded batch, compute and cache once per distinct knowledge row/version; rate-limit. Provider errors => structured/lexical deterministic fallback. Do not launch paid HF jobs or endpoints automatically.

Gate model activation on versioned embeddings, dimension/normalization tests, Greek/English evaluation sets, recall@k, NDCG@k, constraint-violation=0, latency and unit-cost evidence. Version `embedding_model`, `embedding_at`, `input_hash` and source facts; re-embed only changed content.

## Agent team workflow
Inventory Auditor -> Time & Weather Analyst -> Spatial/Access Analyst -> Semantic Retriever -> Stay/Value Analyst -> Evidence Skeptic -> Traveler Advocate -> Conversion Analyst (analytics only) -> SEO/AEO Researcher -> Product Design/CRO Auditor.
Only named agents/tools with enforceable permissions. Each stage records inputs, tool keys, evidence references, missing features, rejection reasons, ranking contribution and confidence. If required evidence is unknown, say unknown.

## SEO / research leverage
The SEO agent consumes verified seasonal microplace insights and evidence-backed comparisons. Target Greek/English genuinely useful hubs, internal links, hreflang, indexability, WebSite/TravelAgency/FAQ as justified by actual page content; never fabricate ratings, reviews, price availability, search volume or bulk thin city pages. Review upstream official Hugging Face, Google Search Central, Vercel agent-skills and vendor docs through skill-curator; only install trusted, relevant licensed skills after audit.

## Mandatory local validation before deploy
- Data audit: entity dedupe, valid latitude/longitude in Greece, missing prices/stock, evidence staleness, link validation and model coverage.
- Greek October and November, Greek holidays, off-season island/winter mountain, no-car, family, couple, budget, surprise and contradictory constraints.
- Full-pool retrieval vs paginated inputs; top-100 sorted, unique and stable.
- Every recommended stay traceable to actual offer and evidence; stock unknown never shown as confirmed.
- Deterministic baseline and optional neural path compared by NDCG@k, recall@k, invalid-result rate and recommendation diversity.
- Typecheck, strict regression tests, build, and runtime smoke checks. No deployment/merge until all pass.

## Rollout
Phase A: diagnostics, feature definitions and tests. Phase B: cached open-weight embeddings + hybrid search, only after verified inference capability. Phase C: offline evaluation and shadow ranking. Phase D: opt-in production rollout with rollback. Phase E: behavior-based re-ranking when confirmed ground truth exists.

## Free/open-source-only stack — no paid SaaS dependency
Select the smallest self-hostable library per job, test license/version, memory and compute needs before activation. "Free source" means no license/API subscription; hosting/electricity and third-party target restrictions may still cost money.

| Purpose | Preferred GitHub source | Rule |
| --- | --- | --- |
| Multilingual embeddings | huggingface/sentence-transformers + intfloat/multilingual-e5-small | Local CPU ONNX/PyTorch batch inference; test EL+EN precision, version dimensions |
| Small local embedding runtime | qdrant/fastembed | Check the specific multilingual model is supported before choosing; do not silently substitute an English-only model |
| Similarity index | pgvector/pgvector in existing Supabase Postgres | Store model/dimensions/version and cosine-ready normalized vectors; no external vector SaaS |
| Ranker | microsoft/LightGBM | Keep current deterministic hard gates; fit LTR only against human/real feedback labels |
| Optional local reasoning | ollama/ollama or ggml-org/llama.cpp | Open runtime, **separately inspect each model's weights/license**; CPU/RAM suitability, rate limits |
| Research crawl | unclecode/crawl4ai | Apache-2.0, self-host, obey robots and website terms, never impersonate private API or scrape protected reviews |
| Search discovery | searxng/searxng | AGPL; aggregate search within engine and target restrictions; do not claim free unlimited Google SEO volumes |
| Change monitoring | dgtlmoon/changedetection.io | Self-host; watch first-party/allowed official events and relevant changes |
| Product analytics | umami-software/umami | Self-host MIT web analytics; events are not bookings |
| Alternative analytics | plausible/analytics CE | Self-host community edition, check edition terms/dependency costs |
| UX and SEO browser tests | microsoft/playwright and GoogleChrome/lighthouse | Local screenshots, CWV, crawlability, accessibility; not a proxy for live search ranking |
| Search diagnostics | first-party sitemap/robots/server logs and public Search Console UI where authorized | Search Console is a free first-party platform but requires verification; don't fake an API connection |

## Research and plugin policy
Firecrawl or Ahrefs plugin connection is optional, never required: replace with self-hosted Crawl4AI, SearXNG, Lighthouse and tracked search performance where available. Ahrefs backlink estimates and keyword-volume datasets cannot be honestly reproduced exactly using free crawlers; report **unknown** if no authorized source. Github public repositories are code sources, not a license for copyrighted photos, hotels' private data or 3rd-party reviews. Use official first-party sources and verify each extracted claim/date. Respect SEO quality and no mass thin pages.

## Models by specialized capability
- Place + property semantic matching: multilingual E5-small evaluated against multilingual MiniLM, full catalog embeddings generated offline in batches.
- Fine-grained comparison/reranking: an optional open cross-encoder selected only after Greek benchmark + runtime cost comparison, not automatic.
- Text generation/local agent: quantized open-weight 3–8B instruction model compatible with local available hardware, only for interpretation/synthesis of verified evidence. No API-based dependency.
- Route, dates, prices, availability, holidays and physical coordinates: deterministic sources/algorithms, **not language model guesses**.
- Conversion estimates: LightGBM/CatBoost after impressions and attributed bookings; until then scores are traveler-fit heuristic, not probability.
- Crawling/SEO: Crawl4AI + Playwright + Lighthouse + canonical first-party search logs; no LLM required for every crawl.

## Acceptance proof before calling integrated
Present reproducible local steps, dependency pinning, license review, sample EL/EN embeddings and query recall@10, data quality metrics, source permission review, baseline-vs-hybrid comparative evaluation, and full tests. GitHub skill changes alone are governance, not model deployment. Never execute paid HF Jobs, deploy, or ship untested integrations.

## Shared development tooling
For reusable tooling and skills across all projects use the MyAgenticTeam open-source AI development toolkit, not this travel-specific decision framework.
