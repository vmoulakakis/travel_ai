---
name: travel-ai-v38-web-design
version: 4.0.0
purpose: Low-friction cinematic AI travel decision product that converts emotional intent into real stay-backed escapes, then into a sourced 360° experience and disclosed affiliate handoff.
source_method: MyAgenticTeam web-design-intelligence + 2026 Airbnb/Expedia/Hopper travel UX research + live product evidence
---

# V38 Travel AI Web Design

## Business goal
Primary conversion is not an affiliate click. It is successful progression through:
`felt need → date commitment → real solution chosen → 360 experience built → Escape Book saved/emailed → disclosed provider handoff`.

The affiliate click is the final implementation action after confidence exists.

## Audience / decision stage
The user often does not know the destination. They know only that they need a break, have limited time/budget and want to avoid a bad decision. The interface must reduce decision fatigue rather than expose every travel filter.

## Design thesis
This is not an OTA form, a card wall or a destination blog. It is a cinematic decision studio.

Three decisions only before matching:
1. **FEEL** — one visual world + one optional sentence + who is travelling.
2. **WHEN** — one of three intelligent date windows or explicit dates.
3. **REALITY** — origin + comfortable total budget.

Everything else is inferred and shown as optional fine-tuning. Never force six sequential questions when the semantic agent already has sufficient information.

## Reference ledger
Use transferable principles only; never copy distinctive layouts, brand artwork or trade dress.

| Source | Observation | Transferable principle | Use / reject |
|---|---|---|---|
| Airbnb 2026 homepage | Personalized recommendations and contextual discovery move the user beyond destination-first search | Lead with recognition and relevance, not a giant form | USE |
| Airbnb AI review highlights / comparison | AI compresses large evidence sets into decision-ready signals | Summarize evidence but keep source/confidence visible | USE |
| Airbnb neighborhood maps | Spatial context reduces uncertainty before booking | Show local-life context after destination selection | USE |
| Expedia conversational travel experience | Conversation can produce rich dynamic result surfaces followed by external booking handoff | AI understanding first, transactional provider handoff last | USE |
| Hopper / HTS agentic UI | Selection-based dynamic cards outperform text-only agent responses for high-choice tasks | Use one primary visual choice + compact alternate rail | USE |
| Traditional OTA filter walls | High filter density makes an undecided user do the ranking work | Do not recreate filter walls | REJECT |
| Fake urgency / countdown travel pages | Can generate clicks but damages trust and long-term conversion | No invented scarcity, timers or fake social proof | REJECT |

## Product architecture
### A. Discovery funnel
Full-viewport cinematic shell. Background visual responds to the selected emotional world.

Visible flow:
`FEEL → WHEN → REALITY → DUAL-PASS SOLVE → ONE SELECTED RESULT + RAIL`

No vertical questionnaire. The optional fine-tune is collapsed by default.

### B. Results
Never show ten equal cards. Show one selected solution at cinematic scale with:
- destination;
- real stay;
- total / destination / stay scores;
- short reason;
- one honest trade-off;
- provider price only when known and positive;
- CTA: **Build this 360° escape**.

The other solutions live in a compact horizontally scrollable rail.

### C. Destination 360° builder
Sequence:
`CINEMATIC DESTINATION REVEAL → 360 LOCAL INTELLIGENCE → STAY CINEMA → VERIFICATION → EMAIL GATE → ESCAPE BOOK + PROVIDER LINK`

The destination must be understood before the accommodation is sold.

360° categories:
- Don't miss;
- Eat;
- Drinks / nightlife;
- Culture;
- Sea / beaches when relevant;
- Weather;
- Know before you go;
- beyond-stay budget.

### D. Stay cinema
Use only sourced property images from the affiliate feed and its extra-image fields. Animate still images with subtle Ken Burns / push-pan motion. Never AI-reconstruct a specific room, pool, view or property and present it as evidence.

Destination visuals prefer authentic aerial/drone/elevated photography where source metadata supports it. Otherwise label the treatment as cinematic motion from sourced photography, not real drone footage.

