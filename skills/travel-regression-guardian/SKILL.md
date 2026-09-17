# Travel Regression Guardian Skill

## Mission
Protect the canonical `travel_ai` product while reusing proven ideas from legacy Travel AI lineages. This skill is a migration and release guardrail, not a runtime planner. It must prevent older code, prompts, schemas or commercial logic from silently weakening the current destination-first decision system.

## Use this skill when
- comparing `travelai_greece` or another historical branch/repository with `travel_ai`;
- changing recommendation, streaming, destination ranking, inventory, maps, model routing or learning logic;
- importing a legacy script, document, skill, API route, migration or UI capability;
- changing Supabase contracts or deployment lineage;
- preparing a production release that touches decision quality.

## Canonical-source rule
`vmoulakakis/travel_ai` is authoritative. `travelai_greece` is reference-only.

Never copy a legacy directory wholesale into the canonical repository. Compare at file and behavior level first. Classify each candidate as:

1. **identical** — do nothing;
2. **evolved in canonical** — keep canonical;
3. **missing but still useful** — port selectively behind tests;
4. **obsolete or conflicting** — document and reject.

A legacy implementation may be used as evidence of a requirement, but it may not override a newer canonical implementation merely because it existed earlier.

## Non-regression invariants

### 1. Hard constraints own eligibility
Explicit geography, dates, season, must-haves, dislikes, effort and other hard traveler constraints execute before model preference, diversity, inventory or commercial signals.

### 2. Destination truth stays independent
Destination suitability comes from destination knowledge and verified traveler constraints. Hotel count, inventory depth, affiliate EPC, commission, discount and merchant economics must not rewrite factual destination suitability.

Inventory may influence the ranking of a complete **travel solution** only after the destination pass, and any material rank movement must be explainable.

### 3. Evidence beats model memory
Models may interpret, compare and explain. Facts must come from deterministic data, configured tools or verified evidence. Unknown stock, final price, weather, transport cost, room type or availability must remain unknown.

When confidence is insufficient, prefer a bounded fallback or clear no-result state over fabrication.

### 4. One authoritative decision path
Legacy `/api/recommend` and `/api/recommend/stream` must continue to use the same deterministic destination engine for equivalent inputs/evidence.

The current Escape/solution funnel must preserve the two-pass contract:

`traveler need -> verified destination pass -> inventory reality pass -> explainable final travel solution`.

### 5. Commercial isolation
Affiliate tracking URLs may be preserved exactly when surfaced, but commission or payout must never increase destination fit. Commercial data must not enter hard eligibility.

### 6. Bounded learning
Learned influence is advisory and bounded. A weak or immature learned model must never replace deterministic travel constraints. Keep activation gates evidence-based and reversible.

### 7. Cost-aware model routing
Use deterministic code for high-volume facts and repeatable filters. Use LLMs for semantic interpretation, grounded comparison and human-purpose trade-offs. Expensive verifier calls should be conditional rather than mandatory when deterministic confidence is already high.

## Legacy salvage procedure
1. Identify the exact legacy artifact and the current canonical counterpart.
2. Compare path, Git object SHA where available, public contract and tests.
3. State the user-visible or operational capability that is genuinely missing.
4. Reject ports that merely duplicate an existing canonical capability.
5. Port the smallest possible unit on a dedicated branch.
6. Add or extend a deterministic regression test before touching the current implementation when practical.
7. Do not rewrite Supabase migrations or production data destructively to make an old artifact fit.
8. Run the full release gate.
9. Inspect the PR diff for unrelated changes.
10. Merge only when the canonical behavior is preserved or deliberately improved.

## Required release gate
For any runtime-affecting salvage or refactor, require all of the following:

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test:strict
npm run build
```

For production-lineage changes also validate, at minimum:
- `/api/health`;
- one structured recommendation request;
- one free-text / semantic-intent request;
- one downstream stay/inventory lookup;
- the relevant map/product surface when that path changed.

## Review questions
Before merge answer all of these:
- Did this add a capability the canonical repo actually lacked?
- Did any hard constraint move later in the pipeline?
- Can inventory or affiliate economics now alter destination truth?
- Can an LLM introduce an unsupported fact or destination?
- Did JSON/stream or old/new route contracts diverge unexpectedly?
- Did any unknown value become presented as confirmed?
- Did test coverage decrease or get bypassed?
- Is rollback straightforward?

If any answer indicates a regression, do not merge.

## Historical lessons retained from `travelai_greece`
The legacy lineage established several durable disciplines worth preserving: deterministic constraint ownership, independent destination ranking, skeptical/result auditing, no-result over fabrication, bounded neural learning, conditional verifier use and explicit post-deploy smoke validation. These principles remain useful even when the old implementation itself is obsolete.
