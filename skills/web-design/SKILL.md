---
name: travel-ai-v44-web-design
version: 5.0.0
purpose: Premium dark AI-first travel decision experience that converts natural intent into three real inventory-backed escapes, then into an evidence-aware 360° trip and disclosed provider handoff.
source_method: MyAgenticTeam web-design-intelligence + agent-runtime-2026 + solution-first-product + live TravelAI product evidence
---

# TravelAI V44 Web Design Contract

## Canonical status
This is the project-local design contract that implementation agents must follow for the current TravelAI redesign. Older V38/V40 design documents remain historical references only when they do not conflict with this file.

The current runtime compatibility names stay unchanged unless a separate migration is justified:
- home experience component: `V40DiscoveryExperience`;
- main inventory matcher: `/api/escape/solve-v42`;
- public initial choice count: **3**.

Version numbers are not a reason to churn working interfaces.

## Product objective
Primary success is a traveller progressing through:

`felt need -> useful understanding -> real-world frame -> 3 defensible matches -> one choice -> stay/360 experience -> disclosed provider handoff`

An affiliate click is downstream of confidence. It is not the ranking objective.

## Audience
The user often does not know where to go. They know how they feel, how much time/budget they have, who is travelling and what would ruin the trip. TravelAI should absorb complexity rather than force destination-first search behavior.

## V44 art-direction thesis — Option 2
The product should feel like a premium international travel-intelligence studio: dark, immersive, precise and quietly futuristic.

- deep midnight/ocean-black canvas;
- cyan/aqua as the intelligence/action signal;
- modern sans typography with strong weight contrast;
- sourced travel media used cinematically behind controlled dark layers;
- thin luminous borders and selective translucent panels;
- compact evidence signals and deliberate negative space;
- subtle aurora/atmospheric depth rather than generic AI gradients;
- no decorative metric theatre;
- no travel-blog beige/white default;
- no generic card-wall SaaS composition.

The signature element is the **AI Trip Planner workbench**: natural language on the left, visible `understand -> match -> explain` intelligence on the right.

## Discovery architecture
### State 1 — Welcome
First viewport includes:
- TravelAI premium wordmark/navigation;
- benefit-led hero;
- natural-language AI Trip Planner composer;
- optional prompt chips that prefill the brief;
- real-intelligence panel using sourced media;
- capability rail: personalization, real stays, explainable fit, low friction.

The interface must not imply that fake agents are working. Any dynamic status corresponds to a real runtime state.

### State 2 — Clarify
Ask only a question that materially changes the recommendation. Current product contract caps adaptive clarification at two extra questions.

### State 3 — Practical setup
Collect dates, total budget and origin together on one screen. Do not restore the old multi-screen practical-constraint funnel.

### State 4 — Solve
Show semantic intent, destination fit, real inventory and trade-off checking as understandable process states. Do not expose model/provider internals.

### State 5 — Results
Present exactly **3 strongest distinct solutions**. Internal candidate/ranking sets may be larger.

Each card exposes:
- rank;
- destination;
- real stay;
- fit;
- concise matched signals;
- reason;
- known price signal when truthful;
- next action.

No filler card is created merely to reach three.

## Information and trust hierarchy
The user should understand, in order:
1. what TravelAI does for them;
2. what input is needed now;
3. what the system understood;
4. what real-world constraints remain;
5. which three choices survive;
6. why #1 differs from #2/#3;
7. what remains uncertain;
8. what action comes next.

Fit, evidence confidence and commercial performance are separate concepts. Commercial performance never determines user suitability.

## Media rules
- destination backgrounds use sourced high-resolution landscape/aerial media;
- property imagery comes from the actual property/feed or another explicitly sourced provider;
- image relevance matters more than visual drama;
- dark overlays protect contrast across every frame;
- heavy media must have mobile/reduced-motion fallbacks;
- do not AI-reconstruct a specific real hotel/room/view and present it as evidence.

## Typography
Use a modern sans system for the discovery product. The current V44 experience intentionally moves away from the previous Georgia-led editorial look.

Required behavior:
- very strong hero weight with tight but readable tracking;
- compact uppercase intelligence labels;
- restrained body widths;
- clear Greek glyph rendering;
- mobile scaling that preserves the headline impact without clipping.

## Motion
Named jobs only: orient, reveal hierarchy, show state, focus a selected solution, or provide feedback.

Default hierarchy:
1. CSS transitions/keyframes;
2. Motion for React only when layout/state choreography materially benefits;
3. GSAP only for complex justified sequences;
4. no 3D/WebGL by default.

`prefers-reduced-motion` disables ambient camera/aurora motion without removing content.

## Mobile
At phone widths:
- header simplifies;
- composer becomes one column;
- CTA becomes full width;
- prompt chips stack;
- intelligence media remains secondary to task completion;
- practical inputs stack;
- result cards stack vertically;
- no horizontal overflow;
- important touch targets are approximately 44 CSS px or larger.

## Truth and commerce rules
Never fabricate:
- availability;
- room inventory;
- final trip price;
- star rating;
- reviews;
- customer counts;
- urgency/scarcity;
- savings;
- certifications;
- route facts.

Positive feed price is a price signal, not necessarily a trip total. Blank/null/zero/negative values remain unknown. Final provider terms must be confirmed at handoff.

Affiliate tracking URL is preserved exactly. Commercial payout cannot lift traveller fit.

## Current engineering invariants
- preserve Next.js/React architecture;
- preserve current working APIs and data contracts;
- `V40DiscoveryExperience` remains on Greek and English home routes;
- `/api/escape/discovery` learns the brief before the solve;
- `/api/escape/solve-v42` remains the active fast single-fetch semantic inventory solver;
- `solutions=result?.solutions.slice(0,3)` remains the bounded discovery presentation;
- sourced `/api/escape/media?...mode=aerial` remains the discovery media path;
- current downstream map/stay/guide workflows remain intact unless separately redesigned.

## Agent implementation method — MyAgenticTeam 2026
Before material UI changes:
1. inspect repo + production evidence;
2. read current canonical project skill and relevant MyAgenticTeam skills;
3. turn the design objective into acceptance criteria;
4. use the smallest capable implementation/review team;
5. prefer deterministic inspection/tests over model speculation;
6. implement on a reviewable branch;
7. run typecheck, strict tests and production build;
8. inspect actual browser output at desktop/mobile widths;
9. verify accessibility, runtime errors and deployment health;
10. merge only after evidence supports GREEN.

Do not fan out agents merely because agents exist. Use specialized subagents only for clearly isolated work and synthesize/review their outputs before acceptance.

## Release acceptance
- first viewport communicates value within ~5 seconds;
- user can start from natural intent, not a destination;
- at most two clarifications before practical setup;
- practical constraints remain one screen;
- exactly three defensible initial matches;
- no fake facts or commission-biased fit;
- keyboard and visible focus work;
- responsive layout works at 360/390/768/1024/desktop;
- reduced motion works;
- typecheck passes;
- strict regression suite passes;
- production build passes;
- preview/runtime is visually inspected before merge;
- production is verified after merge before status GREEN.
