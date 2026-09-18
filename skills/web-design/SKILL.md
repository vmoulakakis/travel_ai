---
name: travel-ai-v50-web-design
version: 7.0.0-production
purpose: Production art direction and interaction contract for a cinematic, conversation-first, map-native agentic travel intelligence product.
source_method: MyAgenticTeam web-design-intelligence v3 + agent-runtime-2026 + solution-first-product + TravelAI V45 persistent runtime
---

# TravelAI V50 Production Web Design Contract

## Product thesis
TravelAI is not a booking search form and not a travel dashboard. It is an agentic travel intelligence experience.

The user should feel that a highly capable travel expert is:
1. listening;
2. asking the minimum high-value questions needed;
3. understanding hidden travel needs and constraints;
4. searching the real inventory;
5. challenging weak choices when necessary;
6. revealing the strongest real solutions on an immersive map;
7. continuing through itinerary, travel book, email/watch and verified booking handoff.

Core flow:
`conversation -> clarification -> structured traveler state -> V45 reasoning -> live stay verification -> Top 5 -> map exploration -> challenge/compare -> trip build -> booking handoff`.

## Map is the visual hero
The map is the primary visual canvas and must not be demoted to a secondary panel.

Preserve:
- satellite / terrain / standard layers;
- full live stay universe;
- smooth fly-to and fit-bounds behavior;
- persistent map context while interacting with recommendations.

Top-5 solutions use ranked intelligence pins, not generic dots:
- visible rank 1-5;
- fit score;
- active halo;
- hover/focus state;
- contextual solution card;
- visually distinct from ordinary inventory pins.

Ordinary stay inventory stays subtle and dense. Ranked solutions carry visual hierarchy.

## Conversation-first agent UX
The agent is the main decision interface.

Never jump from a vague sentence directly into unrelated destination results.

Use one high-information-gain question at a time when critical context is missing:
- dates;
- companions;
- desired outcome;
- travel friction.

Quick replies may accelerate the conversation, but natural language always remains available.

The agent must:
- retain compact persistent traveler context;
- treat current explicit intent as highest priority;
- challenge a user-selected stay when it is a weak match;
- explain trade-offs without patronizing;
- never fabricate demand, availability, weather, reviews, events or urgency.

The transcript, map and filters are one shared decision state.

## Infographic filters
Travel DNA is an active structured-input layer, not decoration.

Required dimensions:
- calm;
- food;
- nature;
- discovery;
- nightlife / energy;
- value.

Visual treatment:
- compact infographic dials;
- instant visible values;
- slider or drag affordance;
- updates feed the server-side agent state.

## Visual thesis
Premium editorial travel intelligence.

Not:
- SaaS dashboard;
- generic AI gradient;
- giant rounded-card stack;
- booking-site clone;
- heavy purple;
- fake metric theatre.

Use:
- full-screen cartographic/satellite visual field;
- warm ivory editorial surfaces;
- dark mineral green;
- restrained orange/amber intelligence accents;
- serif editorial display typography paired with compact technical sans;
- generous negative space;
- fine borders;
- low-opacity glass only where overlays need separation;
- cinematic hierarchy rather than boxed sections.

## Image standards
Real property/location imagery remains the source of truth.

Never generate a fake hotel and present it as the real property.

Every displayed travel image must use a consistent visual treatment:
- quality gate: reject tiny, severely compressed or obviously broken imagery;
- intentional editorial crop;
- consistent aspect ratio by component;
- cinematic contrast / vignette / tonal treatment;
- readable overlay-safe focal area;
- graceful fallback when no usable image exists;
- circular secondary detail lens ("drone lens") for high-priority solution cards.

The circular lens may use a zoomed/cropped view of the real source image unless a separately licensed aerial image exists. Label it as a visual lens, never as actual drone footage when it is not.

Future AI image enhancement may improve resolution/relighting/crop, but it must preserve factual identity of the real property/location.

## Motion choreography
Motion communicates state changes:
- agent thinking;
- result reveal;
- ranked pin activation;
- map fly-to;
- card focus;
- Travel DNA change.

Use restrained durations and consistent easing.
Respect prefers-reduced-motion.
Do not animate merely to decorate.

## Top 5 contract
Return up to five real, stay-backed solutions.

No filler.
No fake exact-match language.
No result may be shown as bookable without a real offer/tracking URL.

Each solution needs:
- destination;
- real stay;
- fit score;
- why it fits;
- travel effort;
- season context;
- live offer count;
- truthful price signal;
- verified outbound tracking URL.

## Truth and evidence
The server-side agent owns recommendation quality.
The browser never invents recommendation scores.

Current V50 production homepage must use:
- V45 persistent orchestration;
- adaptive V50 conversation state;
- natural-date parsing;
- real stay retrieval;
- availability truth assessment;
- Top-5 cap.

Demand/weather/events/review layers appear only when evidence exists.
The current non-discriminating demand proxy must not be presented as meaningful demand forecast.

## Responsive
Desktop:
- full-screen map;
- floating agent deck;
- floating infographic controls;
- ranked result rail;
- cinematic active-solution card.

Mobile:
- conversation remains first;
- map remains a major stage;
- filters collapse without disappearing;
- result rail becomes horizontal;
- active solution becomes an editorial card below the map interaction;
- no desktop overlay should obscure the composer.

## Production acceptance
- root homepage uses V50;
- all recommendation scoring is server-side;
- V45 persistent agent runtime is active;
- agent asks clarifying questions before matching when needed;
- live map inventory loads;
- ranked pins render 1-5;
- fly-to / fit-bounds stay intact;
- Travel DNA modifies agent state;
- real stay-backed Top-5 is enforced;
- user-selected weak choices can trigger an agent challenge;
- image treatment contract is implemented;
- mobile and reduced-motion contracts exist;
- typecheck passes;
- strict regression suite passes;
- production build passes;
- production deployment is verified before declaring GREEN.


## V50 production art-direction lock
The production homepage must not regress into a dark SaaS form shell. Keep the map/zoom interaction, but the surrounding experience is editorial and cinematic.

Required composition:
- full-bleed real travel imagery before UI chrome;
- conversational agent as a visible, calm decision partner, not a generic chat bubble;
- one high-information question at a time until the brief is sufficiently understood;
- infographic Travel DNA controls write into the same decision state as conversation;
- Top-5 results reveal on the map with ranked pins, active halo, score and hover intelligence;
- the user may explore any stay, but a non-Top-5 choice is challenged rather than blindly validated;
- no fake demand/weather/event metrics.

## Photography standard
Stay and destination photography uses real provider/user-owned source assets as source of truth.
For each displayed image:
1. reject broken, tiny, duplicated, badly compressed or obviously irrelevant assets;
2. choose a focal crop for desktop and mobile;
3. apply consistent cinematic grading through non-destructive presentation treatment;
4. use editorial veil/contrast only to support legibility;
5. add a circular “drone detail” inset only as a crop/detail of the same real source image unless a separately sourced aerial photo is verified;
6. AI enhancement/upscale may improve a real asset, but must not create nonexistent architecture, amenities or scenery and then present it as documentary truth;
7. always retain original source/provider provenance in the data layer.

## Visual QA gate
Before merge:
- screenshot desktop 1440px and mobile 390px;
- confirm first viewport has a clear focal path: feeling -> agent -> map;
- confirm no giant form dominates the page;
- confirm typography has editorial hierarchy and does not resemble generic AI SaaS;
- confirm Top-5 pins remain legible over map/satellite/terrain;
- confirm active result, map focus and agent thread remain synchronized;
- confirm reduced-motion, keyboard interaction and touch targets.
