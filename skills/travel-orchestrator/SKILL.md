# Travel Orchestrator V35 Skill

## Mission
Run one authoritative travel decision workflow that combines traveller intent with verified destination evidence and the real accommodation inventory we can actually offer. The engine must be able to reason both forward (need -> destination -> stay) and backward (strong real stay -> does this improve or weaken the destination choice?) without allowing commercial commission to distort the decision.

## Runtime sequence
1. Parse and normalize the request.
2. Interpret intent; deterministic parser owns explicit hard constraints.
3. Load the independent destination graph.
4. Pre-rank by fit, season, effort, duration and budget.
5. Enrich weather/season evidence.
6. Screen stored dated/local evidence when required.
7. Run Research Scout only where current evidence is needed.
8. Run consistency verifier and deterministic result auditor.
9. Build a broad verified destination candidate set, not only three UI cards.
10. Run the Inventory Reality Pass on the strongest candidates using the actual Linkwise stay feed for the requested window.
11. Rank stay options deterministically by stock/validity, feed price signal, proximity, discount signal and inventory depth. Commission never enters the score.
12. Run the Reverse Check: combine destination fit with inventory viability and explain any material rank movement.
13. Return up to 10 real travel solutions. Every solution is destination + best current stay + alternatives + trade-off + reason for its final rank.
14. Continue to 360-degree destination research only after the user selects a solution.
15. Record bounded learning as non-critical telemetry.

## Dual-pass rule
The first pass answers: `Which destinations fit this traveller?`
The second pass answers: `Which of those trips can we actually support well with the inventory available for these dates?`

A destination may move up when its stay inventory is materially stronger, or move down when the real accommodation options are weak. The UI must disclose this movement. Inventory can influence the final **solution** score, but cannot rewrite factual destination suitability or override hard constraints.

## Agent boundaries
- Facts come from tools/data, not model memory.
- Hard geography, must-have, date and season guards execute before preference or inventory.
- Affiliate commission, EPC or commercial payout must never raise a recommendation score.
- Exact affiliate `tracking_url` is preserved unchanged.
- Feed price is labelled as feed price unless the provider verifies total-trip semantics.
- Unknown stock, room type, final price, weather or transport cost is never presented as confirmed.
- A tool/model failure degrades to verified fallback or a clear no-result state, never fabricated output.

## Result contract
Return up to 10 ranked solutions when evidence supports them. Each solution contains:
- destination fit score;
- inventory score and inventory depth;
- combined final score;
- original destination rank and final solution rank;
- best stay and up to three real alternatives;
- destination rationale;
- stay rationale;
- reverse-check explanation;
- one honest trade-off.

## Cost policy
Use deterministic code for repeatable facts, inventory filters and high-volume scoring. Use LLM agents for semantic interpretation, grounded research comparison and concise human-purpose explanations. Prefer configured free/self-hosted routes where quality gates pass; paid verifier calls are conditional.

## Observability
Every run records stage timing, hard constraints, candidate IDs, inventory candidates checked, surviving inventory-backed solutions, rank movement and final slugs. Never log raw secrets or private chain-of-thought.

## Release invariant
Legacy `/api/recommend` and `/api/recommend/stream` remain deterministic destination engines. The V35 app funnel uses `/api/escape/solve/stream`, which must always run the verified destination pass first and the inventory reality pass second.
