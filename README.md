# AI Greece Travel V29

Greece-first bilingual AI travel decision platform built with Next.js, Supabase and a deterministic/agentic recommendation engine.

## Current production architecture

- **Product UI:** V28
- **Decision engine:** V26
- **SEO/growth layer:** V29
- **Languages:** Greek (`/`) and English (`/en`)
- **Destination model:** destination-first; accommodation is evaluated after destination fit
- **Backend:** Supabase + protected Edge Functions/RPCs
- **Hosting:** one supported path — GitHub `main` -> Vercel `travel-ai`

## Core product flow

```text
Natural-language or structured trip intent
  -> semantic intent normalization
  -> Greek destination knowledge
  -> season / effort / duration / budget / traveller-fit checks
  -> criterion-sensitive shortlist
  -> skeptical result audit
  -> destination comparison
  -> user selects destination
  -> geolocated stay matching
```

The recommendation engine is intentionally independent from affiliate inventory. Hotel count, commission, discounts and merchant economics do not determine which destination ranks first.

## Main routes

- `/` — Greek AI Greece Travel home
- `/en` — English home
- `/proorismoi` — Greek Greece-destination SEO hub
- `/proorismoi/[slug]` — Greek destination guides
- `/en/destinations` — English Greece-destination SEO hub
- `/en/destinations/[slug]` — English destination guides
- `/api/recommend/stream` — progressive V26 recommendation stream
- `/api/health` — production readiness
- `/admin` — admin/architecture view

## V29 SEO growth agent

The weekly SEO agent builds Greek and English Greece-travel opportunities from first-party destination data, applies a critical AI review through the existing model router, stores the review/opportunity queue in Supabase, maintains bilingual topical architecture and produces legitimate editorial link-earning ideas.

Guardrails:

- no fabricated search volume
- no mass low-value AI pages
- no paid dofollow backlink schemes
- no automated directory/comment backlink spam
- human review for new indexable editorial content
- hreflang and internal-link pairs across EL/EN destination pages

## AI/model policy

Structured scoring does not require an LLM. Model calls are reserved for semantic interpretation, critical review or genuinely ambiguous cases. The existing router prefers cheaper/free paths where configured and only escalates when needed.

Model outputs cannot invent destination facts or override deterministic hard constraints.

## Supabase

The application uses Supabase for destination knowledge, stay inventory, evidence, production-truth checks, learning data and SEO-agent state. Service-role credentials remain server-side.

Copy `.env.example` for the current environment contract. Never expose private model keys or Supabase service-role credentials through `NEXT_PUBLIC_*` variables.

## Development

```bash
npm ci
npm run dev
```

## Release gate

There is one CI workflow and one production branch. Every pull request and every push to `main` runs:

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test:strict
npm run build
```

`test:strict` includes the accumulated V8-V26 recommendation regression gates plus the V29 bilingual SEO-agent regression test.

## Deployment

Only `main` is allowed to deploy to production. `vercel.json` disables branch deployments for every other branch.

Supported production path:

```text
GitHub main -> CI -> Vercel travel-ai -> production alias
```

Do not create additional hosting providers, temporary production projects, bootstrap deployments or alternate deployment pipelines.

See [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) for the final release checklist.
