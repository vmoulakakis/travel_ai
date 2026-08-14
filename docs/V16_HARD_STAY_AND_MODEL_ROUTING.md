# V16 hard stay requirements and model routing

## Non-negotiable contract

1. User language such as `κατάλυμα μπροστά στη θάλασσα μόνο` is a stay-level hard constraint, not merely a beach-destination preference.
2. Hard stay constraints are eligibility gates before finalists. They do not add hotel-supply weight to destination scoring.
3. A language model may classify what the user asked for; it may never manufacture property evidence.
4. Property facts fail closed. For `BEACHFRONT`, a property name containing `Beach` is not proof. Explicit beachfront/seafront/on-the-beach wording is required.
5. Feed date coverage is not a room reservation and must still be confirmed with the provider.
6. The same hard requirement must survive the finalist gate, the stay cards, and the final availability recheck; no later stage may silently substitute a looser stay.

## Cost ladder

- Tier 0: deterministic parsing/ranking — always first, zero tokens.
- Tier 1: self-hosted or Hugging Face OpenAI-compatible open model — only when deterministic confidence falls below threshold.
- Tier 2: DeepSeek — only above the DeepSeek risk threshold or for explicit high-risk hard-language interpretation.
- Tier 3: OpenAI — only above the highest risk threshold and only for hard/contradictory cases. Default per-request ceiling is one OpenAI turn.

All agents share one request budget. A provider call made by one stage consumes the same budget available to later stages.

## Default ceilings

- deterministic confidence threshold: 0.93
- DeepSeek risk threshold: 0.68
- OpenAI risk threshold: 0.90
- free output tokens per turn: 180
- DeepSeek output tokens per turn: 240
- OpenAI output tokens per turn: 180
- paid turns per request: 2
- OpenAI turns per request: 1
- total reserved output-token ceiling: 1000

Thresholds are configurable with server-only environment variables; they must never be exposed in the public UI.
