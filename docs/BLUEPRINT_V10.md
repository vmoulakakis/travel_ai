# Ελληνικός AI Travel Guru — V10 Blueprint

Updated: 2026-08-09

## Product promise

The product is a Greece-wide decision service, not a Corfu site and not a hotel catalogue. It learns why the traveler needs the trip, separates hard requirements from softer desires, evaluates the active Greek destination graph and gives six meaningfully different paths: three finalists plus three optional alternatives.

## Complete journey

1. **Homepage:** “I do not know where”, “I have an idea” and “Surprise me”, plus a rotating AI Pick of the Week grounded in the live Greek catalog and an eligible database photograph.
2. **Five-step psychology funnel:** origin/dates/party; emotional outcome/energy; social rhythm/novelty/pace; hard must-have/red line/effort; group budget/stay style/date flexibility/free text.
3. **Decision team:** intent interpreter, catalog explorer, deterministic matchmaker, season and weather checker, skeptic verifier and two independent advocates. Internal providers and failures never appear in consumer copy.
4. **Six-choice reveal:** three finalists and three progressively disclosed alternatives. Every result has fit status, personal reason, season note, travel effort and explicit trade-off.
5. **Comparison:** compare up to three destinations on season, effort and sacrifice, then choose one path.
6. **Destination story:** defended verdict, date windows, a four-beat trip rhythm and useful place context.
7. **Conversion funnel:** visible path from destination → dates → stay → final handoff. Stays appear only after destination selection.
8. **Outbound conversion:** the only user-facing external link is an exact feed tracking URL containing `/CD104/`.

## Matching contract

- Candidate set: active `country_code = 'GR'` rows from `destination_knowledge_v8`.
- Hard gates run before ranking: explicit warmth, island-only and sea/nature/culture/nightlife must-have.
- Group budget is normalized by travelers and nights; it is not treated as a solo nightly budget.
- Soft scoring combines travel intent, season, effort, duration, budget posture, weather, traveler fit and crowd/social fit.
- A considered destination receives only a bounded boost and only when season and budget remain viable.
- Diversity penalizes repeated region groups and near-identical travel characters.
- Language models may parse free text, check an ambiguous shortlist and explain evidence. They may not invent candidates, prices, availability, ratings, routes or facts.
- If criteria conflict, the response is labelled as mixed or compromise instead of claiming a perfect fit.

## Weekly pick contract

- Select an upcoming four-night Friday window.
- Rotate eligible Greek destinations by calendar week instead of hard-coding one island.
- Require a current full-trip-valid stay image before showing the pick.
- Show one evidence-grounded reason and one honest risk.
- Treat the pick as a funnel starting point; still run the traveler through their own hard and soft criteria.

## Trust and outbound gates

- Production photography comes only from `stay_offers.image_url` or `stay_offers.thumb_url` in Supabase.
- No generated, Wikimedia, Unsplash or Pexels destination imagery is used in the live product.
- Missing imagery falls back to the branded visual field without claiming to depict a place.
- Destination ranking is independent of stay supply, discount, demand, affiliate economics and offer count.
- A stay CTA requires non-false stock, a DB image, exact `/CD104/` tracking URL, `valid_from <= trip start` and `valid_to >= trip end`.
- Feed validity is not room availability. The final room and price are confirmed only on the destination page reached through the tracking URL.
- No fake scarcity, countdowns, star ratings, events, prices, popularity claims or urgency.

## Anonymous learning and KPIs

- `match_sessions` stores the anonymous structured feature vector and constraints.
- `match_outcomes` stores impressions for all six recommendations, destination selection, offer viewing and outbound click.
- Model version: `v10-destination-ranker`.
- Raw conversation text and personal identity are not stored for model learning.
- Neural influence remains disabled until the existing sample-size and validation gates pass.
- Primary product KPIs: funnel-start rate, step completion by stage, recommendation reveal rate, extra-options reveal rate, comparison use, destination selection, valid-offer coverage, outbound rate after selection, time to confident choice and compromise-rate by constraint combination.
- Guardrails: duplicate-result rate, hard-constraint violation rate, invalid-date offer rate, non-CD104 outbound rate, no-offer honesty rate and visible-error leakage rate.

## Failure behaviour

- Optional language-model failure falls back to deterministic structured matching.
- Missing evidence lowers confidence and never creates invented facts.
- Fewer than three viable candidates returns a safe, user-friendly recovery state.
- Missing eligible stays produces an honest no-offer state with no external CTA.
- Provider, quota, token, stack, timeout and database details never reach the traveler.
- Analytics failure never blocks a valid outbound click.

## Required release checks

1. `npm run typecheck`
2. `npm run test:v8`
3. `npm run test:v9`
4. `npm run test:v10` — 100 scenarios and 760 acceptance checks
5. `npm run build`
6. Supabase strict-validity query: all surfaced offers cover the full date range, include a database image and use `/CD104/`.
7. Browser: homepage, weekly pick, all five funnel stages, agent progress, six results, more-results toggle, comparison, destination story, stays and final outbound handoff.
8. Verify no consumer external anchor exists outside exact tracking URLs; scan browser console and Vercel runtime errors.

## Recovery map

- Source: `github.com/vmoulakakis/travel_ai`, branch `main`.
- Hosting: Vercel project `travel-ai` under `vassilis-projects-3bf8541b` (`prj_kdR7ALi7Z1zETL1GcD98t3SFLESA`).
- Database: Supabase project `travelai` (`bgvgstpoypqbjnemqcqp`).
- Main UI: `components/travel-decision-experience.tsx` and `app/v8.css`.
- Homepage weekly pick: `lib/decision/weekly-pick.ts`.
- Destination engine: `lib/decision/v8-matcher.ts`.
- Scenario suite: `scripts/v10-scenario-suite.ts`.
- Stay validity gate: `get_destination_stays_v8` and migration `20260809001312_strict_full_trip_offer_validity.sql`.
- DB-photo gateway: `app/api/destination-photo/route.ts`.
- Outbound analytics: `app/api/track/route.ts` and Supabase Edge Function `match-learning`.
- Analytics authentication: Vercel `SUPABASE_MATCH_LEARNING_SECRET` matches only the SHA-256 stored as `app_secrets.name = 'match_api_v9'`. Never store the raw secret in source or documentation.

Update this blueprint whenever the journey, decision contract, trust gates, data contract or deployment topology changes.
