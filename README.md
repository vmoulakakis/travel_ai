# AI Greece Travel V32 — Destination-First Decision Intelligence

[![CI](https://github.com/vmoulakakis/travel_ai/actions/workflows/ci.yml/badge.svg)](https://github.com/vmoulakakis/travel_ai/actions/workflows/ci.yml)

> Greece-first bilingual AI travel system that decides **which destination fits the traveller before accommodation inventory enters the ranking**.

**Canonical source:** this repository  
**Current public product snapshot:** https://travelaigreece.vercel.app  
**Portfolio:** https://dealora-ai.com/portfolio

> Deployment note: the public snapshot is currently served by the older `travelai_greece` Vercel project. This repository remains the canonical V32 source and should be the target of the next production-lineage consolidation.

## Current architecture

- **Product UI:** V32 multipage application
- **Decision core:** deterministic / agentic destination-ranking lineage through V26+
- **Maps:** product/stay markers with Google Maps when configured and OpenStreetMap fallback
- **Languages:** Greek and English
- **Backend:** Supabase + protected Edge Functions / RPCs
- **Quality:** accumulated strict regression gates + build CI

## Decision flow

```text
Natural-language or structured trip intent
        ↓
Semantic intent normalization
        ↓
Independent Greek destination knowledge
        ↓
Season / effort / duration / budget / traveller-fit constraints
        ↓
Criterion-sensitive ranking
        ↓
Skeptical result audit
        ↓
Diverse destination shortlist + trade-offs
        ↓
User selects destination
        ↓
Geolocated stay / product matching
```

The destination decision is intentionally independent from affiliate inventory. Hotel count, commission, discounts and merchant economics do **not** determine which destination ranks first.

## Why this is not a booking clone

The system separates two decisions that most travel funnels collapse:

1. **Where should this person go?**
2. **What should they book there?**

Destination truth comes from the destination knowledge layer and traveller constraints. Accommodation inventory is evaluated only after the destination survives the decision process.

## Reliability principles

- deterministic hard constraints cannot be overridden by model prose
- unknown inventory is not presented as confirmed availability
- explicit dislikes / non-negotiables can reject a candidate
- semantic interpretation can enrich intent but cannot invent destination facts
- skeptical audit attempts to reject weak recommendations
- fallback map infrastructure preserves the product when a preferred map provider is unavailable
- affiliate economics remain downstream from destination fit

## Main routes

- `/` — Greek product home
- `/en` — English product home
- `/proorismoi` — Greek destination hub
- `/proorismoi/[slug]` — Greek destination guides
- `/en/destinations` — English destination hub
- `/en/destinations/[slug]` — English destination guides
- `/api/recommend/stream` — progressive recommendation stream
- `/api/health` — production-readiness contract
- `/admin` — architecture / readiness surface

## AI/model policy

Structured scoring does not require an LLM. Model calls are reserved for semantic interpretation, skeptical review or genuinely ambiguous cases. Model outputs may not override deterministic eligibility, season, route, inventory or other hard evidence.

This keeps the LLM in the role of **interpreter / critic**, not database and not source of truth.

## Data + learning

Supabase stores destination knowledge, stay inventory, evidence, production-truth checks, learning state and SEO-agent state. Service-role credentials remain server-side.

Learning influence stays bounded and should activate only after sufficient labelled evidence; a weak learned model must not replace deterministic travel constraints.

## SEO/growth layer

The bilingual SEO architecture uses first-party destination data, critical review and EL/EN topical pairing. Guardrails prohibit fabricated search volume, mass low-value pages and automated backlink spam.

## Development

```bash
npm ci
npm run dev
```

## Release gate

Every PR and push to `main` is expected to pass:

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test:strict
npm run build
```

The latest V32 source line includes multipage-app and real stay/product-map regression coverage.

## Portfolio context

AI Greece Travel is the vertical decision product in a wider AI decision-intelligence portfolio:

| System | Role |
| --- | --- |
| [SocialMarket AI](https://github.com/vmoulakakis/Socialmarket) | market evidence and opportunity intelligence |
| [Dealora](https://dealora-ai.com) | consumer buying decisions |
| **AI Greece Travel** | destination decisions |
| [SocialScheduler](https://github.com/vmoulakakis/socialscheduler) | autonomous validated execution |

See [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) for the intended final deployment contract.
