# Hidden Greece — Paradise Discovery OS (research + build specification)

**Decision date:** 2026-10-19. **Status:** P0 engine contract and affiliate-safe backend being implemented on a feature branch; **not** a production release. This project is a branded discovery funnel backed by TravelAI's existing Supabase, not a duplicate hotel database.

## One-sentence promise

Discover a little-known **microplace**, learn *why it is worth a trip*, understand the real-world constraints, and create a **1–7 night** stay around it using **only the owner's approved CD104 Linkwise affiliate inventory**, never an arbitrary OTA outbound link.

## Current inventory verified by a read-only Supabase audit on 2026-10-19

- `greece_unseen_places_v1`: **48**, of which **28 labelled verified** (the status is a database assertion, not an independent revalidation); 20 seed-only. All 48 geolocated.
- `greece_unseen_candidates_v1`: **0 at audit**; **1 new, review-only candidate** (`mesoropi-paggaio-waterfall`) written on 2026-10-19 with hiking-club and editorial source links; not promoted to published microplaces.
- `greece_unseen_runs_v1`: **0**; no demonstrated autonomous research cadence.
- `stay_places`: **1,613** with coordinates, **0** with populated stay embeddings.
- `stay_offers`: **1,616** HTTPS Linkwise CD104 tracking URLs (programs 177 and 205); `in_stock` and `availability` are NULL for every observed offer; prices are feed listing observations, **not dated final trip prices**.
- `travel_destination_nodes_v46`: 574 records; knowledge entities V44: 2,357, source evidence: 1,819. Among them 2,305 knowledge-entity, 536 destination-node and 1,067 stay-product knowledge records have **16-dimensional vectors**. These are not proof of neural-network sentence embeddings. Database function `v8_semantic_from_tags` is a **handcrafted 16-tag vector** (not an ML embedding). Verify the actual vector lineage before modeling, and build a separately versioned true multilingual embeddings index after evaluation.
- `travel_agent_profiles_v70`: 8 active role definitions; profiles are **not proof that live agents are running**.

**Risk:** Existing `/guides/hidden-greece` is a 12-item editorial static array with generic Unsplash imagery. It does not yet have a data-driven microplace → verified stay funnel.

## Non-negotiables

1. **Discover first, monetize second.** Do not include offer count, commission, affiliate programs, feed demand proxy, social popularity, or price in microplace discovery ranking. Unusual, beautiful, feasible, source-grounded experiences are the product.
2. **Evidence over virality.** Never say 'nobody knows this place' unless an auditable visibility benchmark exists. A novelty score requires measured mention coverage across a defined corpus, timestamps, locale, entity deduplication, denominator and confidence. Until then, label 'underexplored candidate' rather than inventing scarcity.
3. **Locality truth.** Microplaces have precise coordinates. Accommodation distance initially uses a **straight-line geodesic**, explicitly labelled; road routing must be separately verified, especially in mountainous areas. A nearby hotel on the opposite side of a gorge is **not** automatically a convenient base.
4. **Affiliate only.** Never generate a booking search URL. Return the exact `stay_offers.tracking_url` only when its host is `go.linkwi.se`, path contains `/CD104/`, program is allowlisted, and outbound governance has approved this traffic source/site. Fail closed when unknown.
5. **Honest inventory.** A listed offer is not a confirmed vacancy. `valid_to` is *offer/feed* validity, **not** guaranteed guest stay-date coverage. Feed `price` is an observed offer price, **not** price/night or total trip price without verified product semantics.
6. **No fake photos or star ratings.** Destination photography must be independently location-specific and licensed, with attribution. A '4*' substring in product text is **not** a verified guest rating. Use a branded fallback when no trusted destination image exists. Only map stay coordinates and images sourced from the linked inventory.
7. **Protected nature.** Particularly strict nature reserves, mountain roads and seasonal hazards require source-grounded access and a clear editorial/safety gate. The Frakto *core* is not a tourism destination.

## Discovery pipeline (target architecture, not yet all implemented)

`Public source scouts → source snapshots → candidate entity-resolution → geocoding → dedupe → provenance graph → safety/legal/access verifier → human editorial approval → publication-ready microplace → geo/routing-based stays → trip composer → affiliate handoff.`

### Data/features to ingest (only licensed, permitted collection)

