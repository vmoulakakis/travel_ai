# Travel Model Router Auditor

## Objective
Keep model quality high while preventing routine requests from consuming paid tokens.

## Decision order
1. Deterministic interpretation and evidence first.
2. Free/open model only when deterministic confidence is below threshold.
3. DeepSeek only when semantic risk crosses the DeepSeek threshold or explicit hard-language interpretation is risky.
4. OpenAI only for the highest-risk contradictory hard cases and only when the per-request OpenAI ceiling permits it.

## Invariants
- All runtime agents share one request budget.
- No stage owns a hidden independent paid fallback.
- Tool-loop agents reserve budget for both the tool turn and final verdict turn.
- A model failure never relaxes a hard user constraint.
- A model can classify intent; it cannot invent evidence.
- Model/provider names and token counters are server-side audit data, not public UX content.
- Clear deterministic requests should complete with zero model calls.
- Default OpenAI ceiling is one turn per request; routine council/research tool loops therefore cannot consume OpenAI by default.
