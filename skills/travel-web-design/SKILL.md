# Travel Web Design Skill

## Purpose
Design premium travel-decision products that help people choose confidently before they enter a booking funnel. The experience should feel like an editorial travel product with product-design discipline: immersive but fast, emotional but evidence-aware, and visually calm under decision pressure.

## Research basis
Use these principles as primary references:
- Nielsen Norman Group — Helping Users Make Decisions: reduce choice overload, structure comparisons, expose the information needed to decide without overwhelming the user.
- Google Design — Predictably Smart: personalization and recommendation zones should be predictable so the interface remains learnable even when recommendations change.
- Google Design — Airbnb: Communicating Clarity and Charm: let photography lead, use whitespace, strong type hierarchy, clear language and conversational interaction.
- Google Design — Material Design Awards / momondo: use visual data cues and purposeful motion to make travel search comprehensible, not decorative.
- Awwwards creative-development guidance: distinctive brand expression, craftsmanship, accessibility and immersive storytelling should coexist; never trade core usability for visual novelty.

Reference URLs:
- https://www.nngroup.com/reports/make-decisions/
- https://design.google/library/predictably-smart
- https://design.google/library/airbnb-invites-you-in
- https://design.google/library/material-design-awards-2017/
- https://conference.awwwards.com/valencia-developers/speakers/cyd-stumpel

## Non-negotiable UX rules
1. **One primary decision surface.** Do not begin with a multi-step wizard when the same constraints can be expressed in one sentence/canvas.
2. **Exactly one clear outcome objective.** For Travel AI that is: produce exactly three realistic trips.
3. **Progressive disclosure.** Let the user touch a criterion to edit it. Reveal detail only when it is needed.
4. **Predictable recommendation zone.** Dynamic AI output belongs in a stable visual region; navigation and controls should not move unpredictably.
5. **Photography leads emotion; structured graphics explain confidence.** Use large authentic travel imagery with small, soft data graphics for fit, effort, season, budget and evidence.
6. **Fit and confidence are different objects.** Never visually collapse them into one score.
7. **Commerce follows the trip decision.** No merchant logo wall, outbound CTA or EPC-biased ranking before a destination is selected.
8. **Mobile is the default stress test.** Criteria, recommendation comparison and decision CTA must be usable with one hand and without horizontal scrolling.
9. **Accessible motion.** Motion explains state change; it never hides required information or becomes the primary navigation mechanism.
10. **No fake live facts.** Planning estimates, observed feed prices and verified evidence must be visually distinguishable.

## Visual language
- Editorial serif for destination emotion; neutral sans serif for controls and evidence.
- Palette: warm mineral/ivory base, deep forest/ink text, restrained clay/sun accent. Avoid generic AI purple gradients.
- Use 1–3 high-quality destination images per major viewport, not decorative stock mosaics everywhere.
- Use rounded geometry sparingly. Large cards may be soft; data labels should stay compact.
- Infographic signals: thin progress lines, soft rings, small confidence chips, route/orbit diagrams, restrained map cues.
- Strong negative space. A premium travel product should feel curated, not filled.

## Travel decision canvas pattern
Express the trip as a readable sentence with editable tokens, for example:
`I can leave from [Athens] in [October] for [3 nights] with about [€500 pp] and I want [romantic + food], going as a [couple].`

Each token opens a local edit tray. Do not navigate to another screen. Keep the decision CTA visible after edits.

Under the sentence, show a soft Trip DNA visualization with four signals:
- Time shape
- Budget posture
- Intent / feel
- Friction / effort preference

These are explanatory signals, not destination scores.

## Results pattern
- Result 1: full editorial feature card.
- Results 2–3: visually equal alternatives below it.
- Always show: role, destination, Fit, Confidence, planning budget label, evidence state, concise why, and soft factor breakdown.
- Refinement actions should move the decision: cheaper, warmer, closer, shorter, more romantic, more adventurous.
- Do not show endless alternatives. Re-run the Top 3 instead.

## Supply / affiliate pattern
After destination selection, open a contextual Trip Basket:
1. GET THERE
2. STAY
3. PACK
4. EXPERIENCE
5. optional PROTECT / CONNECT

For feed-derived stay data:
- show observed property, location, image, current observed price range and freshness;
- never describe feed presence as verified affiliate permission;
- tracking URL is available only when program approval, property approval, traffic-source permission and tracking verification are all true;
- unknown eligibility => no outbound CTA.

## Engineering checklist
- Server-controlled UI state; LLM never chooses arbitrary component layout.
- Deterministic ranking before LLM explanation.
- Stable fallback when AI or evidence services time out.
- Read-only public endpoints expose no service-role keys or secrets.
- Cache evidence/supply reads with short stale-while-revalidate windows.
- Use database ingestion jobs for large feeds; do not download multi-megabyte catalogs into the browser.
- Add structured observability: health endpoint, ingestion-run table, data-source indicator and error-safe fallbacks.

## Design review questions
Before shipping, answer yes to all:
- Can a first-time user understand the promise in five seconds?
- Can they change any trip constraint without feeling they are in a form?
- Are only three trips visible as the decision set?
- Can they understand why #1 beat #2 without opening a modal?
- Is uncertainty explicit?
- Is stay/merchant supply separated from destination ranking?
- Does the experience still work with AI disabled?
- Is the mobile experience calmer than the desktop version, not merely smaller?