- Official: Visit Greece, municipal/regional tourism, protected-area operator NECCA, public route guidance, official seasonal calendar and weather alerts.
- Independent: walkers' forums and trail reports, Reddit travel questions, quality local blogs, user-reported friction and travel photos with usage rights.
- Geography: settlement GPS, protected-area geofences, legal access points, drive-time routing provider, terrain/elevation, ferries, road restrictions.
- Temporal: national/regional holidays, season and daylight, weather risk, trail accessibility and accommodation offer freshness.
- Commercial **after selecting a place**: normalized stay place + precise coords, affiliate validity, explicit package night count, property quality evidence, observed offer price, confirmed booking availability if an approved API later supplies it.
- Retrieval: pgvector multilingual embeddings, `tsvector` keyword recall, entity/geo joins, evidence-scored RRF (reciprocal-rank fusion), optional cross-encoder reranker. Model metrics and data coverage must be measured before claiming 'neural ranking'. The existing empty stay embeddings need a real backfill job, licensing and same-model index discipline.

### Scoring and gating

**Phase A — hidden place score (no demand):**
- Evidence/provenance confidence (official/field verification, independent corroboration)
- Intrinsic uniqueness of landscape/cultural experience, determined editorially + measured media/facts
- Traveler-fit and desired stay duration
- Seasonal quality and safety/access gating
- Candidate novelty signal **only when measured and calibrated**
- Diversity constraint to avoid recommending 5 nearly identical places

**Phase B — nearest *suitable* stay (not simply nearest):**
1. Correct/credible geolocation + routing viability; inside a region-specific radius.
2. Offer source is CD104 in allowlisted program; valid observation and governance gates.
3. Quality evidence from a verifiable third-party source when authorized; otherwise show **quality not independently verified**.
4. Shortlist fit (family/couple/mobility/pet, available package nights) and deduplicate variants.
5. Price/value **only for known comparable package semantics**; no 'from €/night' extrapolation.
6. Prefer convenience / drive time only when *verified route* exists; haversine is preliminary.

### Funnel

`Explore hidden place → hero case & source evidence → practical reality check → choose nights (1–7) & dates / holiday → itinerary days → map showing microplace and nearest eligible stays → why each stay is convenient and caveats → original CD104 partner link → anonymous outcome event.`

No artificial urgency, fabricated availability, fake discounts, generic destination stock photos or irrelevant hotel recommendations. If no approved hotel exists within the practical radius, say so explicitly and suggest a wider base area without a CTA rather than breaking the affiliate-only rule.

### UX / creative direction (pending Product Design visual selection)

*'Private atlas, not OTA search results.'* Full-width verified place photography where rights permit, editorial typography, cinematic cartographic relief, tiny pin interactions, a dramatic microplace story, a concise trip narrative, and a compact, not overwhelming stay shortlist. Mobile-first, performance budget, WCAG AA contrast, reduced-motion-safe animation. Do not ship new page design until a visual target is selected and reviewed.

## Team roles and ownership

| Role | Deliverable / acceptance gate |
| --- | --- |
| **Research Scout** | Source-grounded candidate dossier, no invented discovery facts. |
| **Geospatial & Safety Agent** | Entity/geocode dedupe; season, protection and road travel caveats; route feasibility verified. |
| **Travel RAG/ML Engineer** | Evidence hybrid retrieval, multilingual evaluation set, no unsupported neural labels. |
| **Stay Intelligence / Affiliate Agent** | Geo-linked, deduped, source-approved CD104 inventory; *unknown availability explicitly labelled*. |
| **Travel Composer** | Honest 1–7 night itinerary with visit sequence, optional locally verified activities. |
| **Product Designer + Web Designer** | Three distinct visual directions, chosen user flow, responsive implementation and QA. |
| **SEO / Editorial** | Original source-linked microplace page, structured data only for supported factual claims, canonical/hreflang, internal links, measured indexing. |
| **QA + Security** | Invalid coordinates/URL tests, no nonaffiliate outbound, dates & night-package mismatch, empty inventory, access restrictions, accessibility, load/SEO/mobile smoke tests. |
| **PM / Orchestrator** | P0/P1/P2 gated handoffs, maintain one issue tracker and acceptance checklist. |

