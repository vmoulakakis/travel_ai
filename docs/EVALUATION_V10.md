# V10 Traveler Evaluation

Run date: 2026-08-09

## Scope

The deterministic destination engine was tested as a strict traveler across 100 realistic combinations: ten traveler archetypes multiplied by ten travel periods. The suite evaluates the live 21-place Greek catalog and runs 786 assertions.

Archetypes cover couples, families, friends and solo travelers; quiet, lively and surprising journeys; sea, nature, culture and nightlife must-haves; budget pressure; crowd avoidance; island-only travel; considered destinations; and incompatible warmth or effort constraints.

## Acceptance gates

- Exactly six unique Greek results whenever six viable candidates exist.
- Stable ranking for the same structured request.
- No mainland result in island-only journeys.
- Sea, nature, culture and nightlife hard requirements are respected.
- Explicit warmth cannot be rescued by diversity when season feasibility fails.
- Crowd and high-cost red lines cannot leak unsuitable places into finalists.
- A nearby brief must lead with a low-friction place and keep at least two low-friction finalists.
- Region diversity prevents the same destination pattern from dominating all six.
- Conflicting briefs are labelled mixed or compromise.
- A considered place can remain in the set only when season and budget remain viable.

## Defects found and repaired

The first run exposed repeated region groups and one high-cost finalist. A production journey then exposed a third defect: a high-emotion island match could outrank the travel-effort constraint for a family explicitly asking to stay nearby. Diversity, high-cost feasibility and nearby/easy-hop effort guards were strengthened before the complete rerun.

## Final result

`V10_100_SCENARIOS_OK`

- Scenarios: 100
- Assertions: 786
- Active Greek catalog: 21 destinations
- Failed assertions after repair: 0

This suite is a release gate, not a claim that every human preference is solved. New catalog destinations, ranking weights or hard constraints require rerunning and extending the suite.
