# Travel AI Mission-First Web Design Skill

## Product thesis
The product does not sell a holiday first. It removes the emotional, informational and social friction between “I need a break” and “this is the trip I want to take”. Commerce appears only after destination commitment.

## Primary conversion path
Need for escape → date opportunity → emotional need → Escape DNA → three destination finalists → destination commitment → 360° research → cinematic trip reveal → Escape Book/share → eligible affiliate offer.

## Design source hierarchy
1. Follow `skills/travel-web-design/SKILL.md` for travel decision UX and truth boundaries.
2. Follow MyAgenticTeam `web-design-intelligence` principles: research before selecting patterns, use an owned/free implementation stack, use motion by job rather than trend, and preserve accessibility/performance.
3. Prefer the existing Next.js/React architecture over adding another UI framework.

## Visual thesis
- Premium editorial travel, not booking-engine chrome.
- Photography carries emotion; structured signals explain the decision.
- Warm mineral/ivory surfaces, deep green/ink, restrained sun/clay accent.
- Cinematic motion is reserved for meaningful state transitions: possibility → narrowing → chosen destination → reveal.
- No generic AI gradients, merchant walls, fake urgency or decorative 3D.

## Mission entry
The first screen asks two human questions:
1. When can you leave?
2. What do you need from the escape?
Origin and budget are secondary context. Destination is intentionally absent.

## Result contract
Show exactly three primary finalists:
- The One I'd Pick / Winner
- Smart Value
- Wild Card
Also allow a transparent “rejected obvious choice” explanation when useful.

Every finalist must show why it fits, one meaningful compromise, season/date relevance and confidence/evidence state. Do not expose private chain-of-thought.

## Post-choice contract
Expensive 360° research starts only after the traveler chooses a destination. Research modules: weather, places worth time, restaurants, don't-miss, avoid, logistics, itinerary, trustworthy imagery/media and matched eligible offer.

## Commerce rule
The affiliate offer is implementation of the chosen solution, never the ranking input. Preserve the exact source tracking URL. Open commercial destinations in a new tab. Never create fake scarcity, reviews, discounts or booking claims.

## Escape Book
The saved/shareable artifact is a personalized pre-trip souvenir: why this fits, weather interpretation, days, places, food, don't-miss, avoid, logistics, packing and the eligible offer. Include the exact affiliate URL and a QR code to that same URL when commercial eligibility is verified.

## Social decision pattern
Sharing solves group indecision. Shared escape proposals should support “I'm in”, “different weekend”, “cheaper” and “show another” before pushing commerce.

## Motion hierarchy
CSS for micro-state; existing React motion approach for interface state; GSAP only for one or two signature cinematic sequences; Three.js/R3F only if a spatial world-narrowing interaction proves useful and performant. Always provide reduced-motion equivalence.

## Performance & accessibility gates
WCAG 2.2 AA target; semantic controls; visible focus; one-hand mobile usability; no horizontal-scrolling decision UI; responsive images; lazy non-critical media; animation must never block task completion; Core Web Vitals stay inside production budget.
