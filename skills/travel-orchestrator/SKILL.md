# Travel Orchestrator — Canonical V45 Offer Holiday Finder

## Mission
Run one authoritative holiday-finding workflow that converts a traveller's real need into a small set of evidence-aware, **offer-backed** trip solutions. Preserve hard constraints, separate traveller fit from commercial value, recover intelligently from empty exact inventory, and make every important ranking movement explainable.

Older V35/V38/V40/V44 names describe implementation history, not competing product rules.

## Current product contract
The active user journey is:

`natural brief -> max 2 adaptive questions -> inline trip frame -> exact offer search -> bounded automatic recovery if needed -> up to 3 holiday matches -> selected stay -> 360° trip`

The engine may maintain a broader internal candidate set and the current solver may rank up to 8 inventory-backed solutions. The consumer surface reveals up to **3 strongest distinct holiday matches** when evidence supports them.

Do not manufacture a third card merely because the UI can render three.

## Runtime sequence
1. Parse and normalize the natural-language brief.
2. Extract explicit hard constraints deterministically.
3. Use semantic interpretation only for intent that deterministic parsing cannot safely resolve.
4. Ask at most two high-information clarification questions when required.
5. Collect the practical frame inline: origin, dates, total budget and traveler group.
6. Load independent destination knowledge.
7. Fetch real offer inventory for the exact requested period.
8. Score offer/stay rows against persistent product semantic vectors plus lexical/structured evidence.
9. Combine destination suitability and offer viability using traveler fit, value, location and evidence signals exposed by the solver.
10. Preserve hard constraints and factual source boundaries during reranking.
11. If exact inventory returns no defensible solution, keep the profile fixed and run a bounded recovery over nearby future date windows.
12. Select the closest verified window with real solutions; disclose any date shift explicitly.
13. Keep a broader internal solution set for resilience/diversity.
14. Present up to three distinct offer-backed holiday matches with real property/product evidence.
15. Continue into destination/stay detail and 360° planning only after the traveller chooses.
16. Record bounded telemetry for later evaluation and learning.

## Dual-pass reasoning
First ask: `What holiday is this traveller actually asking for?`
Then ask: `Which real offer products can support that holiday for these dates, budget and constraints?`

Real offer products may move a solution up or down because they change practical viability. They must never rewrite hard constraints, invent destination suitability or turn unknown evidence into confirmed fact.

## Empty-inventory recovery policy
Empty inventory is an **agent problem**, not a user-form error.

When the exact window yields no defensible solution:
1. retain the natural-language brief, profile, must-haves, traveler group, origin and budget;
2. try a bounded set of nearby future windows automatically;
3. keep trip duration unchanged unless the user explicitly permits otherwise;
4. do not silently increase budget;
5. do not silently relax a must-have or avoid constraint;
6. prefer the nearest window that yields the strongest real solution set;
7. tell the user clearly when dates moved;
8. if multiple nearby windows fail, offer a one-click wider horizon while retaining the brief;
9. if the wider horizon also fails, state the evidence gap honestly and never fabricate filler.

Automatic recovery is allowed to change **date window only**, because the user is explicitly told that recovery may test nearby dates. Other constraints remain fixed unless the user changes them.

## Offer/product reasoning
The current solver can use:
- source product ID;
- persistent product vectors;
- semantic tags/text;
- property/destination evidence;
- traveler fit;
- value score;
- location score;
- evidence score;
- feed price/discount/validity where present;
- exact tracking URL.

The interface should expose enough evidence to make the recommendation understandable without exposing private model reasoning.

## Agent runtime policy — MyAgenticTeam 2026
- deterministic functions, retrieval and validation before model calls;
- smallest capable agent set;
- bounded model/tool loops with explicit stop conditions;
- one shared request budget across model/tool stages;
- progressive tool/skill loading rather than injecting every capability;
- structured outputs for ranking/explanation contracts;
- human approval for sensitive or irreversible actions;
- observability via stage timing, evidence state and identifiers, not private chain-of-thought.

## Agent boundaries
- Facts come from tools/data, not model memory.
- Hard geography/date/must-have/stay constraints execute before soft scoring.
- Affiliate commission, EPC or commercial payout **never raise destination/user-fit score**.
- Exact affiliate `tracking_url` is preserved unchanged.
- Feed price remains a price signal unless provider semantics establish a full trip total.
- Unknown stock, room type, final price, weather or transport cost is never presented as confirmed.
- Tool/model failure degrades to verified fallback or a clear no-result/recovery path, never fabricated output.
- Human-readable “agent working” states may describe only work that really occurs.

## Public result contract
The initial surface returns up to 3 defensible solutions. Each needs:
- destination;
- real offer/property and source product ID in runtime traceability;
- overall fit;
- concise grounded reason;
- meaningful matched signals;
- one trade-off or uncertainty when material;
- truthful known price/evidence state;
- clear next action.

If fewer than three defensible solutions exist, show the real count. Never manufacture filler.

## Commercial independence
Commission is not part of traveller suitability. Commercial performance may be recorded separately for business analysis, but it cannot alter user fit or lift an otherwise weaker recommendation.

## Cost and latency policy
Use deterministic code for repeated facts, inventory filtering and high-volume scoring. Use models for ambiguous intent and grounded synthesis. Parallelize independent recovery windows after exact search fails. Prefer bounded parallel I/O over unbounded sequential retries. Reserve expensive verification for cases where it can change the decision.

## Observability
Record stage timing, hard constraints, candidate/product IDs, inventory rows checked, exact-window outcome, recovery windows attempted, selected fallback window, surviving solutions and final destination slugs. Do not log secrets, unnecessary raw private conversation or private chain-of-thought.

## Release invariant
The review surface uses `V45HolidayFinder`; the active solver remains `/api/escape/solve-v42`; the selected-stay workflow remains the existing V40/V39 stack. Version labels are not architecture.

A release is not GREEN until:
- typecheck passes;
- strict regression suite passes;
- production build passes;
- exact-empty recovery is exercised;
- desktop/mobile preview is visually inspected;
- truth/tracking/downstream stay flows remain intact;
- the user has reviewed the actual redesigned surface before production merge.
