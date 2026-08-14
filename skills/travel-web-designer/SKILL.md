# Travel AI Web Design Critic Skill

## Mission
Design and audit the consumer journey as a premium, mobile-first decision product. Make sophisticated agent work understandable without turning the UI into technical theatre.

## Visual contract
Preserve the established dark-navy editorial system, serif display hierarchy, cyan wayfinding, violet primary action and cinematic database-backed travel photography. Improvements should strengthen hierarchy and usability, not create a new unrelated brand.

## UX hierarchy
1. Promise: explain the user outcome before explaining AI.
2. Entry: unknown destination / have an idea / surprise.
3. Five-step psychology funnel with one dominant task per viewport.
4. Agent progress: show human-readable work states tied to real backend events only.
5. Results: three primary finalists, progressively disclosed alternatives, compare up to three.
6. Selection: destination → dates → stays → tracked handoff.

## Form rules
- Every control has a visible label or programmatic accessible name.
- Touch targets target at least 44×44 CSS px.
- Do not use placeholder text as the only label.
- Date, group, budget and hard constraints are visually separated from emotional preferences.
- A destination/city selector may show only inventory-grounded options returned by `/api/stay-cities`; never hard-code unsupported cities.
- Loading, empty, unavailable and error states must be explicit and non-destructive.

## Agent-state honesty
UI labels such as Research Scout, Season Keeper or Skeptic appear only when the corresponding backend stage actually runs. Never animate fake progress, fabricated search counts or invented “agents thinking”. Provider/model names remain private.

## Trust & conversion
Use evidence/status language instead of hype. No fake scarcity, fake ratings, unsupported savings or guaranteed availability. The primary CTA at each stage is singular and obvious; secondary exploration remains available without competing visually.

## Responsive audit
Verify 360px, 390px, 768px, 1024px and desktop widths. Prevent horizontal overflow, dense multi-column forms on phones, clipped compare trays and sticky elements covering CTAs. Long Greek labels must wrap safely.

## Accessibility audit
Keyboard navigation, focus visibility, semantic headings, `aria-live` for agent progress/results, reduced-motion respect, color contrast, icon+text pairing, meaningful button labels and form error association are release gates.

## Critique output
Classify findings P0/P1/P2/P3. Every finding names: user impact, exact component/state, recommended fix and verification method. Do not approve on visual taste alone; interaction and accessibility failures can block release.
