# Travel Web Design — V44 Premium AI Travel Skill

## Purpose
Design TravelAI as a premium decision product, not an OTA search form, destination blog or generic AI landing page. The experience should combine cinematic travel emotion with disciplined product UX: dark, precise, confident, fast and evidence-aware.

This skill supersedes older warm/editorial visual guidance where it conflicts with the current V44 design contract.

## Current design thesis — Option 2
TravelAI should feel like an international premium travel-intelligence product.

Visual language:
- deep ink / midnight / ocean-black foundation;
- restrained cyan/aqua intelligence accent;
- high-contrast modern sans typography;
- large immersive sourced travel media, heavily controlled by dark overlays;
- thin luminous borders rather than decorative card chrome;
- selective glass only where it improves hierarchy;
- compact data/evidence signals;
- one dominant action per state;
- motion that communicates transition, ranking or focus.

Avoid:
- generic purple AI gradients;
- pale travel-blog styling;
- endless destination card walls;
- rounded-card-everywhere SaaS templates;
- decorative metrics, fake ratings or fake scarcity;
- UI that exposes internal agent/model names as theatre.

## Product journey
The discovery contract is:

`natural need -> at most 2 useful clarifications -> one practical setup screen -> AI + real inventory solve -> 3 strongest solutions -> one selected destination -> stay/360 experience`

The user should feel that TravelAI is doing the work. Do not push ranking work back onto the traveller through a filter wall.

## Home / discovery
The first viewport must communicate in seconds:
1. this is an AI travel decision product;
2. the user can describe what they want naturally;
3. the system uses real inventory/evidence rather than hallucinated trips;
4. the result is a small, explained set of choices.

Recommended structure:
- premium top navigation;
- strong benefit-led headline;
- natural-language AI Trip Planner composer;
- optional inspiration prompts that populate the composer rather than bypass the reasoning flow;
- a visual intelligence panel explaining `understand -> match -> explain`;
- a compact capability rail for personalization, real inventory, explainability and low friction.

## Choice architecture
The discovery UI exposes **3 strongest distinct solutions**. Internal engines may maintain more candidates.

Do not show 5, 6 or 10 equal cards on the initial decision surface. If deeper exploration is later added, it must remain secondary to the bounded top-three decision.

Each solution needs:
- destination;
- real stay/inventory state;
- fit signal;
- concise reason;
- material trade-off/uncertainty;
- clear next action.

## Trust architecture
Truth must be visible through product behavior rather than marketing claims.

- fit and evidence confidence are conceptually separate;
- commission cannot decide suitability;
- observed feed price is not automatically a trip total;
- unknown availability/price remains unknown;
- sourced photography represents destinations/properties honestly;
- dynamic progress text maps to work the backend actually performs;
- no invented urgency, popularity, review score, savings or stock.

## Motion system
Use the lightest mechanism that serves a real job:
1. CSS for hover, focus, fades and background camera drift;
2. Motion for React only when state/layout choreography materially improves comprehension;
3. GSAP only for a clearly justified complex sequence;
4. no 3D/WebGL by default.

All important motion has a `prefers-reduced-motion` equivalent. Motion never delays input or hides evidence.

## Responsive/mobile
Mobile is a first-class product, not a compressed desktop.

- single-column primary journey;
- no tiny filter controls;
- composer CTA becomes full width;
- inspiration prompts stack cleanly;
- intelligence panel remains readable without decorative excess;
- minimum practical touch target ~44 CSS px;
- no horizontal overflow;
- long Greek labels wrap safely;
- result cards become vertically scannable while preserving rank and action.

## Accessibility
Release gates include:
- semantic headings and landmarks;
- programmatic labels;
- keyboard operation;
- visible focus;
- adequate contrast across background imagery;
- reduced motion;
- errors associated with the relevant flow state;
- meaningful action text, not icon-only critical controls.

## Engineering contract
Preserve the current application architecture unless a migration has independent justification.

Current compatibility invariants:
- Greek and English home routes use `V40DiscoveryExperience`;
- current discovery solver is `/api/escape/solve-v42`;
- discovery continues to use sourced `mode=aerial` media;
- practical setup captures date range, budget and origin together;
- adaptive clarification remains bounded;
- top-three decision output remains intact.

Versioned component names are compatibility identifiers, not a reason to rewrite working runtime architecture.

## Review questions
Before release, all answers should be yes:
- Does the first viewport look like a premium product rather than a travel template?
- Can a new user understand what to type within five seconds?
- Is the AI value visible without technical theatre?
- Are exactly three defensible solutions presented after matching?
- Can the user tell why one option fits better than another?
- Is commercial bias structurally separated from traveller fit?
- Does the product remain useful when optional AI enrichment fails?
- Does mobile feel deliberately designed?
- Are sourced media, price and evidence states honest?
- Do typecheck, strict regression tests, build and runtime checks pass?
