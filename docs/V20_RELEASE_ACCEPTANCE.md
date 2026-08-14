# V20 release acceptance

- [ ] GitHub PR CI: typecheck PASS
- [ ] GitHub PR CI: `npm run test:strict` PASS, including `test:v20:truth`
- [ ] GitHub PR CI: production Next.js build PASS
- [ ] V20 migration applied to production Supabase
- [ ] `production-truth-v20` Edge Function deployed
- [ ] Supabase security advisor no longer flags anon/authenticated execution for `get_active_stay_cities_v15(integer)`
- [ ] Vercel preview or production deployment succeeds
- [ ] `/api/v20/status` reports `release=V20`, `ok=true`, and deployed commit
- [ ] `/api/health` reports `release=V20` and `productionTruthReady=true`
- [ ] Canonical production alias separately verified before declaring V20 live
