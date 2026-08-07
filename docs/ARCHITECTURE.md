# Travel Decision OS Architecture

## Product invariant

The application is a travel **decision** engine, not a booking clone. It must turn time, budget and intent into exactly three differentiated escapes, then help the user make the selected trip happen.

## Runtime path

`structured intent → feasibility/ranking/diversity → DeepSeek V4 Pro explanation → selection → Trip Basket → affiliate eligibility → offer`

DeepSeek is the reasoning/explanation layer, not the source of truth for prices, schedules, availability, stock or permissions.

## Layers

- **Presentation:** Next.js App Router / React, mobile-first progressive state machine.
- **Application:** structured trip request and orchestration.
- **Decision:** deterministic constraint, intent, season, travel-effort, budget and evidence scoring plus diversity reranking.
- **AI:** DeepSeek V4 Pro, Thinking Mode enabled, server-only.
- **Evidence:** current and future route/product/merchant observations with freshness.
- **Commerce:** Linkwise supply intelligence plus a fail-closed affiliate eligibility gate.
- **Persistence:** Supabase/Postgres; no database connection is required during `next build`.

## Destination ranking weights

- constraint fit 25%
- intent/mood 20%
- seasonal fit 20%
- travel effort 15%
- budget fit 12%
- evidence/freshness 8%

Commercial metrics do not participate in destination ranking. Merchant selection happens after the destination decision.

## Trust rules

- no fabricated live price/schedule/stock;
- seed estimates are labeled;
- stale seasonal evidence can hard-fail a candidate;
- fit score and confidence are independent;
- unknown affiliate permission means no affiliate CTA;
- no fake urgency or scarcity.
