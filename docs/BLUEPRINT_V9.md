# Ελληνικός AI Travel Guru — V9 Blueprint

Updated: 2026-08-09

## Product promise

The product is not a Corfu site and not a hotel catalogue. It is a Greece-wide decision service for travellers who may not know where to go. It learns the emotional job of the trip, applies hard constraints, compares Greek destinations, challenges weak fits, and presents three meaningfully different choices before any stay appears.

## Core journey

1. **Homepage:** three entries — “I do not know where”, “I have an idea”, “Surprise me”.
2. **Adaptive discovery:** dates, origin, companions, emotional outcome, red line, total budget, travel effort, stay preference and optional natural-language context.
3. **Agent council:** psychologist, explorer, matchmaker, season keeper and skeptic. The UI communicates their useful work without exposing providers, quotas, tokens, stack traces or internal terminology.
4. **Three-choice reveal:** one defended primary recommendation and two alternatives with different roles. Every choice includes a personal reason and an honest trade-off.
5. **Destination story:** cinematic reveal, date context, a four-beat travel rhythm and a clear confidence narrative.
6. **Stay match:** only after destination selection; one primary stay plus two alternatives.
7. **Outbound conversion:** the only external link is the exact Linkwise tracking URL containing `/CD104/`.

## Non-negotiable trust gates

- Production photography comes only from `stay_offers.image_url` or `stay_offers.thumb_url` in Supabase.
- No generated, Wikimedia, Unsplash or Pexels destination photography.
- If no eligible DB image exists, the UI falls back to a branded colour field rather than a fabricated place image.
- Destination ranking uses Greek destinations only (`country_code = 'GR'`).
- Hotel supply, discounts and merchant economics have zero destination-ranking weight.
- Explicit warmth is a hard candidate gate.
- A stay CTA requires `in_stock is distinct from false`, a CD104 URL, a DB image, `valid_from <= trip start`, and `valid_to >= trip end`.
- Feed validity is never described as live room availability. Final room availability and price are confirmed on the destination page reached by the tracking URL.
- No fake scarcity, countdown, ratings, availability, events or price units.

## Data and learning

- `destination_knowledge_v8`: independent destination graph.
- `stay_offers`: Linkwise feed inventory and DB-only media source.
- `match_sessions` and `match_outcomes`: anonymous structured learning signals.
- Tracked outcomes: recommendation impression, destination selection and outbound click.
- Raw conversation text is not stored as training data.
- The neural influence stays disabled until the existing sample and validation gates pass.

## Failure behaviour

- Missing optional language-model output falls back to structured matching.
- Missing evidence lowers confidence; it never creates invented facts.
- Missing eligible stay inventory produces an honest no-offer state with no external CTA.
- Internal provider, quota, token, stack, timeout and database messages never reach the traveller.
- Tracking analytics failure does not block a valid outbound click.

## Required release checks

1. `npm run typecheck`
2. `npm run test:v8`
3. `npm run build`
4. Supabase strict-validity query: every returned row must have CD104, a DB image and full-trip date coverage.
5. Browser: homepage, all three discovery steps, loading council, three results, destination story, three-or-fewer stays, and external CTA.
6. Browser console and Vercel runtime error scan.
7. Verify the final external `href` is an exact DB `tracking_url` and that no other external anchor exists.

## Recovery map

- Source: `github.com/vmoulakakis/travel_ai`, branch `main`.
- Hosting: Vercel project `travel-ai` under `vassilis-projects-3bf8541b`.
- Database: Supabase project `travelai` (`bgvgstpoypqbjnemqcqp`).
- Main UI: `components/travel-decision-experience.tsx` and `app/v8.css`.
- Destination engine: `lib/decision/v8-matcher.ts`.
- Stay validity gate: `get_destination_stays_v8` and migration `20260809001312_strict_full_trip_offer_validity.sql`.
- DB-photo gateway: `app/api/destination-photo/route.ts`.
- Outbound analytics: `app/api/track/route.ts` and `match-learning`.

Any future release must update this file when the user journey, trust gates, data contract or deployment topology changes.
