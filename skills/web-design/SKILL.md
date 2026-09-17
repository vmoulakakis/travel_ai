---
name: travel-ai-v45-holiday-finder-web-design
version: 6.0.0
compatibility_alias: travel-ai-v44-web-design
purpose: Light premium AI Holiday Finder funnel that converts natural travel intent into exactly three real offer-backed holiday matches, then into an evidence-aware stay and 360° trip flow.
source_method: MyAgenticTeam web-design-intelligence + agent-runtime-2026 + solution-first-product + live TravelAI offer/product evidence + current travel-AI category research
---

# TravelAI V45 Holiday Finder — Web Design Contract

## Canonical status
This is the project-local design contract for the active redesign. Historical V38/V40/V44 documents remain useful only where they do not conflict with this contract.

Current compatibility interfaces remain intentionally stable:
- semantic discovery: `/api/escape/discovery`;
- real offer/inventory matcher: `/api/escape/solve-v42`;
- stay workspace: `V40StayWorkspace`;
- public initial choice count: **3**.

The new home surface is `V45HolidayFinder`.

## Product objective
The product is an **AI Holiday Finder from our real offer products**, not a generic destination inspiration site and not an AI technology showcase.

Primary conversion path:

`natural holiday need -> max 2 useful clarifications -> dates/budget/origin -> offer inventory scan -> exactly 3 offer-backed holiday matches -> one choice -> stay/360 trip -> disclosed provider handoff`

An affiliate click is downstream of user confidence. It is not the ranking objective.

## Research digest
The `MyAgenticTeam @WEB-DESIGN-INTELLIGENCE` process was applied before implementation.

Current category mechanisms worth adapting:
- conversational travel brief rather than a filter wall;
- live actionable results beside/after conversation;
- real bookable inventory grounding rather than generic AI ideas;
- visible narrowing from many possibilities to a few decisions;
- concise explanation of why a result fits;
- strong real imagery with a task-first interface.

Rejected patterns:
- dark cinematic AI splash as the dominant product experience;
- neon/aurora “AI theatre”;
- fake agent metrics, fake live counters or fake scarcity;
- destination-first search as the mandatory entry point;
- generic SaaS dashboard card walls;
- long questionnaires before showing value.

## V45 art-direction thesis
TravelAI should feel like a modern Mediterranean travel advisor: bright, calm, intelligent and trustworthy. The visual grammar combines **Conversion Utility + Organic/Editorial travel** rather than dark Spatial AI.

Use:
- warm white and pale sand fields;
- sea-mist surfaces;
- deep blue-green ink;
- Aegean teal as the primary action/intelligence signal;
- a restrained coral accent for warmth;
- editorial serif only for emotional headings;
- modern sans for interaction and evidence;
- real destination/property imagery;
- generous whitespace and strong hierarchy.

The visual system must make the holiday decision easier, not merely look “AI”.

## Funnel architecture
### 1 — Holiday need
First viewport must answer immediately:
- what the product does;
- that it searches real offer products;
- what the user should say next.

Primary interaction is a natural-language composer. Prompt chips are realistic holiday briefs, not decorative demos.

### 2 — Adaptive clarification
Ask only questions with material information gain. Maximum two extra questions before practical setup.

### 3 — Practical setup
Collect origin, dates, total budget and traveler group together on one screen. Keep the literal compatibility marker `ΤΟ ΜΟΝΟ ΠΡΑΚΤΙΚΟ ΒΗΜΑ` while the visible product experience remains natural.

### 4 — Offer solve
The interface may state that the agent is matching the brief against real offer inventory only because the runtime really calls the inventory-backed solver.

### 5 — Results
Present exactly **3** offer-backed holiday matches when evidence supports them. Internal candidate/ranking sets may be larger.

Each result foregrounds:
- destination;
- real property/offer;
- source product identifier;
- overall match;
- concise reason;
- matched signals;
- positive feed price only when present;
- next internal action to inspect the destination/stay.

If fewer than three defensible results exist, show the real count and recovery guidance. Never manufacture filler.

## Offer-first intelligence contract
The visible product must make clear that recommendations are derived from the user brief **and** real offer inventory.

The active solver already supports:
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

UI copy must not imply the model invented or independently verified fields that came from the feed.

## Information hierarchy
The visitor should understand, in order:
1. “this finds a holiday for me”;
2. “it searches real offers rather than generic ideas”;
3. what brief is needed;
4. what the agent understood;
5. what practical dates/budget apply;
6. which three offers survive;
7. why each fits;
8. what remains uncertain;
9. the next action.

## Truth and commerce rules
Never fabricate availability, room inventory, final trip price, ratings, reviews, customer counts, urgency, scarcity, savings, certifications, transport facts or weather.

**Positive feed price** is a price signal, not necessarily a nightly or total-trip price. Blank/null/zero/negative prices remain unknown.

Exact affiliate `tracking_url` remains unchanged. **Commercial payout cannot lift traveller fit.** Commission, EPC or merchant economics must not promote an otherwise weaker holiday match.

## Media
- use sourced high-resolution travel imagery;
- property imagery must come from the feed/provider evidence;
- imagery supports trust and desirability but never hides task completion;
- mobile can simplify imagery to protect speed;
- reduced-motion users receive static equivalents;
- never synthesize a fictional image of a real stay and present it as evidence.

## Typography and layout
- emotional headlines: readable editorial serif with high-quality Greek glyphs;
- UI/evidence/body: modern sans;
- readable line lengths;
- strong whitespace;
- no repeated eight-section card wall;
- one primary job per state;
- result cards must scan quickly on desktop and stack cleanly on mobile.

## Motion
Use motion only to orient, show state change, reveal hierarchy or provide feedback. Prefer CSS transitions/keyframes. No 3D/WebGL by default. `prefers-reduced-motion` must remove ambient motion without reducing functionality.

## Mobile
At phone widths:
- navigation simplifies;
- composer becomes a single column;
- primary CTA is full width;
- questions and setup inputs stack;
- offer cards stack vertically;
- no horizontal overflow;
- touch targets remain comfortably tappable;
- the agent/product story must not push the actual funnel below decorative content.

## Current engineering invariants
- preserve Next.js/React architecture;
- `V45HolidayFinder` owns Greek and English home routes for this review branch;
- `/api/escape/discovery` precedes solving;
- `/api/escape/solve-v42` remains the active semantic single-fetch offer/inventory solver;
- `solutions=result?.solutions.slice(0,3)` remains the bounded public decision surface;
- `/api/escape/media?...mode=aerial` remains a sourced media path;
- downstream map, stay, review, itinerary, email and affiliate workflows remain intact;
- no backend/database migration is required for the redesign.

## MyAgenticTeam implementation method
1. inspect repo, runtime and real product evidence;
2. apply `@WEB-DESIGN-INTELLIGENCE` research before visual implementation;
3. define conversion architecture and acceptance criteria;
4. implement on a review branch;
5. prefer deterministic tests to speculative agent review;
6. run typecheck, strict regression and production build;
7. inspect real browser output at desktop/mobile widths;
8. verify accessibility and reduced motion;
9. verify runtime evidence and no new errors;
10. merge only after the user has reviewed the actual preview.

## Release acceptance
- user understands “Holiday Finder from real offers” within the first viewport;
- no dark-tech-demo aesthetic dominates the experience;
- max two clarifications;
- one practical setup step;
- exactly three defensible initial offer-backed matches;
- source product/property is visible in results;
- truthful price behavior is preserved;
- commercial bias cannot change fit;
- typecheck passes;
- strict regression passes;
- production build passes;
- preview is visually inspected at mobile and desktop before merge.
