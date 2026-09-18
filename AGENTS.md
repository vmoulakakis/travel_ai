# TravelAI Agent Instructions — V45

This repository is the canonical TravelAI source. Before changing AI decision, retrieval, memory, learning, tool use, or recommendation behavior, read:

1. `skills/travel-orchestrator/SKILL.md` — canonical decision/runtime contract.
2. `skills/travel-learning/SKILL.md` — persistent traveler learning and feedback limits.
3. `skills/travel-model-router/SKILL.md` — model escalation and request budgets.
4. `skills/travel-regression-guardian/SKILL.md` — release/regression requirements.
5. `skills/web-design/SKILL.md` for substantial public UI/design work.

## Canonical runtime rule

V45 activates the V44 intelligence fabric while preserving the regression-tested deterministic core.

Required order:

`current request -> persistent traveler context -> deterministic hard gates -> hybrid knowledge retrieval -> candidate ranking -> current evidence/inventory -> skeptical audit -> traveler advocate -> bounded synthesis -> telemetry -> learning`

The current request always outranks persistent memory. Persistent learned preferences are soft priors only.

## Knowledge contract

- Canonical travel knowledge: `travel_knowledge_entities_v44`, `travel_knowledge_facts_v44`, `travel_knowledge_evidence_v44`, `travel_knowledge_edges_v44`.
- Hybrid retrieval: `search_travel_knowledge_v45`.
- The 16-dimensional vector is a structured travel-intent vector, not a general language embedding.
- Do not claim dense multilingual semantic retrieval unless a separately versioned embedding column/model exists and is populated.
- Facts used to change ranking must retain evidence/freshness semantics.
- Never convert unknown/stale evidence into certainty.

## Persistent traveler memory

- Profile: `traveler_intelligence_profiles_v44`.
- Signals: `traveler_signal_events_v44`.
- Read through `get_traveler_context_v45`.
- Write/update through `upsert_traveler_profile_v45` and `record_traveler_signal_v45`.
- Do not store private chain-of-thought.
- Do not store raw conversation when structured preference fields suffice.
- Behavioral learning is attribution-aware and capped; it cannot override hard constraints or an explicit current dislike.

## Tool contract

Every runtime agent may use only tools listed in `travel_agent_registry_v44.allowed_tools`.
Every allowed tool must resolve in `travel_tool_registry_v45`.
Use `get_travel_agent_tool_contract_v45(agent_id)` to inspect the executable contract.

A tool call must respect:
- trust level;
- freshness requirement;
- max latency;
- read/write boundary;
- failure policy.

Do not silently substitute a different tool/source when the policy is fail-closed.

## Observability

Material recommendation requests must create V45 agent-run telemetry when server persistence is configured:
- `travel_agent_runs_v44`;
- `travel_agent_steps_v44`;
- tool keys used per stage;
- bounded evidence refs;
- confidence/failure state.

Telemetry stores decision state, not hidden chain-of-thought.

## Public decision invariant

Internal candidate sets may be broad. The initial consumer decision surface shows the strongest **3 distinct defensible solutions** when available. If fewer than 3 pass, return the real count plus a recovery path. Do not fabricate filler.

Affiliate economics never improve destination/user-fit ranking.

## Release gate

Do not call a V45 change complete until:
- TypeScript/typecheck passes;
- strict regression suite passes;
- production build passes;
- database migrations are applied/tested when applicable;
- tool-contract health has zero unresolved bindings;
- memory/retrieval smoke tests pass;
- current deterministic hard constraints still win over memory/model/retrieval.
