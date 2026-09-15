---
name: travel-ai-v34-web-design
version: 2.0.0
purpose: Project-specific design contract for the V34 semantic, psychology-first, cinematic AI travel decision experience.
source_method: MyAgenticTeam web-design-intelligence v1.1.0 + Travel Guru Master Blueprint
---

# V34 Travel AI Web Design

## Business goal
Turn an ambiguous emotional need for a break into a confident travel decision, then a verified 360-degree trip and transparent affiliate handoff.

Primary conversion path:
`free-text need -> adaptive AI discovery -> editable Escape DNA -> date strategy -> semantic destination matching -> 3 distinct escapes -> cinematic destination commitment -> 360 research -> trip story -> stay match -> Escape Book/trailer -> affiliate click`

Commercial inventory is downstream. The product is the decision system.

## Audience and decision stage
The user may know neither destination nor dates. The strongest starting signal can simply be “I need to get away.” The product must reduce overwhelm and uncertainty without diagnosing psychology or exploiting vulnerability.

## Design thesis
The experience should feel like a warm, intelligent travel editor plus a rigorous decision engine. It should never feel like a booking form, OTA result grid, chatbot wrapper or generic AI SaaS dashboard.

Visual principles:
- emotion before transaction;
- one question at a time during discovery;
- progressively reveal evidence only when it matters;
- use photography as decision evidence and desire creation, never decorative filler;
- cinematic motion marks important state transitions, not every scroll;
- keep the core task calm and legible.

Anti-patterns:
- dates as the first mandatory question;
- destination autocomplete as the first interaction;
- hotel search before destination fit;
- fixed 10-question quiz;
- endless destination cards;
- fake AI-thinking percentages;
- generic purple-blue AI gradients;
- fake scarcity, fake ratings or fabricated hotel claims;
- autoplay decorative video that competes with the task;
- heavy 3D where photography/map interaction communicates better.

## Research ledger — V34
- Mindtrip -> conversational discovery + photos/maps/collaboration -> useful because text-only AI feels incomplete -> transfer: rich destination evidence after conversation -> risk: planning utility can dominate emotion -> use selectively.
- Layla -> AI + human-style expertise positioning -> useful because recommendations feel interpreted rather than retrieved -> transfer: explain why a trip fits the person -> risk: standard dates/destination/budget framing -> reject as opening flow.
- Spotify Taste Profile -> user can see and steer how recommendations understand them -> transfer: editable Escape DNA and “not quite” correction -> strong use.
- Netflix personalization -> recommendation confidence comes from multiple signals, not a single category -> transfer: semantic profile + behaviour + destination attributes -> use as model, not visual reference.
- premium editorial travel experiences such as Niarra -> large photography, restrained typography, strong negative space -> transfer: cinematic destination reveal -> use.
- Apple immersive-environment principles -> depth/parallax/motion should make a place feel present, with intent defined before effects -> transfer: subtle photo depth and camera movement -> use with performance guardrails.
- AI trip-planner map interfaces -> map is valuable after candidate narrowing -> transfer: map in destination reveal/360 plan, not as homepage chrome -> use later.

## Foundation
Keep Next.js App Router + TypeScript and the existing hand-owned CSS. Do not introduce a second full UI framework merely for appearance. Add open dependencies only when they solve a named interaction gap.

## Motion hierarchy
1. CSS transitions/keyframes for microinteraction and the first cinematic prototype.
2. Motion for React for functional state transitions once dependency impact is approved.
3. GSAP for one or two signature sequences: destination reveal and long-form Escape Story only after performance proof.
4. HyperFrames for optional rendered/shareable cinematic Travel Trailer after destination commitment; never required for the core web flow.
5. Three.js/R3F only if a spatial world-elimination tool materially improves decision quality.
6. Full reduced-motion equivalent is mandatory.

## V34 page/state architecture
### State A — Feel
Full-screen editorial hero. Primary interaction is one free-text prompt: “What do you need from this escape?” No dates and no destination field.

### State B — Adaptive AI discovery
One question at a time. Questions are selected by expected information gain from bounded travel-decision axes: companions, desired outcome, social energy, novelty, must-have experience and friction tolerance. User never sees internal scores or clinical labels.

