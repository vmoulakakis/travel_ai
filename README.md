# Travel AI — Travel Decision OS

A production-oriented, seasonal AI travel decision engine for Greek-origin travelers.

**Product promise:** give the system your time, budget and travel intent; receive exactly three realistic escapes, understand why they fit, refine the decision, then build a contextual Trip Basket.

This repository intentionally does **not** implement a generic travel marketplace, booking clone, merchant directory or affiliate product grid.

## Core architecture

1. **Deterministic decision layer** — constraints, seasonality, budget fit, travel effort, evidence score and diversity reranking.
2. **DeepSeek V4 Pro** — server-only interpretation/explanation layer with Thinking Mode enabled. It is not the source of truth for routes, prices, stock or affiliate permissions.
3. **Evidence layer** — every volatile claim is designed to carry source, observation time, validity and freshness.
4. **Commerce layer** — affiliate fulfillment happens only after a trip decision and only after an eligibility gate passes.
5. **Trip Basket** — GET THERE → STAY → PACK → EXPERIENCE → optional PROTECT / CONNECT.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Without `DEEPSEEK_API_KEY`, the app still runs in deterministic fallback mode. Set the key server-side to enable DeepSeek-assisted explanations.

## Required Vercel environment variables

```text
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_REASONING_EFFORT=high
```

Optional persistence / feed ingestion:

```text
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
LINKWISE_TRAVEL_FEED_URL=...
```

> `DEEPSEEK_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only secrets. Never use a `NEXT_PUBLIC_` prefix for them.

## Vercel deployment

1. Import `vmoulakakis/travel_ai` into Vercel.
2. Vercel detects Next.js automatically.
3. Add environment variables in **Project Settings → Environment Variables**.
4. Deploy the branch/PR as Preview first.
5. Merge to `main` for production deployment.

See `docs/VERCEL_DEPLOYMENT.md`.

## Data truthfulness

The first release includes a deliberately small **planning seed** of destinations so the decision engine is functional before live travel adapters exist. Seed budgets and access scores are explicitly marked as estimates in the UI. They are **not live fares**.

The architecture is designed so live/volatile data replaces seed evidence through adapters without changing the UI or ranking contract.

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm start
```

## Security

- No API keys in git.
- Server-only DeepSeek calls.
- Security headers via Next.js config.
- Cron ingestion requires `CRON_SECRET`.
- Supabase service-role key is never exposed to the browser.
- Affiliate CTA is fail-closed until eligibility is verified.
