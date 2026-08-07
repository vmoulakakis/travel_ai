# V3 release checklist

- [x] One-screen Decision Canvas replaces the visible six-step wizard.
- [x] Exactly three destination recommendations remain the decision output.
- [x] Fit and confidence remain separate.
- [x] Linkwise categories 89/99/109 are ingested as stay supply, not destination truth.
- [x] Stay offers normalize to property entities and stale rows are cleaned on refresh.
- [x] Public stay API exposes no tracking URL and keeps outbound fail-closed.
- [x] Daily feed refresh runs inside Supabase via pg_cron.
- [x] Reusable Travel Web Design skill is versioned in the repo.
- [ ] GitHub CI green.
- [ ] Vercel preview green.
- [ ] Merge to main.
- [ ] Production smoke test: /, /api/recommend, /api/stays.
