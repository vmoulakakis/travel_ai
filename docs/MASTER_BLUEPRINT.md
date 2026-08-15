# Travel Guru — Master Blueprint

**Document role:** μοναδική πηγή αλήθειας για προϊόν, αρχιτεκτονική, δεδομένα, agents, skills, tests, deployment και recovery  
**Current version:** 3.0.0  
**Last updated:** 15 Αυγούστου 2026  
**Current production:** V22 on `main` — `93d7bee4a908b9f1cf1de0e76bc4dc6262654d2f`  
**Release candidate:** V24 Locality-Native on branch `v24-locality-native` — test first, not production until all gates pass  
**Maintainer rule:** κάθε ουσιαστική αλλαγή ενημερώνει version, changelog, decision log, affected acceptance tests και recovery manifest.

---

## 0. Change log

### 3.0.0 — 2026-08-15 — V24 Locality-Native Decision Architecture

- Διορθώνεται η βασική αρχιτεκτονική επιλογής: η πραγματική dated **locality** γίνεται first-class candidate από την αρχή μέχρι το hotel click.
- Το canonical destination παραμένει μόνο optional trusted parent/enrichment. Δεν απαιτείται για να συμμετέχει μία περιοχή.
- Διορθώνεται V23 loader bug που απέρριπτε locality rows χωρίς `canonical_slug`, παρότι το database layer τις επέστρεφε σωστά.
- Το structured form και το free text ενοποιούνται σε ένα canonical 24-dimensional fuzzy semantic contract με positive/negative memberships, priorities και qualifiers.
- Το free text δεν δίνει ονόματα προορισμών. Ο Semantic Formulator κάνει μόνο formulation.
- Προστίθεται exact-locality fuzzy recall με non-compensatory priority floor και explicit negative conflict penalties.
- Το evidence reranking μεταφέρεται πριν παγώσει το shortlist και βαθμολογεί exact localities, όχι canonical parent slugs.
- Η διαμονή ελέγχεται με exact `locality_id`; τα hard stay constraints απορρίπτουν candidate αν δεν υπάρχει matching dated stay.
- Το inventory count παραμένει observability signal και απαγορεύεται να αυξάνει score.
- Το public recommendation slug μεταφέρει αναστρέψιμη locality identity ώστε το υπάρχον UI να μπορεί να φορτώνει exact-locality hotels χωρίς stale canonical remapping.
- Το model policy για quality-critical semantic formulation γίνεται: DeepSeek V4 Pro → strong OpenAI reasoner → self-hosted/HF → deterministic fallback.
- Η persistent learning κατάσταση αποσαφηνίζεται: session semantic contract + outcome observer ενεργά· cross-session personalization και learned ranker απενεργοποιημένα μέχρι explicit consent, επαρκή data και calibration.
- Προστίθεται `test:v24:locality` και το V24 γίνεται μέρος του cumulative `test:strict`.
- Το production V22 δεν αντικαθίσταται μέχρι να περάσουν exact-head CI, live-data audit, preview/canary και rollback verification.

### 2.0.1 — 2026-08-08

Ιστορικό Master Blueprint / V9 recovery baseline. Παραμένει χρήσιμο για historical recovery αλλά δεν περιγράφει πλέον την authoritative matching architecture.

---

## 1. Executive decision

Το Travel Guru είναι **AI Travel Decision System**, όχι hotel catalog, generic itinerary chatbot ή one-shot LLM recommender.

Η authoritative αρχή είναι:

> **Understand → formulate → retrieve real dated localities → apply hard truth → fuzzy multi-criteria recall → evidence rerank → exact-locality stay validation → weather/route/date checks → independent critique → explain.**

Το σύστημα δεν επιτρέπεται:

- να ξεκινά από έναν μικρό fixed destination list και μετά να προσποιείται ότι ερεύνησε όλη την αγορά,
- να χρησιμοποιεί πλήθος hotels/offers ως popularity/relevance score,
- να μετατρέπει nearest-haversine location σε destination identity όταν δεν υπάρχει ασφαλής evidence,
- να θεωρεί keyword occurrence ως verified criterion satisfaction,
- να αφήνει downstream agents να κληρονομούν ένα ήδη λάθος shortlist χωρίς δυνατότητα evidence correction,
- να παρουσιάζει model memory ως travel evidence,
- να μαθαίνει κρυφά από user behavior χωρίς consent/calibration.

