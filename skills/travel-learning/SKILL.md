# Travel Learning — Canonical V44 Skill

## Mission
Improve TravelAI from observed user behavior while protecting traveller fit, truthfulness, diversity and affiliate integrity. Learning optimizes problem resolution and useful choices; it is never permission to turn the product into a highest-commission recommender.

## Observable signals only
Use signals that actually occurred:
1. recommendation impression;
2. solution card focused/opened;
3. comparison or refinement action;
4. destination selected;
5. stay reviewed;
6. Escape Book/email gate completed;
7. exact tracked outbound click;
8. conversion/revenue only when verified attribution exists.

Never infer a conversion from a click.

## Context features
Learn by comparable cohort, not by one global popularity score:
- language and origin;
- month/date window and nights;
- budget band;
- traveller type/group size;
- semantic intent and mood;
- distance/effort preference;
- pace and stay style;
- avoid/must-have constraints;
- destination group;
- active inventory depth;
- evidence freshness;
- observed price band and discount signal where truthful.

## Keep three concepts separate
### User Fit
How well the trip solves this traveller's expressed need and constraints.

### Evidence Confidence
How current and defensible the supporting destination/stay evidence is.

### Commercial Performance
Observed downstream behavior such as qualified outbound CTR or verified conversion.

Commercial Performance is a bounded tie-break signal only. It cannot rescue weak fit, stale evidence, invalid inventory or a hard-constraint violation.

## Ranking learning rule
Start from deterministic/semantic TravelAI scoring. Apply only small, versioned adjustments after sufficient observations exist for a comparable cohort.

Initial guardrails:
- learned user-choice lift: ±6 points;
- commercial tie-break lift: ±3 points;
- total learned adjustment: never more than ±8 points.

No learned adjustment may:
- override hard constraints;
- introduce invalid/stale inventory;
- invent price, availability, rating, scarcity, transport or review facts;
- promote an offer without its exact tracking URL;
- collapse meaningful solution diversity;
- make commission the reason a destination enters the public top 3.

## Exploration vs exploitation
Keep bounded exploration among candidates with comparable base fit when evidence supports it. Historical winners must not permanently suppress new or seasonal solutions. Exploration occurs in the internal candidate/ranking layer; the public surface still presents only defensible choices.

## Three-choice presentation policy
The current discovery experience presents **exactly 3 strongest distinct solutions** when available. The engine may keep more internal candidates for resilience, evaluation and reranking.

Learning may affect ordering only within the guardrails above. The final 3 should avoid near-duplicate destinations or effectively identical trip propositions unless the user explicitly asks for that area/type.

If fewer than 3 defensible solutions exist, return the real count and a recovery action instead of filler.

## Stay inventory policy
After a destination is selected, show only real eligible stay inventory. Counts are bounded by the relevant destination/stay workspace contract; never fabricate cards to reach a UI quota. Unknown price remains unknown. Final live room/terms require provider confirmation.

## Urgency
Urgency is factual, never learned copy. Countdown or validity messaging may come only from a real future timestamp/source. Never optimize invented scarcity language.

## Feedback storage
For meaningful events store structured fields such as:
- anonymous session/request fingerprint;
- recommendation set IDs and ranks;
- deterministic score components;
- evidence state;
- selected destination/offer ID;
- event type and timestamp;
- attribution ID only when available.

Prefer structured preference fields over raw private conversation text. Do not store private chain-of-thought.

## Evaluation
Offline/admin-side evaluation must watch:
- useful destination selection rate;
- dead-end rate;
- invalid/stale inventory rate;
- unsupported/fabricated fact incidents;
- duplicate-choice rate;
- solution-to-stay progression;
- qualified outbound CTR;
- verified conversion rate where available;
- magnitude of commercial-bias adjustment.

A learning change is not GREEN because engagement rises. It must preserve truth, hard constraints, diversity and useful next-action coverage.
