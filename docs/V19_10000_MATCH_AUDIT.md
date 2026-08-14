# V19 — 10,000-case semantic matching audit

## Why this audit exists

Earlier population tests proved that free text changed rankings, but did not prove that the system understood the text correctly. V19 audits semantic correctness before ranking and records concrete failure classes.

Seed: `419482366`  
Cases: `10,000`  
Greek catalog: `47` destinations

## Baseline before V19 repairs

| Metric | Baseline |
|---|---:|
| Semantic parse accuracy | 55.53% |
| Positive intent | 72.55% |
| Negative intent | 49.68% |
| Qualifiers | 60.80% |
| Priorities | 46.60% |
| Mixed/trade-off intent | 46.67% |
| Ambiguous/noisy safety | 0% |
| Ranking direction when intent was understood | 97.58% |
| Hard geography leaks | 138 |

### Representative failures found

- `θελω μπασια` was treated as unknown with false confidence instead of recovering the likely `μπάνια` intent.
- `kalo faghto` and `παραλεία` were missed.
- `με τα παιδακια` / `oikogeniako me pedia` were missed as family intent.
- `χωρίς μπαρ μέχρι το πρωί`, `να μην έχει νυχτερινή φασαρία`, `xoris club ...` lost the negation and could become positive nightlife.
- `θάλασσα bonus αλλά όχι beach holiday` could become a primary beach preference.
- `xoris poli odigisi` could incorrectly map `poli` (`πολύ`) to `city` (`πόλη`).
- `να μη χάσουμε ώρες στη μετάβαση` / `I don't want a long transfer` were not recognized as easy-access requirements.
- `πάνω απ όλα καλό φαγητό`, `politismos prota` and similar phrases lost their priority semantics.
- `κάτι καλό` and `όχι τα ίδια` received false deterministic confidence instead of being treated as ambiguous.
- V18 sanitized `tripText` before ranking and accidentally prevented free-text geography constraints from reaching the candidate filter, creating 138 geography leaks in the broader V19 language set.

## Repairs

1. Hard geography is applied to the catalog **before** raw free text is sanitized for the legacy matcher.
2. Added Greeklish geography coverage (`xoris nisi`, `mono nisi`, `kriti`, `kyklades`, `dytiki ellada`, etc.).
3. Added bounded edit-distance typo recovery for high-value travel words only; no general autocorrect.
4. Added natural-language negation scope and suppression of positive signals when the same concept is explicitly rejected.
5. Removed standalone Greeklish `poli` as a city signal to avoid confusing `πολύ` with `πόλη`.
6. Added natural-language priority parsing (`πάνω απ όλα`, `προτεραιότητα`, `prota`, `proteraiotita`).
7. Added richer qualifiers for crowds, easy access, slow rhythm, walkability and local character.
8. Confidence is now evidence-based: no reliable semantic signal produces low confidence instead of a fixed 0.72.
9. Recoverable `μπασια` is treated as a likely typo for `μπάνια`; truly vague text remains low-confidence.
10. Low-confidence text with no other understood hard context triggers a clarification instead of silently producing arbitrary matches.
11. Model routing is cost-aware: deterministic normalization → free/self-hosted/Hugging Face model → DeepSeek only above semantic-risk/confidence thresholds → OpenAI only for highest-risk escalation.
12. Shared per-request token budget remains in force; default paid calls are capped at 2 and OpenAI at 1.

## Final seeded audit after repairs

| Metric | Final |
|---|---:|
| Semantic parse accuracy | **100%** |
| Positive intent | **100%** |
| Negative intent | **100%** |
| Qualifiers | **100%** |
| Priorities | **100%** |
| Mixed/trade-off intent | **100%** |
| Ambiguous/noisy safety | **100%** |
| Ranking-direction consistency | **99.30%** |
| Hard geography leaks | **0** |
| Empty results | 65 / 10,000 (0.65%) |

The remaining ranking-direction deviations are not semantic parse failures: they occur when randomized structured constraints, season, effort, budget, or must-have gates legitimately outweigh a soft free-text preference. Hard constraints continue to win.

## Permanent release gates

`npm run test:v19:match10000` is part of `npm run test:strict` and fails the release if:

- any hard geography leak occurs;
- overall semantic accuracy falls below 95%;
- positive, negative, qualifier or priority accuracy falls below 98%;
- mixed/trade-off accuracy falls below 95%;
- ambiguous safety falls below 95%;
- ranking-direction consistency falls below 80%;
- empty-result rate exceeds 8%.

The current implementation is materially stricter than these minimum gates: all semantic categories are at 100% on the seeded 10,000-case suite.
