# Ελληνικός AI Travel Guru V10 — Greece-First Travel Decision AI

Travel decision intelligence for travelers starting primarily from Greece.

**Promise:** answer five short human question sets and get six genuinely different Greek destination matches based on emotional need, dates, season, effort, group budget and non-negotiables — **before hotel inventory enters the decision**.

The current product and recovery blueprint is in [`docs/BLUEPRINT_V10.md`](docs/BLUEPRINT_V10.md). The 100-scenario acceptance record is in [`docs/EVALUATION_V10.md`](docs/EVALUATION_V10.md).

## Core rule

```text
USER ANSWERS
    ↓
STRUCTURED SEMANTIC INTENT
    ↓ optional free text only
DEEPSEEK INTENT PARSER
    ↓
DESTINATION KNOWLEDGE V8
    ↓
SEASON + EFFORT + DURATION + BUDGET BAND
    ↓
WEATHER ON FINALISTS
    ↓
DIVERSITY + CONDITIONAL OPENAI VERIFIER
    ↓
EXACTLY 6 DIVERSE DESTINATIONS
    ↓ user selects one
GEOLOCATED LINKWISE STAYS
```

### What V8 deliberately does not do

- Hotel count does **not** rank destinations.
- Affiliate EPC, discount and merchant economics have **0%** destination weight.
- Hotel descriptions do **not** define what a destination is.
- Feed `location_label` is not trusted as destination identity.
- Missing affiliate inventory does **not** invalidate a good destination match.
- Feed validity overlap is not presented as live room availability.
- OpenAI is not a travel planner or source of facts.

## Destination Knowledge

`destination_knowledge_v8` remains the independent destination graph. The current product filters it to 21 active Greek places before scoring. Every destination stores:

- canonical names and aliases
- latitude / longitude
- semantic travel traits
- 12-month suitability profile
- ideal trip duration
- qualitative cost tier
- effort class from Athens and Thessaloniki
- route confidence
- crowd level
- hotel matching radius

The catalog is seeded by `0014_seed_destination_knowledge_v8.sql` and can be expanded without touching the matching engine.

## Matching

The production V8 score is explainable. Depending on intent, the normalized blend uses approximately:

- Intent: 31–34%
- Season: 16–18%
- Effort: 12%
- Duration: 9%
- Budget band: 8–9%
- Weather: 6–14%
- Traveler fit: 7–8%
- Crowd fit: 2–4%

Explicit requirements can become feasibility guards. For example, a user explicitly asking for warmth cannot receive an off-season/cold beach destination merely because diversity would otherwise promote it.

`npm run test:v8` contains mandatory regression scenarios for romantic/food, November warmth, low-budget city/culture and winter nature/relax matching. CI fails if these invariants regress.

## AI roles

### DeepSeek V4 Pro

Optional. Structured answers require no LLM. DeepSeek is used only when the traveler adds natural-language intent such as “quiet, great food, not too touristy, easy to reach.” It converts that text to semantic preference weights. It does not name destinations or invent facts.

### OpenAI

Optional low-cost final consistency verifier. Default model: `gpt-5.4-nano`. It runs only when the numeric ranking is genuinely ambiguous or contains a risk signal. Clear ranking sets skip the call entirely.

### Neural learning

V8 learning is isolated under model version `v8-destination-ranker`.

The trainer is a small 12→8→1 network and stays inactive until all of these are true:

- at least 500 labeled candidate examples
- at least 60 positive outcomes
- at least 200 negative examples
- balanced validation accuracy >= 0.75

Until that gate passes, learned influence is zero. Training runs in Supabase and consumes no LLM tokens.

## Stay matching

Stays are fetched **only after destination selection**. `get_destination_stays_v8` links feed products to the selected destination using raw latitude/longitude plus canonical city aliases. Polluted values such as `city=all` are discarded.

Only tracked Linkwise URLs are surfaced. If the feed omits currency, V8 does not display a monetary price. The UI explicitly tells users to confirm actual room availability with the merchant.

## Supabase

V8 database assets:

- `destination_knowledge_v8`
- `get_destination_catalog_v8()`
- `get_destination_stays_v8()`
- `v8_match_training_examples`
- `matching_model_versions` → `v8-destination-ranker`

V8 Edge Functions:

- `destination-catalog-v8`
- `destination-stays-v8`
- `match-learning`
- `train-v8-ranker`
- `ingest-linkwise-travel`

Server-to-edge reads use the existing hashed application secret. No Supabase service-role key is exposed to Vercel or the browser.

## Environment

Copy `.env.example`. Required for the destination catalog and stay lookup:

```text
SUPABASE_INGEST_SECRET=
CRON_SECRET=
```

DeepSeek and OpenAI keys are optional enhancements. See `.env.example` for the full contract.

## Operations

- `/api/health` — V8 destination-brain readiness
- `/admin` — V8 architecture and import readiness
- `/api/recommend` — V8 JSON recommendation endpoint
- `/api/recommend/stream` — V8 progressive recommendation endpoint
- `/api/destination-detail` — downstream geolocated stay lookup
- `/api/jobs/linkwise` — protected feed ingestion
- `/api/jobs/train-matcher` — protected V8 neural training gate

## CI / deployment

Every pull request runs:

```bash
npm install
npm run typecheck
npm run test:v8
npm run build
```

Merge to `main` only after all four pass. Production should then be validated with `/api/health`, one deterministic matching request, one free-text request and a downstream stay lookup.
