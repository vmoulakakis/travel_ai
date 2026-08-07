# Stay Intelligence — Linkwise 89 / 99 / 109

## Role in Travel AI

The Linkwise feed is a **stay-supply evidence source**, not destination truth and not a destination-ranking source.

Current observed feed snapshot (August 8, 2026):
- 1,908 offers
- 1,681 normalized property entities after promotion-variant deduplication
- 628 location supply signals
- 14 enabled Travel AI destination candidates, including six domestic candidates with explicit supply mappings

The feed contains hotel / `xenodoxeia` records with product name, address/location, image, coordinates, observed price, validity, demand proxy and tracking URL.

## Data graph

`Linkwise feed → stay_offers → stay_places → destination_supply_signals`

- `stay_offers` preserves offer-level observations.
- `stay_places` normalizes recurring deal variants into property entities using normalized property name + rounded coordinates.
- `destination_supply_signals` aggregates a location label into supply count, observed price distribution, demand proxy, centroid, image and freshness.
- `feed_ingestion_runs` records refresh status and counts.

PostGIS, trigram search, tsvector search and optional vector fields make the graph ready for geo, fuzzy and future semantic retrieval.

## Refresh

`public.refresh_linkwise_stay_intelligence()` fetches the feed server-side with the Postgres HTTP extension, normalizes it, upserts the current graph and deletes stale offers / orphaned places / stale location signals.

`pg_cron` schedules the refresh daily at `02:23 UTC` using job name `travel-ai-refresh-stay-feed`.

This refresh does not depend on Vercel or a browser-exposed service key.

## Decision boundary

Destination scoring remains independent of this supply graph.

Domestic candidates such as Nafplio, Arachova, Thessaloniki, Kalamata, Corfu and Rhodes may use feed supply mappings **after** recommendation, but their season / intent values remain planning heuristics until backed by separate verified evidence.

The required order remains:

`Facts → deterministic engine → Top 3 → AI explanation → selected trip → Stay Intelligence`

## Fail-closed commerce

The read-only `travel-stay-data` function intentionally does **not** return affiliate tracking URLs. It marks returned properties with `outboundEligible: false`.

A tracked CTA must remain hidden until all of the following are verified in the commerce governance layer:
1. program approved,
2. property / site approved,
3. traffic source allowed,
4. tracking verified,
5. offer active / valid.

Unknown means **no outbound affiliate CTA**.
