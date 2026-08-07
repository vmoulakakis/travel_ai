# Travel Learning Skill

## Mission
Improve Travel Guru recommendations from observed user behavior while protecting traveler fit, truthfulness, diversity and affiliate integrity.

The learning system is not allowed to turn Travel Guru into a highest-commission recommender. It learns which feed-backed choices solve which travel problems for which contexts.

## Learning signals
Use only observable signals:
1. recommendation impression;
2. destination card opened;
3. comparison/filter change;
4. destination selected;
5. hotel card reviewed;
6. final tracked offer unlocked;
7. exact Linkwise outbound click;
8. conversion/revenue only when verified attribution exists.

Never infer a conversion from a click.

## Context features
Learn by cohort, not globally:
- language: EL / EN;
- origin;
- requested month;
- nights;
- budget band;
- traveler type;
- psychological intent / moods;
- distance preference;
- pace;
- hotel style;
- avoidance preference;
- destination location group;
- verified 5-star depth;
- active offer depth;
- feed price band;
- discount signal;
- demand signal.

## Three scores must stay separate
### 1. User Fit
How well the destination solves the expressed travel problem.
Inputs: intent, party, distance comfort, pace, hotel style, budget comfort, avoidance preferences.

### 2. Evidence Confidence
How reliable and current the supporting data is.
Inputs: feed validity, active offer count, star evidence, source freshness, optional official local-content data.

### 3. Commercial Performance
Observed downstream performance.
Inputs: offer review rate, unlock rate, outbound CTR, verified conversion rate, approved revenue.

Commercial Performance is a bounded tie-breaker. It must never rescue a destination with poor User Fit or stale/invalid evidence.

## Ranking learning rule
Start from the deterministic Travel Guru score.
Apply a small learned adjustment only after enough observations exist for a comparable cohort.

Recommended initial cap:
- learned user-choice lift: ±6 points;
- commercial tie-break lift: ±3 points;
- total learned adjustment: never more than ±8 points.

No learned adjustment may:
- introduce a destination outside the current Linkwise feed universe;
- override validity or stock exclusion;
- create a duplicate city/area in the final 5;
- invent price, currency, star level, scarcity, route or review data;
- promote an offer whose exact tracking URL is absent.

## Exploration vs exploitation
Keep a diversity-aware exploration slot when evidence allows it.
A strong historical winner should not permanently suppress emerging destinations.
Prefer contextual exploration among candidates with comparable base fit.

Never use engagement optimization that deliberately increases anxiety or compulsive behavior.

## Urgency learning
Urgency is factual, never optimized copy.
Only show countdowns derived from a real future `valid_to` timestamp of a displayed offer.
Do not learn or generate fake scarcity phrases such as "only 2 left" unless the source explicitly supplies that exact inventory fact.

## Five-choice policy
The destination layer returns 5 distinct solutions.
The learning layer may reorder those 5 within bounded limits, but must preserve geographic/semantic diversity.
Do not show both a parent location and a near-identical child label when they represent effectively the same trip solution unless the user explicitly asks for that area.

## Ten-offer policy
After destination selection, target up to 10 currently valid tracked offers:
- first: up to 5 verified 5-star offers, ordered by feed price from high to lower;
- then: up to 5 distinct alternatives.

If the source has fewer than 5 verified 5-star offers or fewer than 10 eligible offers, show the real count and never manufacture cards.

The final external Linkwise URL remains locked until the user opens an offer detail and explicitly chooses to unlock it.

## Local discovery learning
Tripadvisor Terra or another approved official source may enrich food, attractions and reviews.
Local-content engagement can help learn traveler interests, but it may not change affiliate destination eligibility.
Do not fabricate local ratings when the official source is unavailable.

## Feedback loop
For every meaningful event store:
- anonymous session id;
- request fingerprint;
- recommendation set ids and ranks;
- deterministic score components;
- AI mode;
- selected destination/offer id;
- event type;
- timestamp;
- attribution id when available.

Periodically compute cohort priors offline/admin-side. Runtime ranking consumes only bounded, versioned priors.

## Guardrails
- Facts → deterministic engine → bounded learning → AI explanation.
- Never train directly on raw private conversation text when structured preference fields are available.
- Never expose model chain-of-thought.
- Keep EL and EN presentation behavior separate where copy preference differs, but share factual inventory signals.
- Human/admin review is required before changing global weight caps or commercial-learning limits.

## Success metrics
Primary: useful destination selection rate.
Secondary: destination-detail open rate, offer-review rate, unlock rate, qualified outbound CTR, verified conversion rate.
Guardrail metrics: duplicate-choice rate, invalid-link rate, stale-offer rate, fabricated-fact incidents, excessive commercial-bias lift.
