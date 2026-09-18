---
name: travel-ai-v50-web-design
version: 6.0.0-prototype
purpose: Map-first agentic travel intelligence experience where natural intent, infographic controls and a live stay map share one decision state.
source_method: MyAgenticTeam web-design-intelligence v3 + agent-runtime-2026 + solution-first-product + TravelAI V45 runtime
---

# TravelAI V50 Prototype Web Design Contract

## Prototype scope
This contract applies to the `prototype/v50-home` review branch. Production main remains unchanged until explicit approval.

The prototype must be structurally production-compatible:
- Next.js/React and existing runtime contracts stay in place.
- Real stay inventory and real coordinates are used whenever available.
- Existing semantic solver is reused rather than mocked.
- New UI state is isolated behind reusable V50 components/adapters.
- Missing V50 intelligence layers are labelled unavailable/pending rather than fabricated.

## Product thesis
TravelAI is not a travel agency search form. It is an agentic escape solver.

Primary flow:
`felt need -> AI interpretation -> live inventory universe -> semantic fit -> Top 5 solutions -> map exploration -> challenge/compare -> downstream trip build`.

The map, conversational agent and infographic controls are three interfaces over the same travel-decision state.

## First viewport
The first viewport is a full-screen decision canvas:
- compact TravelAI identity/navigation;
- natural-language prompt;
- editable practical frame (origin, dates, total budget);
- visual Travel DNA controls;
- live map containing the user's real stay universe;
- visible inventory count;
- one primary action: analyze the escape.

Do not use a generic tourism hero + search bar + cards.

## Map experience
The prototype map must:
- render real stay pins from Supabase;
- support standard, satellite and terrain basemaps;
- highlight Top-5 matches after solving;
- support hover insight and click selection;
- preserve map context while showing intelligence cards;
- make a non-Top-5 user selection visibly challengeable by the agent;
- use a map adapter boundary so Mapbox/deck.gl can replace Leaflet in production without changing funnel state.

V50 production target may use Mapbox/deck.gl. The prototype deliberately reuses Leaflet to minimize dependency churn and prove the interaction model first.

## Top 5 contract
The V50 prototype shows up to five strongest distinct real-inventory solutions from the existing semantic solver.

No filler result is created. If fewer than five are returned, display the real count.

A solution card must expose:
- rank and fit;
- destination;
- real stay;
- truthful price signal when available;
- semantic matched signals;
- explicit action to focus it on the map;
- downstream path into the existing stay/escape flow.

## AI behavior
The agent must not flatter a bad user choice.

When the user selects a mapped stay outside the current Top 5, the UI should explain that it is not among the current strongest matches and invite a comparison/recalculation. The user retains control.

No hidden chain-of-thought is shown. Observable filtering/ranking counts and evidence state may be shown.

## Infographic controls
Expose a small set of high-value experiential dimensions such as calm, food, nature, discovery, nightlife and value.

They are not decorative charts. They modify the structured request sent to the semantic solver.

## Truth rules
Never fabricate demand, weather, events, reviews, availability, urgency or savings.

Current `demand_proxy` is non-discriminating across the live offer set and must not be represented as a meaningful V50 demand forecast.

Future demand/weather/events/review layers should plug into explicit evidence slots and appear only when their data services are ready.

## Visual direction
Premium intelligence studio rather than travel brochure:
- near-black green/ocean canvas;
- warm ivory text;
- mineral green and amber/orange intelligence accents;
- large but controlled typographic hierarchy;
- satellite/map imagery as the main visual material;
- thin borders, dense information hierarchy and restrained glass only where it clarifies overlay relationships;
- subtle motion for map focus, result reveal and state transition;
- no purple AI gradients, bento spam, generic SaaS cards or fake metric theatre.

## Responsive behavior
Desktop: map and decision panel operate side by side in one viewport.
Mobile: natural-language input and Top-5 decision controls remain primary; map becomes a large dedicated stage below the composer with sticky mode controls.

## Prototype acceptance
- root homepage on the prototype branch renders V50;
- production main is untouched;
- real inventory endpoint can return the full active stay universe, subject to valid/tracked/geo-qualified rows;
- map loads and renders the returned pins;
- standard/satellite/terrain switching works;
- semantic solve uses the existing `/api/escape/solve-v42` contract;
- up to 5 real solutions render;
- clicking/focusing a result moves the map;
- selecting a non-Top-5 pin triggers an agent challenge state;
- responsive CSS exists for phone/tablet/desktop;
- reduced-motion preference is respected;
- typecheck/build/CI must pass before preview is called GREEN.
