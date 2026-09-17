# Travel AI V41 — Web Design Intelligence Contract

Date: 2026-09-17
Status: implementation contract
Central skill: `vmoulakakis/Myagenticteam/skills/web-design-intelligence/SKILL.md`

## Product thesis

Travel AI is not another itinerary generator. Its differentiator is decision intelligence: it resolves *where the traveller should go* before accommodation inventory, affiliate economics or booking inventory can bias the answer.

The interface must make that intelligence feel visible, calm and trustworthy. The user should feel that a highly capable travel strategist is narrowing ambiguity with them, not forcing them through a generic booking form.

## Business / conversion model

Primary conversion: complete the discovery flow and choose one destination.
Secondary conversion: continue into the selected destination experience, where stays/local intelligence/itinerary become available.

The UI must therefore optimise for:

1. low-friction expression of intent;
2. progressive commitment through only material questions;
3. confidence during deterministic analysis;
4. clear comparison of genuinely different destination hypotheses;
5. explicit separation between destination fit and downstream inventory.

## Reference synthesis

Current AI travel products in 2026 converge on two useful interaction patterns:

- chat-first discovery, where natural language reduces form friction;
- visual planning workspaces, where maps and strong imagery keep the trip tangible.

Travel AI should use both patterns selectively, but preserve its own destination-first logic. The homepage remains conversational; the reveal becomes a visual decision surface rather than a generic generated itinerary.

MotionSites / Aetheris-style lessons are adopted as mechanisms, not cloned visuals: cinematic media, disciplined glass surfaces, sectional motion, foreground/background separation and strong reduced-motion support.

## Art-direction thesis

The V41 direction is **Aegean Decision Studio**: dark Mediterranean ink, cool cyan decision signals, warm sand highlights and cinematic Greek destination imagery. Editorial serif typography carries emotional travel language while a precise sans-serif system handles evidence, progress and controls. Glass is used as an information material rather than decoration: brighter surfaces indicate action, cooler surfaces indicate evidence, and deeper surfaces indicate the agent's analytical state. The visual tension is between dream-like destination media and rigorous decision-system UI.

Avoid category clichés: no generic airplane icons, postcard grids, fake star ratings, urgency counters, booking-engine chrome, random AI gradients or dashboard density on the first screen.

## Design DNA ledger

| Source / pattern | Mechanism | Transferable principle | Travel AI use |
| --- | --- | --- | --- |
| Modern chat-first travel planners | one natural-language starting point | let users describe outcomes before forcing taxonomy | keep free-text hero as first interaction |
| Visual AI planning workspaces | imagery + structured choices | maintain emotional continuity while choices become concrete | cinematic background + destination deck |
| MotionSites cinematic hero systems | depth, blur, slow media motion | motion should support atmosphere, not distract | restrained Ken Burns and surface transitions |
| Liquid/glass interface systems | translucent hierarchy | material can encode interaction priority | agent composer, question choices, chat panel |
| Editorial travel publishing | large serif headlines | emotional language deserves editorial scale | hero/questions/results headlines |
| Decision-support interfaces | progressive disclosure | ask only what changes the decision | preserve V40 adaptive question logic |

## V41 surface rules

### 1. Hero
- Full-viewport destination media with legibility-first vignetting.
- Strong editorial headline.
- Agent composer is the visual anchor, not a secondary form.
- Trust row communicates the decision rules, not marketing claims.
- A subtle right-side decision rail may visually signal `FIT > POPULARITY`, `DESTINATION BEFORE STAYS`, and `HARD CONSTRAINTS STAY HARD` without adding another interaction.

### 2. Adaptive questions
- Answer choices must feel tappable on mobile and keyboard-accessible on desktop.
- Hover can lift; focus must be obvious without hover.
- The agent-understanding block should read like a live interpretation trace, not a chatbot bubble.

### 3. Practical constraints
- Dates, budget and origin use the same material language as the agent composer.
- The budget value is deliberately oversized to make the constraint tangible.
- Secondary presets are visually weaker than the forward action.

### 4. Thinking state
- No fake percent progress.
- Communicate the current analytical operation in plain language.
- Motion stays ambient and deterministic; no casino-like loaders.

### 5. Destination reveal
- Exactly three visible hypotheses remain the focus.
- Each card must expose fit, effort, season and reasoning without resembling a hotel card.
- Destination imagery is cinematic but copy remains readable.
- The CTA opens the destination experience; accommodation remains downstream.

## Responsive contract

- >= 1100 px: expansive editorial canvas; three-card reveal.
- 760–1099 px: compact canvas; answer grid may reduce to two columns.
- < 760 px: vertical flow, two-column choices where viable, horizontal snap deck for destination reveal, simplified nav, full-width composer action.
- No horizontal overflow outside the intentional destination carousel.
- Interactive targets should be approximately 44 px minimum where layout permits.

## Accessibility contract

- Every interactive state must have a visible `:focus-visible` treatment.
- Text contrast must remain readable over all hero images.
- `prefers-reduced-motion: reduce` disables Ken Burns, rise/pulse animations and long image transforms.
- Do not communicate status by colour alone.
- Native inputs retain usable focus and semantic labels.

## Performance contract

- Do not add WebGL/Three.js to V41.
- Keep the existing fetched destination media pipeline.
- Prefer CSS transforms/opacity for animation.
- Avoid additional client libraries for presentation only.
- Preserve existing V40 API behaviour and decision logic.

## Acceptance criteria

1. Existing discovery/dates/budget/origin/solve/destination behaviour is unchanged.
2. Greek and English routes still render the same experience component.
3. Visual hierarchy clearly separates dream, reasoning, constraint and result states.
4. Desktop and mobile layouts remain usable without clipped primary actions.
5. Focus-visible and reduced-motion rules are present.
6. No new external consumer links are introduced on the homepage.
7. Destination-first / inventory-later logic remains explicit in the UI.
8. Existing V40 regression tests remain applicable because this pass changes the experience layer, not ranking semantics.

## Implementation note for MyAgenticTeam / Codex

When continuing this redesign, inspect the live browser result before adding new visual mechanisms. Do not replace this direction with a generic template. Any new animation, component library or heavy media dependency must first justify a measurable comprehension, conversion or usability benefit.
