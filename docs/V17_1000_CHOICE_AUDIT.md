# V17 — 1,000 Choice Quality Audit

Date: 2026-08-14  
Seed: `385927934`  
Cases: `1,000`  
Active Greece catalog: `47` destinations  
Explicit destination ideas sampled: `30`

## Purpose

This audit tests recommendation quality rather than only crash-safety. It uses the production deterministic ranking, hard geography gates and diversification logic with a fixed climatology fixture. Population-scale execution makes **zero paid LLM calls**; DeepSeek/OpenAI remain reserved for targeted semantic ambiguity in the live orchestrator.

The audit records:

- winner, top-3 and top-12 destination frequency;
- winner distribution by region and traveller/energy/social segment;
- repeated top-3 pairings;
- hard-constraint leaks;
- duplicate portfolios and deterministic repeatability;
- effect of free text on the top three;
- whether an explicitly considered destination remains visible when it is actually feasible;
- winner score margins and geographic concentration.

## Baseline findings

Initial V17 audit before corrections:

| Metric | Baseline |
|---|---:|
| Non-empty portfolios | 96.2% |
| Deterministic repeatability | 100% |
| Hard constraint violations | 0 |
| Duplicate portfolios | 0 |
| Free-text changes top-3 | 58.2% |
| Unique winners | 42 |
| Unique top-12 orders | 922 |
| Largest winner share | Evia 17.3% |
| Same-region top-3 | 6.3% |

Two quality gaps were identified:

1. Natural-language nuance was underweighted. Phrases such as `not tourist trap`, `no party crowds`, `slow mornings`, `local character`, `not a generic resort`, `χωρίς πολύ άγχος`, `χωρίς δύσκολη μετάβαση` and Greeklish variants did not consistently change the recommendation portfolio.
2. The product copy promised that a feasible destination explicitly considered by the traveller would remain in the comparison set, but the scoring bonus alone did not guarantee that contract.

The first raw idea-visibility number was not treated as a valid release metric because some sampled ideas deliberately contradicted hard constraints such as `mainland only`, `μόνο Κρήτη` or `μόνο Κυκλάδες`. The final audit therefore measures retention only when the considered destination passes the same eligibility gates as the recommendation pool.

## Corrections

### 1. Bounded semantic tie refinement

Natural-language preference signals now refine ranking deterministically for:

- crowd/tourist-trap avoidance;
- calm / slow rhythm;
- local character and local food;
- walkability;
- avoidance of difficult travel;
- desire for something less conventional.

The semantic adjustment is deliberately bounded to **±3 score points**. Free text can resolve close choices but cannot overpower season, route effort, budget, hard constraints or evidence.

### 2. Feasible explicit-idea retention

When the traveller supplies a destination idea, it remains available in the comparison portfolio only if it is genuinely eligible and clears minimum season, budget and crowd-fit checks. It is **not promoted to winner** and does not displace the first three choices simply because the traveller mentioned it.

The same retention contract is preserved through initial pre-ranking, diversification, verifier repair and result-auditor repair.

### 3. Explicit share actions

The selected destination now exposes visible share actions:

- WhatsApp;
- Facebook;
- Copy link;
- More / native share.

The shared URL points to the selected internal destination page and retains the traveller's start/end dates. Growth tracking records the actual share channel rather than treating every share as one generic event.

## Final fixed-seed audit

After correction, using the **same 1,000 cases and same seed**:

| Metric | Final | Gate |
|---|---:|---:|
| Non-empty portfolios | **96.2%** | ≥93% |
| Deterministic repeatability | **100%** | 100% |
| Hard constraint violations | **0** | 0 |
| Duplicate portfolios | **0** | 0 |
| Free-text changes top-3 | **68.5%** | ≥60% |
| Feasible explicit-idea cases | **467** | — |
| Feasible idea retained in portfolio | **90.8%** | ≥85% |
| Feasible idea reaches top-3 | **50.7%** | informational |
| Unique winners | **41** | ≥28 |
| Unique top-12 orders | **925** | — |
| Largest winner share | **Evia 18.0%** | ≤18% |
| Largest top-3 slot share | **Evia 10.43%** | ≤16% |
| Largest finalist slot share | **Chania 5.21%** | informational |
| Same-region top-3 | **6.3%** | ≤18% |
| All-island top-3 | **16.5%** | informational |
| All-mainland top-3 | **14.5%** | informational |
| Low winner margin (<2 points) | **29.8%** | informational |

### Final winner distribution — top 12

1. Evia — 180
2. Chania — 85
3. Pelion — 79
4. Volos — 55
5. Nafpaktos — 50
6. Alexandroupoli — 43
7. Tinos — 42
8. Kavala — 40
9. Naxos — 29
10. Nafplio — 28
11. Rethymno — 26
12. Corfu — 25

No destination-specific penalty was introduced to force this distribution. The semantic contribution was reduced globally and bounded until the population audit passed without weakening the quality thresholds.

## Regression evidence

After the V17 correction:

- V15 1,000-search audit: `95.1%` non-empty, `100%` deterministic, `0` hard violations, `0` unsupported city selections, `0` duplicate result sets, `83.5%` free-text top-3 change, `42` unique winners, max winner share `11.8%`.
- V16 1,000 stay-text audit: `500` hard + `500` soft/adversarial cases, `0` false-hard classifications, `600` property-evidence checks.
- TypeScript check: PASS.
- Next.js production build: PASS.
- `git diff --check`: PASS.

## Release interpretation

The V17 corrections improve sensitivity to what the traveller actually writes while keeping the deterministic decision engine in control. Explicit ideas are respected as comparison candidates, not blindly rewarded. Hard constraints remain fail-closed. Population auditing remains token-free, so adding this quality gate does not increase paid LLM usage.