### North-star outcome

Ο χρήστης πρέπει να βλέπει προτάσεις που αλλάζουν **ουσιαστικά** όταν αλλάζει ένα σημαντικό criterion ή το free text, και να μπορεί να καταλάβει γιατί άλλαξαν.

---

## 2. System identity and recovery truth

| Component | Authoritative identity |
|---|---|
| GitHub | `vmoulakakis/travel_ai` |
| Default branch | `main` |
| Stable public URL | `https://travel-ai-navy-eight.vercel.app` |
| Vercel project | `travel-ai` / `prj_kdR7ALi7Z1zETL1GcD98t3SFLESA` |
| Vercel team | `vassilis-projects-3bf8541b` |
| Supabase project ref | `bgvgstpoypqbjnemqcqp` |
| Current production code | V22, `93d7bee4a908b9f1cf1de0e76bc4dc6262654d2f` |
| V24 implementation branch | `v24-locality-native` |

### Live dated inventory truth used for V24 validation

For 2026-09-18 → 2026-09-22:

- 288 real dated locality candidates,
- 477 eligible offers,
- 174 localities with a safe canonical parent,
- 114 locality-only candidates that must remain valid candidates rather than being forced onto another island/city.

Counts are observations, not permanent constants. Release health checks must query live data.

---

## 3. Product scope

Primary users and jobs-to-be-done remain those of V2, with one stronger implementation rule:

**The public concept is a trip decision; the internal candidate identity may be a locality/micro-area even when no legacy canonical destination exists.**

The first production scope remains Greece-first. International expansion may reuse the contracts only after equivalent locality, route, availability and evidence quality exists.

---

## 4. Experience principles

1. **Truth before persuasion.**
2. **Decision before inventory display; inventory participates in feasibility, never popularity scoring.**
3. **Free text is first-class input, not a small keyword bonus.**
4. **Hard constraints fail closed.**
5. **Important preference changes must be choice-sensitive.**
6. **No backstage leakage.**
7. **Confidence instead of fake precision.**
8. **Evidence before factual confidence.**
9. **Canonical parent is enrichment, not identity.**
10. **Memory is opt-in, scoped, editable and auditable.**

---

## 5. End-to-end user journey

The funnel remains Welcome → Adaptive Discovery → Brief Confirmation → Progressive Decision → Trip Designs → Reveal → Stay → Save/Feedback.

### V24 behavioral requirement

A rerun with identical dates/budget/form fields but materially different free text must re-run formulation and locality matching. Old recommendations/stays are cleared before the new run. A stale client result must never substitute for a new decision.

### Result object

Public result cards may represent:

- a locality with safe canonical parent, or
- a locality-only candidate.

The user sees a human place name, not synthetic IDs.

---

## 6. Traveler understanding model

### 6.1 Hard constraints

Hard constraints remain deterministic and include geography, dates, budget ceiling where explicitly hard, transport exclusions, traveler/stay requirements, climate dealbreakers and exact accommodation requirements.

An LLM may **extract/formulate** a hard constraint but cannot override its deterministic enforcement.

### 6.2 Soft preferences

Soft preferences are represented as continuous membership values, not binary tags. Examples: food importance, culture, nature, quietness, local character, nightlife avoidance, boutique preference, low effort, walkability.

### 6.3 Canonical 24D semantic contract

V24 uses the ordered dimensions:

`relax, romantic, food, warmth, city, nature, adventure, culture, luxury, boutique, resort, value, family, couple, solo, friends, low_effort, warm_climate, all_weather, beach_season, nightlife, wellness, short_break, shoulder_season`.

The contract contains:

- positive membership per dimension,
- negative membership per dimension,
- ordered priorities,
- qualifiers: avoidCrowds, easyAccess, slowRhythm, walkable, localCharacter,
- confidence,
- positive/negative 24D vectors,
- source provenance.

### 6.4 Free-text formulation rule

