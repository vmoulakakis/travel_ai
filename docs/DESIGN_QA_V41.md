# Travel AI V41 — Design QA Checklist

Date: 2026-09-17
Branch: `rebuild/web-design-intelligence-v41-20260917`
Design contract: `docs/WEB_DESIGN_INTELLIGENCE_V41.md`

## Scope

This release is intentionally presentation-layer only. It does not modify destination ranking, recommendation APIs, Supabase contracts, affiliate routing, map logic or destination-detail behavior.

## Automated gates

Required before merge:

- `npm ci --no-audit --no-fund`
- `npm run typecheck`
- `npm run test:v40:experience`
- `npm run build`

The complete `npm run test:strict` suite remains the final repository-level release gate when CI capacity permits.

## Browser review matrix

### Desktop
- 1440 × 900 or equivalent
- Hero headline remains legible across light and dark destination images.
- Decision rail is visible without overlapping the hero.
- Composer and CTA stay above fold at ordinary desktop heights.
- Four-option adaptive question row does not clip.
- Three destination cards are visible simultaneously.

### Tablet
- 1024 × 768 or equivalent
- Decision rail is removed.
- Answer choices reduce cleanly to two columns.
- Result cards preserve readable reasoning and CTA.

### Mobile
- 390 × 844 and 430 × 932 targets
- Navigation fits without horizontal overflow.
- Composer CTA becomes full-width.
- Answer cards remain thumb-friendly.
- Date controls stack vertically.
- Destination reveal uses intentional horizontal snap; no accidental body overflow.
- Chat panel fits inside viewport.

## Accessibility review

- Keyboard tab order reaches composer, adaptive answers, date inputs, budget controls, origin, destination CTAs and chat.
- `:focus-visible` is clearly visible on all primary controls.
- `prefers-reduced-motion: reduce` removes Ken Burns, rise, drift and pulse animation.
- Hero copy is readable on the brightest destination media.
- No status is communicated by colour alone.

## Product truth review

- Destination choice still precedes stays.
- No fake availability, ratings, scarcity or booking claims.
- No new external consumer link is introduced by the visual redesign.
- Fit, effort and season remain recommendation evidence, not decorative labels.

## Visual intent

Expected impression: premium Greek travel editorial meets a rigorous AI decision studio.

Reject the release if it drifts toward:

- generic booking-engine UI;
- neon AI-dashboard aesthetics;
- dense SaaS chrome;
- decorative glass without information hierarchy;
- motion that competes with the decision flow.
