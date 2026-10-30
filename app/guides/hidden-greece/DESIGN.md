# Hidden Greece — Visual and product contract (2026-10-30)

## Mission, not a generic travel feed
**Visitor:** Greek domestic/foreign traveler who wants an exceptional low-profile place but cannot find a trustworthy, feasible trip around it. **Job:** explain the desired escape, see defensible and season-appropriate microplace candidates, understand access, choose 1–7 nights, inspect nearby suitable stays and continue through the owner's approved CD104 link. **Primary conversion:** problem resolved → relevant stay handoff. **Never** place commission in discovery ranking.

## Aesthetic thesis
**A private field atlas.** The world is drawn in moss, mineral ink, paper and gold, like an expedition map, not a generic OTA card grid or blue/purple SaaS dashboard. One signature: a living cartographic canvas surrounded by actual microplace evidence and proximity-ranked stay markers. Do not use stock destination scenery as a factual image. The map is real data; the abstract hero is explicitly an illustration.

### CSS brand tokens
- Mineral Ink `#172b25`; Deep Forest `#10231d`; Moss `#496650`; Paper `#f7f5ed`; Sage `#a6b9a3`; Gold `#dfb779`.
- Display: Georgia/Times traditional editorial serif with complete Greek fallback, not a roman-only display webfont. Body: system UI/Segoe UI. Data: UI monospace.
- Grid: desktop hero 54/46, discovery need 3 columns and map/story 55/45; tablet stacked story with horizontal choice rail; mobile two-column needs and full-width map with below-panel stays.
- No video autoplay, no invented drone footage, no font dependency, no JS animation library, no WebGL cost.
- Scroll is available; AJAX updates results in place without route changes. Avoid blocking touch scrolling.

## One clear experience
1. **A human problem**: choose one of six motivations or write a sentence; parse safely, with model fallback only when explicitly configured.
2. **Trip reality**: nights 1,2,3,7 shortcuts; editable date, season; upcoming Greek holiday suggestions derived locally from fixed dates and Orthodox Easter.
3. **True discovery**: only the `greece_unseen_places_v1` source-grounded, season-eligible set; score by evidence and need, never demand or commercial returns. Display exactly the true count, no filler.
4. **Field note**: nonfabricated hook, region, coordinates, caveat, evidence URL, in-depth indexable dossier, confidence.
5. **Geography**: lazy Leaflet map, real POI pin and ranked nearby stay coordinates from `stay_places`; straight-line km labelled, no invented road ETAs.
6. **Commerce**: genuine provider stay photos, owner-link host/program validation, optional approved outbound; unknown vacancy, offer semantics and third-party quality visible; no unrelated booking links.

## State matrix
- Idle: rich branded editorial discovery and chips.
- Loading: polite `role=status`, previously selected controls remain interactive.
- Loaded: up to 6 real microplaces, one selected case; geographic board and validated stay shortlist.
- Empty: explain no documented match; user can relax a constraint, dates or mood.
- Error: meaningful retry; avoid hard crash.
- Commercial blocked: show legitimate eligible stay metadata **without** an outbound URL, offer to reselect.
- Missing photo: no fake image. Missing map: coordinates and stay distances remain textual.
- Model failure: local parser; never present a fabricated recommendation.

## Accessibility and polish
Keyboard selection uses native buttons, `aria-pressed`, input labels, status messages, visible focus. Scrollable rails are accessible. Reduced motion disables animations. 320/390/768/1440 viewport review required. Frontend-only snapshot is not browser QA; production acceptance must include real screenshots, network console, tap/focus regression and Web Vitals.

## SEO/AEO plan
Canonical public library at `/guides/hidden-greece`; one verifiably grounded SSR dossier per `/guides/hidden-greece/[id]`. Generate Title/description with region and observed field hook. Validated `Place` JSON-LD with documented precise coordinates, no unsupported star ratings, hotel reviews, availability, or self-attributed awards. Include only verified-catalog slugs in sitemap. Internal links from selected discovery to dossier, dossier → funnel. Gate indexing when source/metadata are unverified. Content saturation measurement and durable research snapshots are prerequisites before claiming 'nobody knows this place'.

## Agent and ML boundaries
- Installed canonical skills: MyAgenticTeam ADLC, web-design-intelligence, UI craft, solution-first-product, AI UI production toolchain; TravelAI orchestration V45.
- Existing 16-d vectors: structured tags, not neural language embeddings.
- New real neural RAG requires a **separate versioned model index**, evaluation against Greek/Greeklish intent corpora, provenance, editorial approval, model/embedding release gates. Not claimed as deployed by this UI change.
- The optional `HIDDEN_GREECE_INTENT_MODEL` may classify free-text intent when a server key is configured. No secret in browser; zero-cost deterministic path is default.
- Only one accountable orchestration decision path; no fake autonomous 24/7 agents.

## No claims without evidence
No 'bookable tonight', 'verified 5 stars', '2h drive', fabricated off-grid status, '100% untouched', 'nobody knows', absolute legal-access claims, or affiliate link from a foreign merchant. Offer validity and guest dates are different concepts.

## Release gate
- Scoped GitHub PR only; do not change root TravelAI homepage.
- TS compile, legacy regression, isolated 100-profile matrix, Next build and screenshot/browser QA must pass.
- Program 177/205 commercial approval, traffic/site approval, tracking verification, measured route feasibility are explicit blockers before public booking CTAs.
- Finish actual semantic RAG and genuine hotel quality enrichment before declaring full AI/travel-customer booking concierge.