The formulator must not name or rank locations. Its only task is to transform meaning into the canonical contract.

Greek, English and Greeklish variants must converge on the same semantic meaning where possible; e.g. “χωρίς πολλή οδήγηση / xoris poli odigisi / without much driving” maps to positive `low_effort`, not a negated low-effort intent.

---

## 7. Matching architecture

### 7.1 Candidate universe

V24 candidate identity is:

`locality + date-window + optional canonical parent + access confidence + stay evidence + semantic profile`.

Later versions can expand this to explicit neighbourhood/stay-archetype pairs, but they must not collapse back to canonical destination-only ranking.

### 7.2 Authoritative pipeline

1. Parse typed request.
2. Formulate structured + free text into 24D contract.
3. Retrieve **dated eligible localities** from live inventory.
4. Materialize every valid locality as a first-class candidate.
5. Apply deterministic hard geography/feasibility gates.
6. Apply coarse deterministic baseline features.
7. Apply exact-locality 24D fuzzy scoring.
8. Apply priority floors and explicit-negative conflict penalties.
9. Run grounded locality evidence reranker **before shortlist freeze**.
10. Query exact-locality dated stays and apply hard/soft accommodation criteria.
11. Apply weather/season/route evidence; unknown route data lowers confidence.
12. Reapply semantic/evidence signals so downstream stages cannot erase user intent.
13. Run explicit research needs (events/history etc.) with fail-closed truth rules.
14. Research Scout, independent verifier and auditor.
15. Diversity / portfolio construction.
16. Traveler Council / final explanation.
17. Persist anonymous session contract and outcomes for evaluation.

### 7.3 Fuzzy multi-criteria model

For locality `l` and user contract `u`, semantic fit is a bounded fuzzy aggregation of memberships. Strong negative dimensions generate conflict penalties. The strongest declared priority receives a non-compensatory floor/penalty so unrelated strengths cannot fully compensate for failure on “X first”.

The implementation may evolve toward Choquet-style interaction terms for dependent criteria, but any such change requires a new eval gate.

### 7.4 Utility model

`U = base feasibility + semantic fuzzy fit + evidence adjustment + stay fit + weather/season + traveler fit + diversity - friction - risk - uncertainty - negative conflicts`

**Inventory depth is excluded.** `eligible_offer_count` may be logged but must not appear in ranking expressions.

### 7.5 Identity rule

A canonical destination parent can be assigned only by trusted textual identity or a deliberately tight safe mapping rule. A wide nearest-haversine rule is forbidden. A locality without safe parent remains locality-only.

### 7.6 Diversity

Diversity penalizes semantic near-duplicates, same-parent repetition and excessive same-region repetition. Five cards must represent materially different trip shapes where the eligible pool permits it.

---

## 8. Evidence and Area Research Engine

### 8.1 Two evidence layers

**Recall evidence:** 24D locality/hotel semantic profiles are useful for broad recall but are not sufficient travel truth.

**Decision evidence:** public/authoritative travel evidence reranks candidates and verifies important claims.

### 8.2 V24 locality evidence reranker

For Top-K localities the system retrieves public evidence and scores only supplied text against the formulated contract. The reasoner is explicitly forbidden from using model memory. Missing evidence means uncertainty, not automatic rejection.

Current general locality rerank sources are Wikipedia/Wikivoyage. They are not sufficient for time-sensitive claims.

### 8.3 Time-sensitive/critical claims

Events, opening times, routes, weather, availability, safety and critical operational claims require the source hierarchy and freshness rules from V2. A Wikipedia snippet cannot prove live availability, event status or opening hours.

### 8.4 Explicit research needs

If the user explicitly requires a dated event or specific evidence-heavy feature, absence of verified evidence is fail-closed for the relevant candidate.

---

## 9. Stay availability and hotel matching

### 9.1 Exact locality

Hotel retrieval must use `locality_id` for locality-native recommendations. It must not expand to a nearby canonical destination radius just because the legacy parent exists.

### 9.2 Same semantic contract

The hotel reranker receives the same 24D traveler contract used for locality choice, plus explicit hard/soft stay requirements.

### 9.3 Evidence semantics

