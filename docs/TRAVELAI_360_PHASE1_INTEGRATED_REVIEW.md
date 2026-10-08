# TRAVELAI 360 / GREEK ESCAPE BOOK — Integrated Phase-1 Review Build
Status: first reviewable implementation, NOT final release. 2026-10-08.

## One product; keep prior decisions
**Discovery layer:** true-location, licensed cinematic media, no fabricated scenes; performant mobile-first intro; default 50 nationally spread AI-highlighted inventory pins with distinctive visual glyphs; all inventory available on demand; accessible hover and focus. Current Top 50 are **stay candidates** and must never be misrepresented as reviewed experience POIs.

**Knowledge layer:** canonical TravelAI 360 Knowledge Fabric domains: Geospatial, Temporal, Experiences, Stays, Traveler Intelligence, Evidence/Trust. Reuse existing Supabase, V44 knowledge graph, V45 orchestration, and stay inventory; extend not replace. Experience coverage is incomplete and 384d dense travel embeddings are not yet backfilled. GitHub PR #91 carries isolated shadow-schema/training preparation; it is **not active on production**.

**Intelligence layer:** traveler explicit intent overrides all AI priors. Origin != destination. Fixed trip dates never move automatically. Offer optional alternatives only for flexible dates AND verified date-specific weather/event evidence. Missing partner data (ratings, attractions, food, events, availability) must not cause fake factual claims or negative persuasion; omit unsupported cards, show truthful uncertainty only where essential to booking.

**Escape Book:** experience-first itinerary with real places, durations, routing, food, hidden gems, stay fit, contextual adjustments; editable/savable/shareable with QR on booking handoff to user's approved affiliate tracking URL. No replacement of booking links with uncontrolled third-party links; visible destination content may cite authorized noncommercial sources. QR booking feature remains incomplete; do not label it done.

**Conversion:** CTA from cinematic discovery -> 50-map hover -> AI conversational preference understanding -> 3 coherent journeys -> contextual itinerary -> trust-first booking. No invented urgency. SEO: semantic destinations, verified provenance, locality structured data, image ALT, fast LCP and movie fallback.

## Phase-1 acceptance / review
1. Open cinematic homepage on mobile and desktop; if no licensed drone asset configured display graceful scenic-image fallback. Source and license verification required before enabling video URL.
2. Default map shows at most 50 diversified real stay candidates and visibly offers all inventory; verified-rating hover is opportunistic, with no invented reviews.
3. Hover panels show useful price, location, fit metrics and disclose stock uncertainty.
4. Verify origin!=destination, fixed dates unchanged; explicit dates reach agent from Escape Book branch when merged; avoid claiming feature in current live phase.
5. Real API error/empty states must not silently invent results.
6. Source and licensing check for each media, accessibility focus, mobile performance, funnel conversion analytics.
7. CI build + browser smoke + API smoke before merge to main. Phase-1 preview only until review feedback.

## Separate existing development tracks to reconcile after review
- PR #90: Greek Escape Book frontend and itinerary entry; not automatically merged to this branch.
- PR #91: Knowledge Fabric, shadow embedding corpus and research pipeline; not activated or backfilled.
- PR #92: current cinematic Top-50, distinctive map pins, rich hover and date guardrails.
Before consolidation, reconcile file diffs against latest main, consolidate engine contracts and create one integration branch. Do not advertise all branches as a unified runtime until merged/tested.

## Review questions
Does the hero feel genuinely cinematic? Are Top 50 pins geographically sensible? Are mouseovers actually informative? Is the AI journey natural? Which non-hotel experiences are most urgently missing? Does booking handoff stay transparent? Review, log defects, then iterate.