### State C — Escape DNA
Human summary plus 4–6 editable labels. Primary action: confirm. Secondary action: “Not quite” and return to free text. This surface borrows the transparency/control principle of modern taste-profile products.

### State D — Time strategy
Three user paths:
- Suggest dates for me;
- I know my dates;
- I am flexible.
When suggesting dates, show multiple concrete windows with a clear trade-off; never imply “best price” without fresh evidence.

### State E — Reality check
Ask only decision-changing constraints such as origin and comfortable total budget. Keep transactional language minimal.

### State F — Semantic research
Show meaningful research state labels, not fake percentages. The system is matching trip shapes, not hotels.

### State G — Three escapes
Exactly three strategically different finalists. Each uses one strong, properly attributed destination photograph, concise explanation, season/access/value context and one honest trade-off.

### State H — Cinematic destination commitment
Selecting a finalist opens a destination-specific reveal with photography, map motion and narrative. This is the “I want to go there” moment and the gate before expensive 360 research.

### State I — 360 trip story
Weather, places, food, local life, logistics, hidden costs, pacing, plan B and evidence. Present as a story, not a spreadsheet itinerary.

### State J — Stay and commercial handoff
Only after destination and neighbourhood fit: one primary stay and two meaningful alternatives. Use original affiliate tracking URL unchanged.

### State K — Ownership/share
Escape Book, optional cinematic trailer, email/save/share and social-decision flow.

## Photography rules
- Prefer authentic destination/stay imagery from licensed or clearly attributable current sources.
- V34 discovery results may use Wikimedia Commons imagery with visible attribution/licence until a first-party destination-media catalog is rebuilt.
- One excellent image per finalist beats a noisy gallery.
- Image quality gate: relevance, resolution, composition, factual integrity and mobile crop.
- Enhancements may improve crop, exposure, denoise and clarity but must not add or materially change property/destination features.
- AI-generated mood visuals must never masquerade as a specific real hotel, view or facility.
- Simulated drone/parallax motion must not be labelled as real drone footage.

## Typography / palette / spatial language
- Dark natural canvas: near-black forest/charcoal, warm sand accents, restrained green depth.
- Editorial serif for emotion and destination names.
- Neutral sans for controls/evidence.
- Large negative space, photographic depth and minimal chrome.
- Avoid glassmorphism everywhere; use translucency only where it reinforces depth over imagery.

## Multilingual
The same canonical travel profile powers EL/EN first. DE/FR/IT/ES remain schema-ready. Do not literal-translate SEO intent or emotionally important copy; localize meaning and search language.

## Conversion psychology
The ethical persuasion sequence is:
`felt need -> recognition -> self-correction -> possibility -> confidence -> ownership -> action`.
Do not sell the vacation at the beginning. Let relevance and evidence create desire.

## Mobile/adaptive rules
- one question per viewport where practical;
- large tap targets;
- no horizontal dependency for core choices;
- destination photography must preserve subject on narrow crops;
- motion must degrade gracefully;
- no cinematic intro that delays the first action.

## SEO/AEO
Problem/season pages enter the same semantic discovery experience with contextual prefill, not separate thin articles. Localized intent is more important than literal translation. Use canonical/hreflang consistency and structured data only when facts support it.

## Measurement
Track:
- semantic_discovery_started
- discovery_question_answered
- escape_dna_confirmed
- escape_dna_corrected
- date_strategy_selected
- date_window_selected
- semantic_match_completed
- destination_chosen
- cinematic_reveal_viewed
- escape_build_started/completed
- escape_shared
- guide_downloaded/emailed
- affiliate_offer_opened

Primary diagnostic: percentage of users who confirm an Escape DNA and then choose one of the three destination finalists.

## Verification checklist
- homepage does not require dates or destination;
- adaptive interview never uses sensitive/clinical profiling;
- user can correct the inferred profile;
- date suggestion is optional and transparent;
- three finalists are genuinely different;
- every displayed photo has a legitimate source/attribution path;
- reduced-motion experience remains complete;
- destination decision remains independent of affiliate economics;
- 360 research starts only after destination commitment;
- exact affiliate tracking URL preserved;
- no fake availability/reviews/events/weather/scarcity;
- production typecheck, strict tests, build and browser screenshots pass before merge.
