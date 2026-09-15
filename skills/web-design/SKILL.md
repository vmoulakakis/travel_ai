---
name: travel-ai-v35-web-design
version: 3.0.0
purpose: Full-screen, no-page-scroll, mood-reactive AI travel decision app with dual-pass destination + real-stay reasoning.
source_method: MyAgenticTeam web-design-intelligence + Travel Guru Blueprint + 2026 AI travel UX research
---

# V35 Travel AI Web Design

## Product thesis
This is not a travel landing page and not an OTA results grid. It is an AI decision app that helps a user move from an emotional need to a ranked, evidence-backed travel solution.

Primary path:
`mood/problem -> adaptive understanding -> Escape DNA -> time strategy -> reality constraints -> destination pass -> inventory reality pass -> up to 10 ranked real solutions -> 360 trip build -> affiliate handoff`

## Interaction architecture
The core funnel is app-like and viewport-based. No long page narrative and no vertical scrolling between stages.

Five visible steps:
1. FEEL — free text + visual mood worlds.
2. UNDERSTAND — one adaptive question at a time + Escape DNA.
3. WHEN — suggested/fixed/flexible date strategy.
4. REALITY — origin + comfortable total budget.
5. SOLUTIONS — dual-pass agent and ranked solution workspace.

Each stage occupies one viewport and transitions in place. On small screens, controlled internal overflow is allowed for accessibility, but the page itself must not become a long scrolling funnel.

## Results architecture
Do not cap the decision surface at three arbitrary cards. Return up to 10 ranked **solutions** when evidence supports them.

A solution is not only a destination. It is:
- destination;
- best current real stay from our feed;
- up to three real stay alternatives;
- destination fit score;
- inventory viability score;
- combined solution score;
- explanation of any rank movement caused by real inventory;
- one honest trade-off;
- direct path to 360 trip building;
- exact original affiliate tracking URL.

Results use one cinematic selected solution plus a compact 10-item rail, not a wall of cards. Left/right navigation and direct selection replace page scrolling.

## Dual-pass UX
The interface must make the reasoning legible:

`PASS 1 — What trip fits me?`
`PASS 2 — Can the real stay inventory support it well?`

If inventory changes the order, say so. Example: “Chania moved from #4 to #2 because the real stay inventory for your dates is materially stronger.”

Do not let affiliate commission, payout or merchant economics affect the score.

## Visual system
The background is a living travel mood layer, not static decoration.

Mood families:
- sea/light;
- city/evening;
- green/reset;
- mountain/cozy;
- adventure;
- surprise.

Changing mood changes photography, tonal treatment, camera motion and accent color. The interface should feel different without changing its information architecture.

## Photography / aerial preference
Prefer authentic high-resolution aerial, elevated, panoramic and wide landscape photography when available. Use clearly licensed/attributed sources. Do not claim an image is real drone footage unless the source proves that.

Aerial preference order:
1. genuine aerial/drone photography;
2. elevated panoramic photography;
3. wide destination landscape;
4. standard destination photography.

Reject paintings, illustrations, maps, posters, logos and irrelevant imagery. A destination name must remain relevant to the selected image.

## Motion
Use slow camera push/pan, subtle depth and state transitions. Motion carries mood, not novelty.

Rules:
- 18–28 second ambient photo movement;
- crossfade/state animation under 700ms;
- no animation should block input;
- no decorative autoplay video required for core conversion;
- `prefers-reduced-motion` must remove camera motion while preserving hierarchy.

## Typography
Editorial serif for destination/emotion. Neutral sans for evidence and controls. Keep the interface dark, cinematic and high-contrast, with mood-specific restrained accent shifts.

## Agent state design
Never show fake thinking percentages. Progress copy must map to real stages such as:
- understanding trip shape;
- checking season/access;
- checking real stay inventory;
- reranking against inventory reality;
- building final solution set.

## Conversion sequence
`felt need -> recognition -> control -> timing -> reality -> desire -> evidence -> confidence -> action`

The affiliate CTA appears only after a real stay has been selected and justified. The user can still open the full 360 trip build first.

## Truth rules
- exact affiliate tracking URL unchanged;
- feed price labelled as feed price unless total semantics are verified;
- unknown stock is not “available”;
- no fake urgency, scarcity, reviews, weather or transport costs;
- no AI/generated image may masquerade as evidence for a specific property.

## Mobile
- viewport-step interaction remains intact;
- large tap targets;
- mood deck becomes 2-column;
- results rail becomes swipeable horizontal internal navigation;
- selected solution remains the primary visual focus;
- internal overflow is allowed only where necessary for accessibility.

## Measurement
Track semantic_discovery_started, visual_semantic_selected, escape_dna_confirmed, date_strategy_selected, dual_pass_started, inventory_pass_completed, solution_rank_changed, solution_selected, stay_opened, escape_build_started, affiliate_offer_opened.

Primary diagnostic: percentage of users who reach a real inventory-backed solution and select one of the top 10.

## Release checklist
- no long scrolling core funnel;
- mood visibly changes the visual world;
- agent can return up to 10 solutions;
- each solution includes a real stay and reasons;
- destination and stay scores remain separate and visible;
- reverse rank movement is explained;
- aerial imagery is preferred but never mislabelled;
- exact tracking URL preserved;
- no-result state is explicit rather than fabricated;
- typecheck, strict tests and production build pass before merge.
