# Ελληνικός AI Travel Guru — Greece-First Travel Decision System

Το Travel Guru είναι σύστημα ταξιδιωτικής απόφασης, όχι hotel catalog και όχι one-shot LLM recommender.

**Current production:** V22 on `main` (`93d7bee4a908b9f1cf1de0e76bc4dc6262654d2f`)  
**Current release candidate:** V24 Locality-Native on `v24-locality-native` — test first, not production until all gates pass.

Η μοναδική πηγή αλήθειας για architecture, recovery, agents, memory, data, tests και deployment είναι το [`docs/MASTER_BLUEPRINT.md`](docs/MASTER_BLUEPRINT.md).

## Core V24 decision path

```text
USER STRUCTURED FIELDS + FREE TEXT
        ↓
CANONICAL 24D FUZZY SEMANTIC CONTRACT
        ↓
DATED REAL LOCALITIES FROM LIVE INVENTORY
        ↓
DETERMINISTIC HARD-CONSTRAINT GATES
        ↓
EXACT-LOCALITY FUZZY MULTI-CRITERIA RECALL
        ↓
GROUNDED LOCALITY EVIDENCE RERANK
        ↓
EXACT-LOCALITY DATED STAY VALIDATION
        ↓
WEATHER / SEASON / ROUTE UNCERTAINTY
        ↓
FINALIST RESEARCH + INDEPENDENT CRITIQUE
        ↓
DIVERSE, EVIDENCE-BACKED TRIP DECISIONS
        ↓ user selects one
EXACT LOCALITY HOTEL RERANKING
```

## Non-negotiable rules

- **Locality is first-class identity.** A place does not need a legacy canonical destination parent to participate.
- **Canonical destination is optional enrichment.** No wide nearest-island/city mapping.
- **Free text is first class.** It is formulated into the same 24D contract as the structured form.
- **The formulator does not choose destinations or hotels.** It only translates meaning into the canonical contract.
- **Hard constraints remain deterministic and fail closed.**
- **Inventory depth is not relevance.** Property/offer count may be audited but never increases ranking score.
- **Evidence must be able to repair coarse semantic recall.** It runs before shortlist freeze.
- **Hotels are retrieved by exact `locality_id` for locality-native recommendations.**
- **Unknown availability/route truth is never presented as confirmed.**
- **Raw model/provider errors never reach the traveler.**
- **Cross-session learned personalization is disabled** until consent, sufficient validated outcomes and calibration exist.

## Current data model

V24 uses the live dated locality layer backed by:

- `destination_semantic_profiles` — 24D locality semantic recall profiles,
- `stay_semantic_profiles` — 24D hotel semantic profiles,
- `get_locality_profiles_v23(date,date)` — service-role-only dated locality candidates,
- `get_locality_stays_v23(locality_id,date,date,limit)` — service-role-only exact-locality stays,
- protected Edge functions `locality-profiles-v23` and `locality-stays-v24` using the existing server-side `x-app-secret` pattern.

The 24 ordered dimensions are:

`relax, romantic, food, warmth, city, nature, adventure, culture, luxury, boutique, resort, value, family, couple, solo, friends, low_effort, warm_climate, all_weather, beach_season, nightlife, wellness, short_break, shoulder_season`.

## Free-text / model routing

For quality-critical formulation and locality evidence reasoning, the preferred route is:

1. DeepSeek V4 Pro when configured,
2. strong OpenAI reasoner (`OPENAI_REASONER_MODEL`, V24 default `gpt-5.1`),
3. self-hosted OpenAI-compatible model,
4. Hugging Face/open-model fallback,
5. deterministic multilingual fallback.

Cheaper models may still handle lower-risk verification/classification work. Model memory is never accepted as travel evidence.

## Matching

V24 uses a hybrid decision system:

- deterministic hard eligibility,
- continuous fuzzy semantic memberships,
- explicit negative memberships,
- non-compensatory priority floors,
- grounded evidence reranking,
- exact-locality accommodation fit,
- weather/season/access uncertainty,
- portfolio diversity,
- independent critique.

The same semantic contract follows the user from locality retrieval into hotel ranking, so a request such as `food first, boutique, no nightlife, xoris poli odigisi` affects both **where** and **which stay**.

## Memory and learning truth

Active today:

- anonymous session semantic contract,
- derived hard/soft stay requirements,
- recommendation impressions/selections/offer events/click outcomes for evaluation.

Not active as ranking input:

- hidden cross-session behavioral personalization,
- inferred psychological profiling,
- LambdaMART/LambdaRank production reranker.

A learned ranker requires sufficient validated outcomes, a holdout benchmark, calibration/bias checks and explicit memory consent UX before it can influence production.

## Key V24 files

```text
lib/ai/travel-orchestrator-v24.ts
lib/ai/locality-evidence-reranker-v24.ts
lib/ai/result-auditor-v24.ts
lib/ai/agent-skills-v24.ts
lib/decision/locality-candidate-v24.ts
lib/decision/locality-native-ranking-v24.ts
lib/decision/choice-correctness-v24.ts
lib/decision/v24-matcher.ts
lib/data/locality-profiles-v23.ts
lib/data/locality-stays-v24.ts
app/api/recommend/route.ts
app/api/recommend/stream/route.ts
app/api/destination-detail/route.ts
app/api/v24/status/route.ts
supabase/functions/locality-stays-v24/index.ts
scripts/v24-locality-native-smoke.ts
```

Legacy V8–V23 modules remain as regression/recovery baselines until V24 has passed preview/canary and production observation.

## API / operations

- `/api/recommend` — authoritative V24 JSON decision endpoint on the V24 branch.
- `/api/recommend/stream` — authoritative V24 progressive endpoint on the V24 branch.
- `/api/destination-detail` — exact-locality stay lookup for V24 recommendation identities.
- `/api/v24/status` — V24 locality/model/memory readiness probe.
- `/api/health` — current production release health; remains production-version-specific until V24 promotion.

## Release gates

Every PR must pass:

```bash
npm install
npm run typecheck
npm run test:strict
npm run build
```

`test:strict` includes all historical V8–V23 regression gates plus:

```bash
npm run test:v24:locality
```

The V24 gate proves, among other things:

- locality-only candidates survive into ranking,
- changing a primary semantic criterion can change the winner,
- two localities sharing one canonical parent remain independently rankable,
- grounded evidence can repair coarse recall,
- exact locality identity is reversible from the public recommendation identity,
- hotel lookup uses exact locality rather than a nearby canonical radius,
- evidence reranking runs before shortlist choice correctness.

## Deployment policy

Current V22 production is preserved while V24 is tested. Do **not** merge to obtain a preview URL.

Promotion order:

1. exact-head typecheck,
2. cumulative strict suite,
3. production build,
4. live locality/offer audit,
5. counterfactual behavior tests,
6. exact-locality hotel smoke,
7. preview/canary,
8. explicit acceptance,
9. merge to `main`,
10. Vercel production + health + rollback verification.

If a meaningful test fails, fix the implementation. Do not lower the acceptance threshold to make the release green.
