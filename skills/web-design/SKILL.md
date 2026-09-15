---
name: travel-ai-v33-web-design
version: 1.0.0
purpose: Project-specific design contract for the V33 psychology-first AI holiday funnel.
source_method: vmoulakakis/Myagenticteam skills/web-design-intelligence v1.1.0
---

# V33 Travel AI Web Design

## Business goal
Turn an ambiguous need for a break into a confident destination decision, then into a verified 360° escape and finally an outbound affiliate action.

Primary conversion path:
`date opportunity -> emotional need -> 3 matched destinations -> choose destination -> choose stay -> build 360 escape -> save/share/email -> affiliate click`

The commercial CTA must remain downstream of destination and trip fit.

## Audience and decision stage
Users are not assumed to know a destination. They often know only time available, budget, companions and how they want to feel. The UI therefore optimizes for decision confidence, not search density.

## Design thesis
The experience should feel like a calm premium travel concierge, not a booking engine and not a generic AI dashboard. Use cinematic hierarchy, authentic travel imagery, strong editorial typography and visible evidence/trade-offs. Motion should make narrowing and state changes understandable.

Anti-patterns:
- hotel search as the first interaction
- giant card grids
- fake urgency/countdowns
- generic AI purple-gradient SaaS design
- decorative 3D that slows mobile
- stock imagery unrelated to the chosen destination
- outbound affiliate CTA before the trip has been evaluated

## Foundation
Keep the current Next.js App Router + TypeScript stack. Do not introduce a second full UI system during V33 migration. Existing hand-owned CSS is acceptable; future component expansion may use shadcn/Base UI where it materially improves accessibility and maintainability.

## Motion hierarchy
1. CSS for hover/focus/micro-transitions.
2. Motion for React only when functional state transitions require it.
3. GSAP only for one or two signature cinematic sequences after performance proof.
4. Three.js/R3F only if a world-elimination map becomes a real decision tool, not decoration.
5. Respect `prefers-reduced-motion` and keep the full funnel usable without animation.

## Exact V33 page architecture
### Homepage
1. cinematic promise: “You do not need to know where you want to go”
2. date opportunity selection
3. human need / psychology selection
4. only decision-changing constraints: origin, group, budget, free text
5. visible agent investigation state
6. exactly three final escapes
7. “Build this escape” as the commitment CTA

### Escape route
1. chosen destination and dates
2. stay/base candidates that cover the full date range
3. explicit “Build my escape” trigger
4. weather and date truth
5. verified web research / what matters
6. food/local-life evidence where configured
7. practical warnings and non-hotel budget
8. share/save/email surface
9. affiliate tracking URL only after the trip has been evaluated

## Imagery rules
- Prefer authentic destination/stay media from verified current sources.
- Run quality/relevance selection before display.
- Avoid image mosaics that create noise.
- One strong hero image is better than six weak thumbnails.
- Enhancement must never materially falsify a property, beach, room, view or place.
- Simulated parallax/drone-style movement must not be represented as authentic drone footage.

## Typography and spacing
- Editorial serif for destination emotion and major headings.
- Neutral system/sans for controls, evidence and utility copy.
- Strong negative space and large type at decision moments.
- Compact evidence labels and clear hierarchy on mobile.

## Conversion psychology
Use progressive commitment:
1. low-cost choice: when can I go?
2. emotional self-identification: what do I need?
3. small commitment: choose one of three escapes
4. investment: build the 360 trip
5. ownership: save/share/email the Escape Book
6. commercial action: open current provider offer

Persuasion must come from relevance, confidence, loss-of-friction and social decision support; never from deception.

## Mobile/adaptive rules
- one-handed choices
- no horizontal scrolling for key comparisons
- no cinematic asset that blocks first interaction
- image and motion payloads must be adaptive
- offer/action buttons remain readable without sticky overlays covering content

## SEO/AEO
Problem pages should behave as interactive solvers, not thin articles. Localized search intent is more important than literal translation. Use semantic headings, concise answer blocks, structured data only when facts support it, and canonical/hreflang consistency.

## Accessibility/performance
Target WCAG 2.2 AA. Visible focus, semantic buttons/labels, keyboard flow, reduced motion and meaningful alt text are mandatory. Maintain Core Web Vitals discipline; cinematic presentation must not justify oversized blocking media.

## Measurement
Track at minimum:
- funnel_started
- date_window_selected
- travel_need_selected
- recommendations_completed
- destination_chosen
- escape_build_started
- escape_build_completed
- escape_shared
- guide_downloaded
- guide_emailed
- affiliate_offer_opened

North-star diagnostic: percentage of completed recommendation sessions where the user chooses one of the three escapes.

## Verification checklist
- first-time promise understandable in <=5 seconds
- three finalists, not endless results
- destination choice remains independent from affiliate economics
- 360 research happens after destination commitment
- explicit uncertainty and data-source truth
- exact affiliate tracking URL preserved
- outbound opens in a new tab with sponsored/nofollow/noopener
- email requires explicit user entry
- no fake availability, reviews, events, scarcity or weather
- mobile and reduced-motion flows remain fully usable
- production typecheck/tests/build pass before merge
