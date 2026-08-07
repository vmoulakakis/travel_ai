# Travel AI — Travel Decision OS

Travel decision intelligence for short escapes, optimized first for travelers originating in Greece.

**Promise:** give the system your time, budget and travel intent; receive exactly three realistic trips, understand why they fit, refine the decision, then build a contextual Trip Basket.

This is intentionally **not** a booking clone, chatbot wrapper, merchant directory or affiliate product grid.

## V2 architecture

```text
React / Next.js UI
      ↓
/api/recommend
      ↓
Supabase Travel Intelligence → deterministic feasibility/ranking/diversity
      ↓                                  ↓
seed fallback                         exactly Top 3
                                         ↓
                                DeepSeek explanation
                                         ↓
                                    Trip Basket
```

### Facts → Engine → AI

- **Supabase Travel Intelligence** stores destinations, evidence, route evidence and import audit data.
- **Deterministic engine** owns constraint fit, seasonality, travel effort, budget fit, evidence score and diversity.
- **DeepSeek V4 Pro** is an explanation/reasoning layer, never the source of truth for fares, schedules, stock or affiliate permissions.
- **Commerce** happens only after destination selection and remains fail-closed until affiliate eligibility is verified.

## Supabase

Migrations live under `supabase/migrations`.

Edge Functions live under `supabase/functions`:

- `travel-decision-data` — public, read-only curated travel decision data.
- `ingest-linkwise-travel` — protected Linkwise ingestion.
- `import-travel-csv` — protected CSV ingestion for product feeds, destinations, evidence or raw staging.

Protected ingestion checks a SHA-256 hash stored in the private `app_secrets` table. The raw ingest secret is never committed to GitHub and no Supabase service-role key is required in Vercel.

## CSV import

Open `/admin`, choose a CSV dataset and upload the file. The Vercel route validates the admin secret, then forwards the CSV to Supabase using the server-only ingest secret.

Auto-detection recognizes Linkwise-style product feeds containing `product_id`. Explicit modes also support:

- `destinations`
- `evidence`
- `raw`

Every import creates `import_jobs` and `import_rows` audit records.

## Environment variables

Copy `.env.example` and configure server secrets outside git.

Required for the full production flow:

```text
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_REASONING_EFFORT=high

NEXT_PUBLIC_SUPABASE_URL=https://bgvgstpoypqbjnemqcqp.supabase.co
SUPABASE_DECISION_DATA_URL=https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/travel-decision-data
SUPABASE_INGEST_URL=https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/ingest-linkwise-travel
SUPABASE_CSV_IMPORT_URL=https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/import-travel-csv
SUPABASE_INGEST_SECRET=
CRON_SECRET=
ADMIN_SECRET=
```

`ADMIN_SECRET` is optional; if omitted, the CSV admin route falls back to `CRON_SECRET`.

## Health and operations

- `/api/health` — machine-readable runtime readiness.
- `/admin` — environment readiness and CSV import control room.
- `/api/jobs/linkwise` — Vercel Cron endpoint protected by `CRON_SECRET`.

Vercel sends `Authorization: Bearer $CRON_SECRET` to production cron invocations when the project variable is configured.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without `DEEPSEEK_API_KEY`, recommendations still work in deterministic fallback mode. Without reachable Supabase decision data, the engine falls back to the local destination seed.

## Deployment

1. GitHub PR triggers CI and a Vercel Preview deployment.
2. Verify `/`, `/api/health`, `/api/recommend` and `/admin` in Preview.
3. Merge to `main` only after checks pass.
4. Production cron runs only from the Production deployment.

## Security

- No raw API keys or ingest secrets in git.
- No Supabase service-role key in Vercel.
- Private database tables have RLS enabled and no browser policies.
- Public destination data is exposed only through a constrained read-only Edge Function.
- CSV import and Linkwise ingestion authenticate server-to-server.
- Affiliate CTA remains fail-closed until approval, property, traffic-source, tracking and activity checks pass.
