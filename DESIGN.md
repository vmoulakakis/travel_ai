# TravelAI Greece — Design System (Agentic Discovery v1)

## Product thesis
One coherent trip decision: **Tell us your escape → Understand constraints → Discover destinations → Compare real stays → Escape Book → provider booking**.
The interface should feel like an expert Greek travel editor, not a back-office dashboard.

## Canonical tokens
| Role | Value | Rationale |
|---|---|---|
| Pine/primary | #123D35 | Deep Mediterranean landscape, high contrast |
| Hero/photography backdrop | #11352F | Allows authentic property imagery to read without fake visual claims |
| Chalk | #FAF6EE | Warm reading surface |
| Brass accent | #EEBC75 | Sparse decision-focus accent |
| Ink | #173E36 | Accessible text on chalk |
| Muted body | #546B62 | Secondary explanatory information |

Display: Georgia (Greek capable), limited to major editorial headings. Interface: Inter/system sans, normal reading size.
Do not add neon AI-gradients, fake scores, tiny telemetry chips, glass overlays or decorative badges.
Allow one strong visual per viewport.

## Ownership
- `components/agentic-experience-entry.module.css`: cinematic entry + interactive AI query + desktop/mobile composition.
- `components/v54-final-home.tsx`: existing stateful discovery engine; retain canonical business functions and routing.
- `components/v54-final-home.module.css`: historical sections; future changes must migrate deliberately, not accumulate anonymous overrides.

## Responsive behavior
Desktop: photographic hero with left-aligned conversational entry; map below.
Mobile: single-column discovery prompt, touch-sized CTA, no hover-only actions, map secondary.
Breakpoint 760px; visible focus; reduced motion; Greek copy.

## Image rules
Use authenticated property/destination images only from existing permitted inventory services; avoid generated images pretending to be Greece.
When imagery fails, preserve deep-pine gradient/background and readable text.

## Definition of done
Desktop 1440px, tablet 1024px, mobile 390px & 360px screenshot review; keyboard-only submission; AI request success/error states; map navigation; property card -> exact existing stay URL; TypeScript/build; validated preview deployment. Vercel READY alone is not sufficient.

## Non-goals
No Supabase schema mutation, agent prompt/model modification, ranking score replacement, affiliate URL rewrite, Framer integration, or automatic release to production.
