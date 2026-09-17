# Travel Orchestrator — Canonical V44 Skill

## Mission
Run one authoritative travel decision workflow that converts a traveller's real intent into a small set of evidence-aware, inventory-backed trip solutions. Preserve hard constraints, separate user fit from commercial value, and make every important ranking movement explainable.

This file is the canonical orchestration contract for the current TravelAI product. Older V35/V38/V40 names describe implementation history, not competing product rules.

## Current product contract

The engine may maintain a broad internal candidate set and the V42 inventory solver may rank up to 8 inventory-backed solutions. The consumer discovery UI reveals **exactly 3 strongest solutions** at a time. This distinction is deliberate:

`broad candidate universe -> deterministic/semantic ranking -> real inventory pass -> top 3 decision surface`

Do not change the public choice count merely because an internal endpoint can return more candidates.

## Runtime sequence
1. Parse and normalize the request.
2. Extract explicit hard constraints deterministically.
3. Use semantic interpretation only for intent that deterministic parsing cannot safely resolve.
4. Load independent destination knowledge.
5. Pre-rank by traveller fit, season, effort, duration and budget.
6. Enrich current evidence only where freshness changes the decision.
7. Verify consistency and hard constraints before commerce enters the flow.
8. Fetch the real stay inventory once for the requested window where the current solver supports it.
9. Score stays against persistent product knowledge vectors plus lexical/structured evidence.
10. Combine destination fit and stay viability without allowing commission to distort suitability.
11. Keep a broader internal solution set for resilience and comparison.
12. Present the strongest **3** solutions in the discovery surface with reason and trade-off.
13. Continue into destination/stay detail and 360° planning only after the traveller chooses.
14. Record bounded telemetry for later evaluation and learning.

## Dual-pass reasoning
First ask: `Which destinations fit this traveller?`
Then ask: `Which of those trips are actually supportable by the stay inventory for these dates and constraints?`

Inventory may move a solution up or down. It must never rewrite factual destination suitability, violate a hard constraint, or turn an unknown into a confirmed fact.

## Agent runtime policy — 2026
Use the MyAgenticTeam control plane before adding or changing agents.

- deterministic functions, retrieval and validation before model calls;
- smallest capable agent set;
- bounded tool loops with explicit stop conditions;
- one shared request budget across model/tool stages;
- tool discovery only when the available tool set is genuinely large;
- durable/background execution only for work that can safely outlive a request;
- human approval for sensitive or irreversible actions;
- structured traces, latency, failure stage and evidence state rather than private chain-of-thought;
- reusable skills loaded progressively instead of injecting every skill into every prompt.

## Agent boundaries
- Facts come from tools/data, not model memory.
- Hard geography, date, must-have and stay constraints execute before preference or inventory scoring.
- Affiliate commission, EPC or commercial payout never raises destination/user-fit score.
- Exact affiliate `tracking_url` is preserved unchanged.
- Feed price remains a price signal unless provider semantics establish a full trip total.
- Unknown stock, room type, final price, weather or transport cost is never presented as confirmed.
- A tool/model failure degrades to verified fallback or a clear no-result/recovery path, never fabricated output.
- The interface may show human-readable progress only for backend work that actually occurs.

## Public result contract
The initial decision surface returns 3 distinct solutions when evidence supports them. Each needs:
- destination;
- real stay or explicit inventory state;
- overall fit;
- concise reason;
- one meaningful trade-off or uncertainty;
- relevant evidence state;
- a clear next action.

If fewer than 3 defensible solutions exist, show the real count and a recovery path. Never manufacture filler.

## Cost and latency policy
Use deterministic code for repeated facts, inventory filtering and high-volume scoring. Use models for ambiguous intent, grounded synthesis and concise explanation. Parallelize independent I/O. Prefer a single inventory read over sequential per-destination lookups. Reserve expensive verification for cases where it can change the decision.

## Observability
Record stage timing, hard constraints, candidate IDs, inventory rows checked, surviving solutions, rank movement, fallback path and final slugs. Do not log secrets, raw private conversations when structured fields suffice, or private chain-of-thought.

## Release invariant
Current discovery UI uses `V40DiscoveryExperience` for compatibility and calls `/api/escape/solve-v42`. Version labels are not architecture. Do not replace these production interfaces merely to make names look current. Changes must pass typecheck, strict regression tests, production build, responsive/a11y review and runtime verification before GREEN.