## Research leads — 2026-10-19 (not independently proven obscure)

| Lead | Evidence | Next validation |
| --- | --- | --- |
| **Μεσορόπη / Παγγαίο** — **NEW** (absent from 48 unseen places) | Local hiking society https://www.eoskavalas.gr/ ; official-ish regional https://www.visitkavala.gr/sightseeing/paggaio/ ; traveller discussion https://www.reddit.com/r/GreeceTravel/comments/1u6b3uc/underrated_greece_destinations/ | Exact POI/access, official trail updates, image licence, curated stays with roads and affiliate approval. |
| **Θεοδώριανα / Σούδα** — existing verified-marked | https://www.visitgreece.gr/en/experiences/nature/lakes-lagoons/waterfalls-of-tzoumerka | Short foot trail sourced (~1km, 15–20 minutes), alpine-road feasibility and real nearby lodging. |
| **Ηλιοχώρι / Μπάλτα ντι Στρίγκα** — existing verified-marked | https://www.visitgreece.gr/en/experiences/nature/lakes-lagoons/waterfalls-balta-di-striga | Official moderate-access trail; compare true road distance to affiliate offers rather than merely straight-line proximity. |
| **Παρανέστι / περιφέρεια Φρακτού** | https://necca.gov.gr/protateuomenes-perioxes/dasos-fraktou/ | Exclude absolute-protection core and validate legal outside access before publishing. |

### P0 acceptance gates

- [x] Inventory and source-code audit (read-only).
- [x] Research lead with mountaineering-club and independent editorial source; new candidate added as `status=candidate` in the **research staging table**, never falsely marked published.
- [x] Draft PR #101 implements read-only API and a standalone GitHub Actions job, with successful strict TypeScript and `npm run test:hidden-greece` smoke gate (2026-10-19).
- [ ] Legacy repo-wide CI is red due to an existing V8 electric-car request validation assertion; this separate gate does **not** clear repo-wide CI.
- [ ] Staging API runtime and end-to-end browser smoke with configured environment.
- [ ] Stay-to-place road-access checks; affiliate commercial approval of programs 177/205.
- [ ] Product Design three visual choices selected by owner; full page conversion.
- [ ] Real licensed photos and auditable originality evidence.
- [ ] Controlled production deployment, mobile accessibility / performance, conversion event sanity.

### P1/P2

P1: candidate ingestion + provenance + source monitor, pgvector backfill and retrieval evaluation; calendar/holiday trip composer; real routing; affiliate conversion tracking. P2: advanced novelty/content saturation measurements, user preference learning with consent, neural reranking after offline quality evaluations, multilingual guides and PWA map storytelling.

## KPI scorecard

- Discovery: % source-grounded and geographically valid; % novel entities (carefully benchmarked); editorial rejection reason mix.
- Conversion: microplace → itinerary opens, microplace → stay shortlist, stay shortlist → verified affiliate outbound click; event tracking with consent.
- Safety/trust: false availability 0, unlicensed media 0, incorrect affiliate URLs 0, inaccessible protected-area recommendations 0.
- User quality: 'would actually go', travel feasibility, satisfaction with stay proximity and credible logistics.

**Launch criterion:** one end-to-end trip (1 night, weekend, holiday, 1 week) tested with real destination, appropriately nearby *authorized* stay, truthful price caveats and exact CD104 tracking href, plus geo & SEO gates. Avoid deploying a demo that suggests fictional functionality.

## Follow-up after CI and affiliate offer audit (2026-10-19)

- Independent GitHub Action **Hidden Greece — Discovery Safety** passed typecheck and dedicated tests. Separate global CI has an unrelated V8 matcher assertion failure. Treat merge/deploy as blocked until repository main suite is green.
- Observed the closest straight-line stays around the new Mesoropi lead are Ofrinio/coastal offerings; they are not automatically credible mountain bases. Several deals explicitly apply to **April–October 2027**, not October 2026. The engine now parses singular/plural `Διανυκτέρευση/Διανυκτερεύσεις` plus `dd/mm/yyyy έως dd/mm/yyyy` deal ranges and prevents mismatched advertised packages. None of this proves live vacancy.
- For supplier offer quality, road drive feasibility and genuine third-party guest rating require independent authorized sources, not property name prefixes such as '4*' or an AI-made rating.
