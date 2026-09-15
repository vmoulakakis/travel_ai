---
name: travel-ai-v34-web-design
version: 2.1.0
purpose: Project-specific design contract for the V34 semantic, psychology-first, visual and cinematic AI travel decision experience.
source_method: MyAgenticTeam web-design-intelligence v1.1.0 + Travel Guru Master Blueprint + September 2026 category research
---

# V34 Travel AI Web Design

## Business goal
Turn an ambiguous emotional need for a break into a confident travel decision, then a verified 360-degree trip and transparent affiliate handoff.

Primary conversion path:
`free-text need -> adaptive AI discovery -> editable Escape DNA -> visual-semantic signal -> date strategy -> semantic destination matching -> 3 distinct escapes -> cinematic destination commitment -> 360 research -> trip story -> stay match -> Escape Book/trailer -> affiliate click`

Commercial inventory is downstream. The product is the decision system.

## Audience and decision stage
The user may know neither destination nor dates. The strongest starting signal can simply be “I need to get away.” The product must reduce overwhelm and uncertainty without diagnosing psychology or exploiting vulnerability.

## Design thesis
The experience should feel like a warm, intelligent travel editor plus a rigorous decision engine. It must not feel like a booking form, OTA grid, chatbot wrapper or generic AI SaaS dashboard.

Core principles:
- emotion before transaction;
- words plus visual choices before destination search;
- one adaptive question at a time;
- dates can be fixed, flexible or proposed by the AI;
- photography is both desire and semantic input, never filler;
- cinematic motion marks important state transitions, not every scroll;
- destination commitment is a distinct “I want to go there” moment;
- evidence and trade-offs remain visible before commercial handoff;
- core task stays calm, legible and mobile-first.

Anti-patterns:
- dates as the first mandatory question;
- destination autocomplete as the first interaction;
- hotel search before destination fit;
- fixed 10-question quiz;
- endless destination cards;
- fake AI-thinking percentages;
- generic purple-blue AI gradients;
- fake scarcity, ratings or review proof;
- autoplay decorative video competing with the task;
- heavy 3D where photography/map interaction communicates better;
- presenting AI-generated or simulated imagery as proof of a real property.

## Research ledger — current V34
- Mindtrip (current 2026 experience) -> starts from conversation, then enriches planning with photos, maps, recommendations and group planning -> transferable principle: AI travel feels complete only when conversation becomes a visual decision surface -> use.
- Expedia/Layla direction after Expedia’s 2026 Layla acquisition -> inspiration, conversational planning, itinerary and booking are converging into one journey -> transferable principle: preserve continuity from desire to actionable trip instead of bouncing users between disconnected tools -> use, but do not copy OTA framing.
- Google AI travel planning/Canvas -> natural-language intent can become an editable travel plan -> transferable principle: progressive refinement beats a rigid booking form -> use.
- premium travel/hospitality editorial interfaces -> full-bleed photography, restrained serif typography and negative space create emotional presence -> transferable principle: use one strong image and deliberate motion rather than gallery clutter -> use.
- generic AI travel dashboards -> chat + itinerary columns are functional but visually transactional -> risk: user feels they are already “planning” before desire is established -> reject as opening experience.
- MyAgenticTeam travel_decision profile -> immersive hero, map-driven discovery, trip-fit quiz, evidence indicators, itinerary and booking actions separated by decision stage -> use as implementation contract.

## Foundation
Keep Next.js App Router + TypeScript and the existing hand-owned CSS. Do not introduce a second full UI framework merely for appearance. Add open dependencies only when they solve a named interaction gap.

## Motion hierarchy
1. CSS transitions/keyframes for microinteraction, photo push/pan and the first cinematic prototype.
2. Motion for React for functional state transitions once dependency impact is approved.
3. GSAP for one or two signature sequences: destination reveal and long-form Escape Story only after performance proof.
4. HyperFrames for an optional rendered/shareable cinematic Travel Trailer after destination commitment; never required for the core web flow.
5. Three.js/R3F only if a spatial world-elimination tool materially improves decision quality.
6. Full `prefers-reduced-motion` equivalent is mandatory.

## State architecture
### A — Feel
Full-screen editorial hero with real/attributed travel photography. Primary interaction: “What do you need from this escape?” No dates and no destination field.

### B — Visual semantic pulse
Offer 3–4 photographic worlds such as sea/light, old town/evening, green/reset and mountain/warmth. Choosing one enriches the semantic brief; it does not choose a destination.

### C — Adaptive AI discovery
One question at a time. Questions are selected by expected information gain from bounded travel-decision axes: companions, desired outcome, social energy, novelty, must-have experience and friction tolerance. User never sees clinical labels or raw internal scores.

