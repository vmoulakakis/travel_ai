# Travel Learning — Canonical V45 Skill

## Mission
Improve TravelAI from real observed behavior while protecting current intent, truthfulness, diversity, privacy and affiliate integrity.

Persistent memory is personalization, not training by assumption.

## Memory classes
### Current explicit intent
The current request/form/free text. Highest priority and not weakened by historical behavior.

### Persistent structured profile
Stored in `traveler_intelligence_profiles_v44`: current/last structured preference weights, bounded learned preferences, explicit hard-constraint summary, avoidances, compact travel history, confidence and signal count.

### Behavioral events
Stored in `traveler_signal_events_v44`. Use only events that actually occurred. Never infer a conversion from a click or a preference from an impression.

## V45 learning signals
Current implementation:
- recommendation impression -> telemetry only, no preference lift
- destination selected -> +0.12 base signal
- offer view -> +0.04
- outbound click -> +0.08
- positive completed-trip feedback -> +0.15
- negative completed-trip feedback -> -0.10

These values are starting priors and must be evaluated, not treated as universal truth.

## Attribution-aware learning
A destination contains many traits. Selecting it does not prove the user likes every trait.

`record_traveler_signal_v45` may update a dimension only when the destination carries that dimension and that dimension was active in the request/profile that produced the choice.

This prevents false learning such as inferring “family” or “luxury” merely because a user selected a destination that supports those traits.

## Caps and precedence
- learned preference per dimension is bounded to 0..0.35
- its effective intent contribution is additionally capped in runtime
- a current explicit dislike/negative semantic signal suppresses historical boost
- a hard constraint always wins
- memory can break ties or personalize; it cannot make an invalid trip valid

## What not to store
Do not store hidden chain-of-thought, unnecessary raw conversations, secrets, sensitive inferred traits or fabricated preferences. Prefer structured signals and compact summaries.

## Evaluation
Track useful destination selection, repeat-session usefulness, correction/undo rate, dead-end rate, invalid/stale inventory incidents, unsupported claims, diversity collapse, memory-vs-current-intent conflicts, magnitude of learned ranking movement, outbound behavior and verified conversion separately.

A learning change is not GREEN because CTR rises. It must improve decision utility without increasing constraint violations, unsupported certainty or commercial bias.
