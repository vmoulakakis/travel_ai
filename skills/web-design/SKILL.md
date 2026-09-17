---
name: travel-ai-v45-holiday-finder-web-design
version: 6.1.0
compatibility_alias: travel-ai-v44-web-design
purpose: Premium animated AI Holiday Finder workspace that converts natural travel intent into real offer-backed holiday matches, then into an evidence-aware stay and 360° trip flow.
source_method: MyAgenticTeam web-design-intelligence + agent-runtime-2026 + solution-first-product + live TravelAI offer/product evidence + current category research
---

# TravelAI V45 Holiday Finder — Web Design Contract

## Canonical status
This is the project-local design contract for the active redesign. Historical V38/V40/V44 documents remain useful only where they do not conflict with this contract.

Stable runtime interfaces:
- semantic discovery: `/api/escape/discovery`;
- real offer/inventory matcher: `/api/escape/solve-v42`;
- stay workspace: `V40StayWorkspace`;
- public initial choice surface: up to **3** defensible matches.

The home surface is `V45HolidayFinder`.

## Product objective
The product is an **AI Holiday Finder from our real offer products**, not a destination blog, generic OTA form, or AI technology showcase.

Primary path:

`natural holiday need -> max 2 useful clarifications -> inline trip frame -> live offer search -> up to 3 offer-backed holiday matches -> one choice -> stay/360 trip -> disclosed provider handoff`

An affiliate click is downstream of confidence. It is never the ranking objective.

## 2026 research digest — @WEB-DESIGN-INTELLIGENCE
The research pass focused on mechanisms rather than copying visual trade dress.

### KAYAK Ask AI / AI Mode — adapt
Observed mechanism:
- natural-language planning starts in chat;
- travel search results update live beside the conversation;
- AI does not replace the useful result surface.

Transferable principle:
**conversation and actionable inventory should coexist in one workspace.**

### Mindtrip — adapt
Observed mechanism:
- chat is connected to a visual planning workspace;
- photos, maps, recommendations and itinerary context make the answer actionable;
- the conversation is persistent rather than a temporary hero gimmick.

Transferable principle:
**the agent should feel embedded in the product surface, not bolted on above it.**

### Airbnb 2026 AI comparison/highlights — adapt
Observed mechanism:
- AI summarises the attributes that matter to the traveller;
- comparison is embedded in the decision flow;
- AI is used to reduce reading and comparison burden.

Transferable principle:
**AI earns trust by reducing decision work around real inventory.**

### Expedia Romie — adapt
Observed mechanism:
- assistant spans dreaming, planning, shopping and disruption handling;
- memory and recovery are part of the assistant value proposition;
- the system should remain useful when the first plan fails.

Transferable principle:
**a travel agent must recover from an empty path instead of returning the user to a filter wall.**

### Layla / current bookable AI planner pattern — adapt cautiously
Observed mechanism:
- plain-language intent leads toward bookable itinerary components;
- live price/inventory grounding creates conversion confidence.

Transferable principle:
**planning value and booking evidence should converge without fabricating certainty.**

## Rejected patterns
- dark cinematic AI splash as the dominant product experience;
- neon/aurora “AI theatre”;
- a hero that disappears into a cheap traditional form;
- standalone practical-step pages;
- error copy that tells the user to manually adjust dates/budget and retry;
- fake live counters, fake scarcity, fake agent metrics;
- destination-first search as the mandatory entry point;
- generic SaaS dashboard card walls;
- long questionnaires before showing value.

## Art-direction thesis
TravelAI should feel like a **high-end Mediterranean travel studio fused with a modern AI workspace**: bright, calm, tactile, intelligent and alive.

Visual grammar:
- warm paper / pale sand foundation;
- sea-mist and mineral surfaces;
- deep blue-green ink;
- Aegean teal as action/intelligence signal;
- restrained coral warmth;
- editorial serif for emotion;
- modern sans for interaction/evidence;
- large real travel photography with editorial cropping;
- translucent paper/glass only where it creates depth;
- asymmetric image stacking rather than generic three-card grids;
- visible motion that explains state change.

The design should evoke **anticipation of travel**, not “software dashboard”.

## Signature layout — persistent split workspace
Desktop should default to:

`conversation rail | live offer / visual canvas`

The left rail owns intent, clarification, trip frame, reasoning summary and recovery. The right canvas owns imagery, matching progress and offer-backed results.

Do not route the user through five visually unrelated full-screen pages. State transitions should feel like one continuous intelligent session.

Mobile becomes one deliberate vertical flow: conversation first, live canvas/results second.

## Funnel architecture
### 1 — Natural holiday need
First viewport communicates within seconds:
- “tell me the holiday you need”;
- the agent searches real offer products;
- no filter maze is required.

Primary interaction is a large conversational composer. Prompt chips prefill realistic briefs.

### 2 — Adaptive clarification
Ask only a question with material information gain. Maximum two additional questions.

Questions feel like a travel advisor conversation, not a survey.

### 3 — Inline trip frame
Origin, dates, budget and traveller group appear as a compact editable object **inside the ongoing conversation workspace**.

Never label this as a separate “practical step” or create a low-value form screen.

### 4 — Live offer solve
During real backend work, keep the user in the same workspace and animate meaningful states:
- intent understood;
- scanning real offers;
- ranking defensible matches.

Progress labels must correspond to actual runtime stages. Never display invented row counts before the result arrives.

### 5 — Results
Present the strongest real matches, up to three. Internal candidate sets can be larger.

