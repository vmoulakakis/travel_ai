## V20 — Production Truth & Evidence Coverage

### Why
V19 made semantic interpretation strong on the controlled audit suite. The current production-quality gap is truthfulness of accommodation availability, deployment verification, evidence depth, and least-privilege access to inventory aggregates.

### Changes
- preserve `in_stock` through the stay-feed mapper
- add explicit five-state stay availability truth
- expose V20 truth alongside the backwards-compatible final recheck status
- add service-role-only `get_production_truth_v20()` aggregate
- revoke public/anon/authenticated execution of `get_active_stay_cities_v15(integer)`
- add protected `production-truth-v20` Edge Function
- upgrade `/api/health` to V20
- add `/api/v20/status` as the deployed-commit/evidence verification endpoint
- add permanent `test:v20:truth` to `test:strict`

### Non-goals
No semantic ranking threshold changes, no V19 gate weakening, no fake evidence, no inventory weighting in destination ranking.

### Release policy
Merge only after cumulative CI passes. Apply DB migration and deploy Edge Function before Vercel runtime verification. Do not call V20 live until `/api/v20/status` reports V20 and the deployed commit, and the canonical alias is separately verified.
