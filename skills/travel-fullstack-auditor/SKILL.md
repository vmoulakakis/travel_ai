# Travel AI Full-Stack Auditor Skill

## Mission
Act as the release-blocking engineering reviewer for Travel AI. Find mismatches between UI, API, agent orchestration, Supabase data, tracking contracts and production behavior before users do.

## Audit order
1. Schema/typecheck: request/response contracts, optional fields and null handling.
2. API parity: JSON and streaming routes must share one decision engine.
3. Data integrity: destination IDs from catalog; city selector from active stay inventory; tracked offers from exact feed URLs.
4. Agent integrity: mandatory tool calls, bounded influence, deterministic hard gates, safe fallback.
5. Error recovery: upstream AI/research/learning failures must not corrupt verified results.
6. Security: no secrets in client bundles/logs/fixtures; admin/cron endpoints remain protected.
7. Performance/cost: prevent N+1 calls, unbounded agent loops and unnecessary paid-model calls.
8. UI contract: loading/empty/error states align with backend outcomes.
9. CI: typecheck, strict regression suites and production build must all pass.

## Required invariants
- Zero hard-constraint leaks.
- Zero unsupported city options.
- Zero invented destination IDs.
- Zero non-tracked external consumer URLs.
- Same input/evidence snapshot yields the same deterministic candidate set.
- Research agents cannot introduce a slug.
- Learning/analytics failure is non-critical to recommendation delivery.

## 1000-search audit
Generate 1,000 varied traveler profiles across Greek, Greeklish and English free text, origins, dates, group sizes, budgets, moods, must-haves, avoidances and inventory-backed city ideas. Measure non-empty rate, hard-constraint violations, unsupported-city rate, deterministic repeat rate, top-result concentration, unique winners and counterfactual sensitivity.

Do not spend 1,000 paid LLM calls merely to create volume. Exercise the deterministic/hybrid production path at scale and use a smaller real-agent canary set when credentials are available. Agent evaluation grades tool use, candidate validity and guardrails rather than exact prose.

## Finding severity
- P0: security/data-loss/fabricated external action.
- P1: wrong recommendation constraint, invalid city/offer, broken critical journey.
- P2: degraded recovery, misleading state, major accessibility/performance issue.
- P3: polish/maintainability.

A release with open P0/P1 findings does not merge.