Negated phrases such as “without breakfast”, “no pool”, “not beachfront” must not become positive evidence merely because the keyword appears.

### 9.4 Availability truth

Only offers valid across the requested date window and not explicitly out of stock participate. Unknown stock remains unknown; it is not described to the traveler as confirmed availability.

---

## 10. Agent council and skill registry

V24 runtime skills:

1. **Semantic Formulation** — structured + free text → 24D contract.
2. **Dated Locality Retrieval** — real localities for exact dates.
3. **Fuzzy Multi-Criteria Matching** — exact-locality semantic recall.
4. **Locality Evidence Reranking** — grounded correction before shortlist.
5. **Exact-Locality Stay Gate** — dated hotels + hard/soft stay criteria.
6. **Season/Route/Weather** — feasibility and uncertainty.
7. **Research Scout** — finalist evidence using tools.
8. **Independent Critique** — deterministic + separate reasoning audit.
9. **Session Learning Observer** — evaluation data only until learning gate passes.

Agent names are not proof of agency. A role counts as an agent only when it has bounded inputs, allowed tools, output schema and independent work.

---

## 11. Orchestration state machine

`DISCOVER → FORMULATE → LOCALITY_RETRIEVE → HARD_GATE → FUZZY_RECALL → EVIDENCE_RERANK → EXACT_STAY_GATE → WEATHER_ROUTE → RESEARCH → DIVERSIFY → CRITIQUE → REPAIR? → REVEAL → FINAL_RECHECK → SAVE/FEEDBACK`

A downstream stage may reject or reorder candidates but must not silently erase the canonical semantic contract.

---

## 12. Model strategy

### 12.1 Quality-critical formulation route

Preferred route:

1. `deepseek-v4-pro` when configured,
2. strong OpenAI reasoner (`OPENAI_REASONER_MODEL`; V24 code default `gpt-5.1`),
3. self-hosted OpenAI-compatible model,
4. Hugging Face/open-model fallback,
5. deterministic multilingual formulation.

Cheaper models may handle extraction/low-risk tasks. The quality-critical semantic contract must not silently downgrade to a weak model without observability/fallback semantics.

### 12.2 Future semantic retrieval

Multilingual embeddings/rerankers remain planned evaluation candidates (`BAAI/bge-m3`, `bge-reranker-v2-m3`, `multilingual-e5-large`). They are not declared production dependencies until Greek travel benchmarks prove improvement.

### 12.3 Learned ranking

LambdaMART/LambdaRank/NDCG optimization remains disabled until there are enough validated positive outcomes, an offline holdout set, calibration and bias checks. A small number of clicks/selections must never train production ranking directly.

---

## 13. Persistent memory

### Current truth

Active:

- anonymous session semantic contract,
- derived structured/stay constraints,
- recommendation impressions/selections/offer events/outbound clicks as evaluation outcomes.

Not active as production ranking input:

- cross-session behavioral personalization,
- hidden inferred traveler personality,
- learned preference model,
- LambdaMART/LambdaRank reranker.

### Activation gate for durable personal memory

Before cross-session personalization:

1. explicit user-facing memory UX and consent,
2. view/edit/delete controls,
3. purpose and retention policy,
4. sufficient repeated signals,
5. calibration/eval proving benefit without lock-in,
6. privacy/security review.

---

## 14. Data model

The long-term entities from V2 remain valid. V24 additionally makes these identities explicit:

- `locality_id` — first-class matching identity,
- `canonical_parent_slug` — nullable enrichment,
- `semantic_contract_v24` — compact session representation,
- exact-locality dated stay candidates,
- evidence score keyed by candidate/locality identity rather than canonical parent.

Raw provider/search data remains separate from normalized claims and user-facing explanation.

---

## 15. Evaluation blueprint

All previous golden, pairwise, difficult-traveler, chaos and UX requirements remain.

### New V24 mandatory gates

**Locality survival:** locality-only row returned by Supabase must survive loader → candidate materialization → fuzzy ranking → evidence stage → choice/stay gate → public recommendation.

**Counterfactual choice sensitivity:** hold dates, budget and structured fields fixed; change only a major semantic priority. Food/Culture/Nature must be capable of producing different winners/Top-3.