### E. Email gate and handoff
The user receives the Escape Book before the final commercial handoff. After successful one-off email delivery:
- unlock the PDF;
- unlock the exact original affiliate tracking URL;
- show affiliate disclosure adjacent to the action;
- open provider in a new tab;
- preserve tracking URL exactly.

Never expose a fake or fallback commercial URL if email/PDF generation fails.

## External evidence and first-party signal
External place ratings may be shown only with a named source and only when returned by that provider.

Supported hierarchy:
1. Tripadvisor Content API when configured;
2. Google Places when configured;
3. Foursquare Places when configured;
4. OpenStreetMap as unrated discovery fallback.

Do not convert unrated open data into a rating.

### AI Guest Signal
First-party signal is not a synthetic review score. It may appear only when:
- a mission exists;
- the trip window has ended;
- the user explicitly confirms they went;
- at least 3 responses exist for the subject.

Show sample size and confidence with the score. Never call it a verified booking unless booking verification actually exists.

## Price truth
Blank, whitespace, null, zero or negative feed price means **unknown**, not `0 EUR`.

UI language:
- positive verified feed number → show feed price signal;
- otherwise → `Τιμή στον πάροχο / Price at provider`.

Final room, taxes, terms and live availability always require provider confirmation.

## Escape Book
PDF is a product artifact, not a printout of the webpage.

Required sections:
1. cinematic sourced cover;
2. why here / why now;
3. weather for selected dates;
4. don't-miss local evidence;
5. restaurants + nightlife with named ratings source;
6. selected stay + availability truth;
7. budget / practical friction / source disclosure;
8. final provider handoff with QR, visible exact URL, clickable affiliate action and disclosure.

The exact page count may vary as long as the information hierarchy remains intact.

## Visual system
- dark cinematic base;
- editorial serif for emotion/destination;
- neutral sans for evidence and controls;
- restrained gold for commitment/commercial action;
- cyan for evidence/source/AI-state signals;
- full-bleed sourced photography;
- glass / translucent controls only where text contrast remains WCAG-friendly;
- generous negative space around the primary decision.

No generic SaaS gradient-card wall.

## Motion hierarchy
1. CSS transitions/keyframes for state and camera push/pan;
2. introduce Motion only if layout/state choreography materially improves the experience;
3. no required 3D;
4. no animation may block input or hide evidence;
5. `prefers-reduced-motion` removes camera motion and spinning agent visuals.

## Mobile
- two-column emotional-world deck;
- no tiny filter controls;
- horizontal result rail;
- one dominant selected result;
- date windows stack vertically;
- touch targets >=44 CSS px where practical;
- sticky source/category rail may scroll horizontally;
- email gate becomes one column.

## SEO / AEO
Public discovery pages retain semantic destination content, crawlable destination URLs, canonical/hreflang and structured metadata. The interactive funnel is the conversion product; SEO pages are acquisition surfaces, not duplicated funnel content.

## Measurement
Instrument:
- `cinematic_discovery_started`;
- `visual_world_selected`;
- `escape_shape_confirmed`;
- `date_window_selected`;
- `dual_pass_started`;
- `solution_selected`;
- `v38_360_research_started`;
- `v38_360_research_completed`;
- `source_rating_seen`;
- `stay_cinema_selected`;
- `email_gate_completed`;
- `escape_book_opened`;
- `affiliate_offer_opened`;
- `post_trip_feedback_submitted`.

North-star diagnostic:
`% of started missions that select a real stay-backed escape`.
Secondary conversion:
`% of selected escapes that reach email-gate completion and disclosed provider handoff`.

## Quality / truth gates
Before release:
- blank feed values never become zero price;
- external rating always has provider label;
- AI Guest Signal hidden below sample threshold;
- no fake reviews/scarcity/weather/availability;
- exact affiliate URL preserved;
- destination media relevant to destination;
- property media sourced from property/feed only;
- reduced-motion works;
- mobile/desktop primary flows checked;
- typecheck passes;
- strict regression suite passes;
- production build passes;
- V37 100-scenario non-empty regression remains green.
