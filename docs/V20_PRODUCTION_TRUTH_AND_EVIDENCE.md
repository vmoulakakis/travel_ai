# V20 — Production Truth & Evidence Coverage

## Goal

V19 repaired semantic understanding. V20 moves the release focus from parser quality to production truth: deployed-commit verification, explicit accommodation availability semantics, evidence-coverage observability, and least-privilege access to inventory aggregates.

## Availability truth

A feed row is no longer treated as having one binary meaning. V20 preserves the feed `in_stock` field and classifies each rechecked stay as:

- `CONFIRMED_ACTIVE` — `in_stock=true` and the dated feed window covers the full trip.
- `VALID_WINDOW_STOCK_UNKNOWN` — the dated feed window covers the trip but stock is not explicitly supplied.
- `EXPLICITLY_UNAVAILABLE` — `in_stock=false`.
- `OUTSIDE_VALIDITY_WINDOW` — the feed does not cover the full requested trip.
- `INVALID_FEED_EVIDENCE` — tracking or dated evidence is incomplete.

All states still require final provider confirmation. `UNKNOWN` is not converted into a claim of booked inventory.

The existing frontend handoff remains backwards-compatible: `/api/stay-availability` still exposes its legacy top-level status while adding `availabilityTruth` and `alternativeTruth` so clients can migrate without breaking the current booking funnel.

## Production truth endpoint

`/api/v20/status` is the release-verification endpoint. It reports:

- release and deployed Vercel commit;
- environment;
- Greek destination catalog count;
- active stay-locality health;
- production-truth RPC health;
- unknown vs explicitly confirmed stock counts;
- verified persistent evidence rows and covered destinations;
- route/travel evidence row counts;
- evidence coverage percentage and depth.

`/api/health` is upgraded to V20 and requires the aggregate production-truth path to be healthy.

## Evidence coverage

V20 does not fake evidence maturity. Evidence depth is reported as:

- `BROAD` at >=80% destination coverage;
- `PARTIAL` at >=30%;
- `LIMITED` below 30%.

Coverage is the percentage of active Greek destinations with at least one current `verified` row in `destination_evidence_v12`.

Route and travel evidence counts are exposed separately so a healthy runtime cannot be mistaken for a deep evidence corpus.

## Security hardening

`get_active_stay_cities_v15(integer)` remains callable by the stay-cities Edge Function through `service_role`, but V20 revokes direct execution from `public`, `anon`, and `authenticated`.

The new `get_production_truth_v20()` aggregate RPC is also service-role-only. The Edge endpoint may additionally require the existing `SUPABASE_INGEST_SECRET` header when configured.

## Release gate

`npm run test:v20:truth` validates:

- all five availability truth states;
- public RPC revocation and service-role grant;
- production-truth aggregate presence;
- Edge endpoint authentication contract;
- V20 health/status markers;
- preservation of `in_stock` during stay-feed mapping.

It is part of `npm run test:strict` and must pass together with all V8–V19 gates.

## Deployment acceptance

V20 is not called live until all of these are true:

1. GitHub CI passes `typecheck`, `test:strict`, and `build`.
2. The V20 database migration is applied.
3. `production-truth-v20` Edge Function is deployed.
4. Vercel deploy succeeds.
5. `/api/v20/status` returns `release=V20`, `ok=true`, and the expected deployed commit.
6. The canonical production alias is separately verified before declaring production rollout complete.