Each result prioritises:
- destination;
- real property/offer;
- match score;
- concise grounded reason;
- matched signals;
- positive feed price only when present;
- relevant distance/evidence state;
- internal next action.

Source product identity remains traceable in runtime but does not need to become ugly consumer-facing metadata.

## Automatic recovery contract
An AI holiday agent must not fail like a static search form.

If the exact requested date window yields no defensible result:
1. keep the same intent/profile;
2. transparently test nearby future date windows;
3. return the closest verified window if one exists;
4. clearly disclose that the dates moved;
5. never silently alter budget, must-haves or traveller type;
6. never fabricate inventory to reach three cards.

If multiple nearby windows also fail, the agent may offer a one-click wider search while retaining the brief. Do not tell the user to rebuild the request manually.

## Offer-first intelligence contract
The visible product can state that recommendations are derived from the user brief and real offer inventory because the active solver supports:
- `source_product_id`;
- property name and feed imagery;
- persistent product semantic vectors;
- semantic text/tags;
- traveler fit;
- value score;
- location score;
- evidence score;
- exact tracking URL;
- inventory count.

UI copy must not imply the model invented or independently verified feed fields.

## Motion system
Motion is required for this product, but every animation must have a named job.

### Required motion jobs
- **panel transition:** orient when conversation state changes;
- **image drift:** maintain travel emotion without stealing attention;
- **floating media:** create editorial spatial depth;
- **scan line:** communicate real matching state;
- **skeleton shimmer:** communicate pending inventory output;
- **staggered result reveal:** make ranking legible;
- **hover/focus elevation:** show selectable/active offers.

Default implementation hierarchy:
1. CSS keyframes/transitions;
2. Motion for React only if state/layout choreography later requires it;
3. GSAP only for justified complex sequences;
4. no 3D/WebGL by default.

`prefers-reduced-motion` must collapse animation without reducing content or functionality.

## Information hierarchy
The visitor should understand, in order:
1. this finds a holiday for me;
2. it searches real offers rather than generic ideas;
3. what I should say;
4. what the agent understood;
5. what dates/budget apply;
6. what the agent is doing now;
7. which matches survived;
8. why each fits;
9. whether the date window changed during recovery;
10. the next action.

## Truth and commerce rules
Never fabricate availability, room inventory, final trip price, ratings, reviews, customer counts, urgency, scarcity, savings, certifications, transport facts or weather.

**Positive feed price** is a price signal, not automatically a nightly or total-trip price. Blank/null/zero/negative prices remain unknown.

Exact affiliate `tracking_url` remains unchanged. **Commercial payout cannot lift traveller fit.** Commission, EPC or merchant economics must not promote an otherwise weaker holiday match.

## Media
- use sourced high-resolution travel imagery;
- property imagery must come from feed/provider evidence;
- imagery supports trust and desirability but never hides task completion;
- initial canvas can use sourced destination imagery;
- result cards use the actual offer image where available;
- mobile simplifies imagery when necessary for speed;
- never synthesise a fictional image of a real stay and present it as evidence.

## Typography
- emotional headings: editorial serif with strong Greek glyph quality;
- UI/evidence/body: modern sans;
- tight but readable display tracking;
- compact uppercase micro-labels only for hierarchy;
- avoid shouting with all-caps section headlines;
- keep body line lengths controlled.

## Mobile
At phone widths:
- navigation simplifies;
- composer CTA becomes full width;
- prompt chips can horizontally scroll;
- questions become one column;
- inline trip frame becomes a 2-column/1-column grid;
- live canvas follows the conversation rather than preceding it;
- results become vertically scannable;
- no horizontal overflow;
- primary touch targets remain approximately 44px or larger.

## Accessibility
Release gates:
- semantic headings/landmarks;
- keyboard operation;
- visible focus;
- labels on form controls;
- adequate contrast over imagery;
- `aria-live` for changing result canvas;
- reduced motion;
- errors explained in the active agent context rather than detached alerts.

## Current engineering invariants
- preserve Next.js/React architecture;
- `V45HolidayFinder` owns Greek and English home routes for the review branch;
- `/api/escape/discovery` precedes solving;
- `/api/escape/solve-v42` remains the active semantic inventory solver;
- `solutions=result?.solutions.slice(0,3)` remains the bounded public surface;
- `/api/escape/media?...mode=aerial` remains a sourced media path;
- downstream map, stay, review, itinerary, email and affiliate workflows remain intact;
- no backend/database migration is required for the redesign.

## MyAgenticTeam implementation method
1. inspect repo, runtime and real product evidence;
2. apply `@WEB-DESIGN-INTELLIGENCE` before implementation;
3. write the reference/Design-DNA digest;
4. convert it into an implementation-grade design contract;
5. implement on a review branch;
6. run typecheck, strict regression and production build;
7. inspect real preview output at desktop/mobile widths;
8. verify accessibility/reduced motion;
9. verify runtime behavior including empty-result recovery;
10. merge only after user review of the actual preview.

## Release acceptance
- first viewport feels like a premium travel product, not a cheap form;
- user understands real-offer Holiday Finder value quickly;
- conversation and live result canvas coexist;
- meaningful animation is visible but restrained;
- max two clarifications;
- trip frame stays inline in the agent session;
- empty exact search triggers automatic recovery;
- no fake filler result is created;
- source/product truth remains grounded;
- commercial bias cannot change fit;
- typecheck passes;
- strict regression passes;
- production build passes;
- real preview is reviewed on mobile and desktop before merge.
