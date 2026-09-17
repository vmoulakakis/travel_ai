# Travel Web Design — V45 Offer-Aware Holiday Finder

## Purpose
Design TravelAI as a **Holiday Finder from real offer products**. The experience must help a traveller describe the break they need, let the agent narrow the brief with minimal questioning, then present a small set of real offer-backed matches.

This skill inherits the detailed project contract in `skills/web-design/SKILL.md` and the research method from MyAgenticTeam `@WEB-DESIGN-INTELLIGENCE`. If this file conflicts with the project-local canonical web-design skill, the canonical file wins.

## Visual thesis
The active direction is **light Mediterranean / editorial conversion utility**, not dark AI theatre.

Use:
- warm white and pale sand surfaces;
- soft sea-mist panels;
- deep blue-green text;
- Aegean teal for intelligence/actions;
- restrained coral warmth;
- editorial serif for emotional headlines;
- modern sans for UI/evidence;
- real travel/property imagery;
- generous whitespace;
- clear decision hierarchy.

Avoid:
- midnight/ocean-black as the dominant canvas;
- neon aurora or generic purple AI gradients;
- glass-dashboard theatre;
- card walls with equal visual weight;
- fake metrics, ratings, scarcity or urgency;
- destination-first filter walls as the only entry path.

## Product journey
`natural holiday need -> max 2 useful clarifications -> one practical setup -> real offer inventory solve -> 3 strongest holiday matches -> selected stay -> 360° trip`

The traveller should feel that the agent is doing the ranking work, not pushing it back through filters.

## First viewport
The first viewport must communicate within seconds:
1. this is a Holiday Finder;
2. the user can describe the desired trip naturally;
3. the system searches real offer products;
4. the result will be a small explained set of choices.

Primary UI:
- clean navigation;
- benefit-led headline;
- natural-language Holiday Agent composer;
- realistic brief shortcuts;
- one visual agent/offer panel explaining `understand -> scan offers -> keep 3`;
- concise real-inventory trust signals.

## Choice architecture
Initial discovery exposes exactly **3 strongest distinct offer-backed solutions** when evidence supports them. Internal candidate sets may be larger.

Each result should show:
- destination;
- actual property/offer;
- source product traceability;
- fit/match;
- concise reason;
- matched signals;
- truthful price signal when known;
- clear next internal action.

## Trust architecture
- fit and evidence confidence are separate;
- commission cannot determine suitability;
- positive feed price is not automatically a trip total;
- unknown price/availability stays unknown;
- sourced media represents real destinations/properties honestly;
- progress labels correspond to real backend work;
- no invented reviews, popularity, savings, scarcity or stock.

## Motion
Prefer CSS transitions/keyframes for state and hierarchy. Add heavier animation libraries only for a named UX job. `prefers-reduced-motion` must preserve complete task functionality.

## Responsive/mobile
- one-column primary journey;
- full-width composer action;
- questions and practical fields stack;
- offer cards stack vertically;
- agent explanation never outranks the task;
- no horizontal overflow;
- readable Greek text;
- comfortable touch targets.

## Accessibility
Require semantic structure, keyboard operation, visible focus, form labels, contrast, reduced motion and useful error feedback.

## Engineering invariants
- Greek and English home routes use `V45HolidayFinder` during V45 review;
- `/api/escape/discovery` precedes matching;
- `/api/escape/solve-v42` remains the real semantic single-fetch offer/inventory solver;
- sourced `mode=aerial` media remains available;
- practical setup captures dates, budget and origin together;
- adaptive clarification stays bounded at two;
- public top-three result output remains intact;
- existing map/stay/review/itinerary/email/affiliate architecture remains unchanged unless separately redesigned.

## Release questions
Before production merge:
- Is it clearly a Holiday Finder, not an AI showcase?
- Does it visibly use real offer products?
- Can a user start within five seconds?
- Are questions minimal and useful?
- Are exactly three defensible results shown when available?
- Is property/product evidence visible?
- Is commercial bias separated from fit?
- Is mobile deliberately designed?
- Are media, price and evidence states truthful?
- Do typecheck, strict tests, build and preview review pass?