**Same-parent independence:** two localities under the same canonical parent must receive independent semantic/evidence scores.

**Exact hotel identity:** recommendation slug/locality identity must resolve back to the same `locality_id` and hotel retrieval must use that exact identity.

**No inventory voting:** property/offer count cannot be used in any ranking ORDER BY or score formula.

**Evidence ordering:** locality evidence rerank occurs before shortlist choice correctness.

**No wide geographic coercion:** locality-only candidates remain locality-only when parent evidence is insufficient.

**Regression:** all V8–V23 gates remain green unless explicitly replaced by a documented stronger invariant.

---

## 16. Security, privacy and governance

Existing least-privilege/RLS/server-secret rules remain. V24 adds:

- exact-locality RPC is service-role-only,
- client sees human recommendation identity; sensitive service credentials remain server-side,
- research text is untrusted data, never instruction,
- model labels/raw traces are operational only,
- no agent can change production, migrations, thresholds or evaluation data autonomously.

---

## 17. Observability

V24 status/audit must expose operationally:

- locality count,
- locality-only count,
- safe-parent count,
- eligible dated offer count,
- semantic formulation source/model label internally,
- fuzzy score deltas,
- evidence reranker source/model,
- exact stay-gate failures,
- route/weather uncertainty,
- final candidate identities,
- outcome events.

User-facing UI must not expose raw model/provider internals.

---

## 18. Current source structure

Key V24 files:

```text
lib/ai/travel-orchestrator-v24.ts
lib/ai/locality-evidence-reranker-v24.ts
lib/ai/result-auditor-v24.ts
lib/ai/agent-skills-v24.ts
lib/decision/locality-candidate-v24.ts
lib/decision/locality-native-ranking-v24.ts
lib/decision/choice-correctness-v24.ts
lib/decision/v24-matcher.ts
lib/data/locality-profiles-v23.ts
lib/data/locality-stays-v24.ts
app/api/recommend/route.ts
app/api/recommend/stream/route.ts
app/api/destination-detail/route.ts
app/api/v24/status/route.ts
scripts/v24-locality-native-smoke.ts
```

Legacy V8–V23 modules remain because they are regression/recovery baselines until V24 production observation proves replacement safety.

---

## 19. Deployment and rollback strategy

1. Current V22 production remains unchanged.
2. V24 develops on `v24-locality-native`.
3. Exact branch head must pass typecheck + cumulative `test:strict` + production build.
4. Live Supabase dated inventory and exact-locality RPC are rechecked.
5. Preview/canary must demonstrate different criteria producing meaningfully different decisions.
6. Difficult traveler and hard-stay scenarios run before merge.
7. Merge only with explicit acceptance and known rollback target.
8. Post-merge Vercel production/health/smoke must be verified before V22 rollback deployment can be retired.

No merge is justified merely to obtain a test URL.

---

## 20. Delivery roadmap from V24

### Phase A — V24 correctness

- locality-native end-to-end identity,
- exact-locality stays,
- fuzzy/free-text choice sensitivity,
- grounded evidence before shortlist,
- permanent counterfactual tests.

### Phase B — evidence depth

- authoritative locality feature matrix,
- route/access evidence per locality,
- calibrated food/culture/nature/crowd/local-character evidence,
- freshness/confidence/source per feature.

### Phase C — retrieval/reranking

- Greek benchmark for multilingual embeddings,
- broad vector retrieval,
- strong Top-K reranker,
- interaction-aware scoring.

### Phase D — memory/learning

- explicit memory UX/consent,
- sufficient outcomes,
- offline learned-ranker benchmark,
- shadow/canary before production influence.

---

## 21. Decision log

