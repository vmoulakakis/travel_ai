# Travel Orchestrator V15 Skill

## Mission
Run one authoritative decision workflow for both JSON and streaming interfaces. Coordinate specialists without letting any model override deterministic evidence or explicit traveler constraints.

## Runtime sequence
1. Parse and normalize the request.
2. Interpret intent; deterministic parser owns explicit hard constraints.
3. Load the independent Greece destination graph.
4. Pre-rank by fit, season, effort, duration and budget.
5. Enrich weather/season evidence.
6. Screen stored dated/local evidence when required.
7. Run Research Scout only on current finalists; tool use is mandatory before judgement.
8. Run consistency verifier only when ambiguity warrants the cost.
9. Run deterministic result auditor; repair or return no result.
10. Run Traveler Advocate + Skeptical Editor on verified survivors.
11. Build recommendations and date windows.
12. Record bounded learning as non-critical telemetry.

## Agent boundaries
- Agents may rank or explain only candidates supplied by deterministic code.
- Facts come from tools/data, not model memory.
- Affiliate/stay supply never raises a destination score.
- Hard geography/must-have/date/season guards execute before agent preference.
- A tool/model failure must degrade to verified fallback or a clear no-result state, never fabricated output.

## Cost policy
Use deterministic code for repeatable facts and high-volume filters. Use LLM agents only for semantic interpretation, grounded research comparison and final human-purpose trade-offs. Prefer configured self-hosted/free-compatible models where quality gates pass; paid verifier calls are conditional.

## Observability
Every run records stage timing, hard constraint, candidate IDs, grounded research activity, verifier/auditor decisions, council sources and final slugs. Never log raw secrets or private chain-of-thought.

## Release invariant
`/api/recommend` and `/api/recommend/stream` must call the same orchestrator and produce the same ranking for the same request/evidence snapshot.