### D — Escape DNA
Human summary plus 4–6 editable labels. Primary action: confirm. Secondary action: “Not quite” and return to free text.

### E — Time strategy
Three paths: suggest dates for me, I know my dates, I am flexible. The Date Opportunity Agent may propose calendar windows based on travel rhythm and flexibility, but must not claim live price/weather/availability advantages until those are verified later.

### F — Reality check
Ask only decision-changing constraints such as origin and comfortable total budget.

### G — Semantic matching
Meaningful research-state labels only. Match trip shapes, not hotels. Hard constraints and destination/date fit remain independent from affiliate economics.

### H — Three escapes
Exactly three strategically different finalists. Each needs a strong attributed photograph, concise “why”, season/access/value context and one honest trade-off.

### I — Cinematic commitment
Clicking a finalist does not immediately dump an itinerary. Open a full-screen photographic reveal with restrained camera motion, dates, reason for fit and one explicit CTA: “build this trip”. This is the gate before expensive 360 research.

### J — 360 trip story
Weather, places, food, local life, logistics, hidden costs, pacing, plan B and evidence. Present as a story, not a spreadsheet itinerary.

### K — Stay and commercial handoff
Only after destination and neighbourhood fit: one primary stay and two meaningful alternatives. Preserve the original affiliate tracking URL unchanged and open merchant handoff in a new tab.

### L — Ownership/share
Escape Book, optional cinematic trailer, email/save/share and social-decision flow.

## Photography rules
- Prefer authentic destination/stay imagery from licensed or clearly attributable current sources.
- Wikimedia Commons is allowed as a temporary attributed discovery source while the first-party destination-media catalog is rebuilt.
- Query broadly enough to avoid empty cards, but filter obvious maps/logos/posters/diagrams.
- One excellent image per finalist beats a noisy gallery.
- Hero visuals may be generic travel-mood inspiration; never imply they are the chosen destination.
- Image quality gate: relevance, resolution, composition, factual integrity and mobile crop.
- Enhancements may improve crop, exposure, denoise and clarity but must not add or materially change property/destination features.
- AI-generated mood imagery must never masquerade as a specific real hotel, view or facility.
- Simulated drone/parallax motion must not be labelled as real drone footage.

## Typography / palette / spatial language
- dark natural canvas: near-black forest/charcoal;
- warm sand accents and restrained green depth;
- editorial serif for emotion and destination names;
- neutral sans for controls/evidence;
- large negative space, photographic depth and minimal chrome;
- translucency only where it reinforces depth over imagery.

## Multilingual
EL/EN first, DE/FR/IT/ES schema-ready. Do not literal-translate search intent or emotionally important copy; localize meaning and market language.

## Ethical conversion psychology
`felt need -> recognition -> self-correction -> visual possibility -> timing confidence -> destination ownership -> evidence -> action`

Do not “sell” at the beginning. Relevance, beauty and evidence should create desire without hidden manipulation.

## Mobile/adaptive rules
- one question per viewport where practical;
- large tap targets;
- no horizontal dependency for core choices;
- destination photography preserves subject on narrow crops;
- cinematic reveal must degrade to one strong still on low-motion/mobile contexts;
- no intro animation may delay the first action.

## SEO/AEO
Problem/season pages enter the same semantic discovery experience with contextual prefill, not separate thin articles. Localized intent matters more than literal translation. Canonical/hreflang must remain consistent and structured data must be factual.

## Measurement
Track:
- semantic_discovery_started
- visual_semantic_selected
- discovery_question_answered
- escape_dna_confirmed
- escape_dna_corrected
- date_strategy_selected
- ai_date_window_selected
- semantic_match_completed
- destination_reveal_opened
- destination_chosen
- escape_build_started/completed
- escape_shared
- guide_downloaded/emailed
- affiliate_offer_opened

Primary diagnostic: percentage of users who confirm an Escape DNA and then choose one of the three destination finalists.

## Verification checklist
- homepage does not require dates or destination;
- adaptive interview never uses sensitive/clinical profiling;
- visual choices enrich semantics but do not hard-code destination;
- user can correct the inferred profile;
- date suggestion is optional and does not invent price/weather/availability claims;
- three finalists are genuinely different;
- every displayed destination photo has a legitimate source/attribution path;
- full-screen reveal has a reduced-motion equivalent;
- destination decision remains independent of affiliate economics;
- 360 research starts only after destination commitment;
- exact affiliate tracking URL preserved;
- no fake availability/reviews/events/weather/scarcity;
- production typecheck, strict tests, build and browser screenshots pass before merge.