| ID | Decision | Reason |
|---|---|---|
| D-001–D-015 | Historical decisions from Blueprint v2.0.1 | Retained as historical governance baseline. |
| D-016 | Locality is first-class matching identity | Real inventory contains valid places outside the legacy canonical set; forcing parent identity causes wrong choices. |
| D-017 | Canonical destination is nullable enrichment | Geographic proximity alone cannot establish island/city identity. |
| D-018 | Structured + free text share one 24D fuzzy contract | Prevents free text from becoming a weak ad-hoc bonus. |
| D-019 | Strong priority uses non-compensatory floor | “Culture first” cannot be bought off by unrelated value/effort features. |
| D-020 | Evidence reranking precedes shortlist freeze | Downstream agents cannot recover a candidate that deterministic recall already discarded. |
| D-021 | Hotel retrieval uses exact locality identity | Prevents nearby but irrelevant hotels from dominating the offer. |
| D-022 | Inventory count is never relevance | Supply depth is not traveler fit. |
| D-023 | Quality-critical formulation routes to strong reasoners | Semantic misunderstanding propagates through every downstream stage. |
| D-024 | Current outcome store is observer, not production memory | Data volume/consent/calibration are insufficient for learned personalization. |
| D-025 | V8–V23 remain regression baselines during V24 release | Stronger architecture must prove it preserves hard truth/continuity before old paths are removed. |

---

## 22. Current unknowns / explicit next research

- authoritative locality route/access profiles for all 288+ live localities,
- robust evidence-backed feature matrix beyond hotel-derived semantic profiles,
- exact commercial/provider strategy for food/events/opening-hours/place evidence,
- Greek retrieval benchmark for BGE-M3/E5 and rerankers,
- learned-ranker minimum data threshold and calibration method,
- cross-session memory consent/retention UX,
- canonical result-card UX for locality-only places,
- preview deployment quota/process reliability.

Unknowns lower confidence; they are not silently filled from model memory.

---

## 23. Immediate release sequence

1. Finish V24 code integration.
2. Run exact-head typecheck.
3. Run all V8→V24 strict gates.
4. Run production build.
5. Fix algorithm/code when a meaningful test fails; do not weaken the test.
6. Run live-data locality count/coverage audit.
7. Run counterfactual real-data scenarios.
8. Run exact-locality hotel smoke.
9. Create/verify preview or isolated canary without changing production.
10. Only then consider merge/promotion.

---

## 24. Definition of V24 release readiness

V24 is release-ready only when all are true:

- 100% hard-constraint compliance in regression/golden suite,
- locality-only candidate survives end-to-end,
- same-parent localities remain independently rankable,
- free-text counterfactuals materially alter choices where evidence differs,
- exact-locality hotels load for selected recommendation,
- no inventory-count ranking,
- no unsafe wide canonical mapping,
- explicit research requirements fail closed without evidence,
- no raw technical failure leaks to traveler,
- typecheck + cumulative `test:strict` + build pass on exact head,
- live candidate/offer probe is healthy,
- preview/canary passes,
- rollback target recorded.

---

## 25. Recovery procedure

1. Clone `vmoulakakis/travel_ai`.
2. Check `main` production SHA and this document before assuming current architecture.
3. Install with repository-declared Node/npm versions.
4. Recreate environment from `.env.example`/secret managers; never from docs/chat.
5. Verify Supabase project `bgvgstpoypqbjnemqcqp` migrations/RPC permissions.
6. Verify Vercel project `prj_kdR7ALi7Z1zETL1GcD98t3SFLESA` and deployment target.
7. Run `npm run typecheck`, `npm run test:strict`, `npm run build`.
8. Query V24 status/live locality counts.
9. Verify full brief → locality recommendation → exact-locality stay flow.
10. Promote only after rollback target and smoke tests are documented.

---

## 26. Historical V9 recovery baseline

The v2.0.1 V9 recovery manifest (commits/PRs #11–#18 and V9 security hardening) remains historical recovery information. It must not be used to infer current candidate counts, current production release, current model routing or current matching architecture.

---

## 27. Production truth hierarchy

When sources disagree, precedence is:

1. current `main` + green CI,
2. verified Vercel production deployment and health,
3. live Supabase schema/data/RPC behavior,
4. release audit/test artifacts,
5. this Blueprint,
6. historical docs/chat/memory.

The Blueprint must be updated immediately when a promoted production change makes it stale.

---

## 28. Core invariant

**The system must search the real dated choice space the traveler can actually use, formulate what the traveler means before ranking, preserve hard truth, and use evidence to correct—not decorate—the decision.**
