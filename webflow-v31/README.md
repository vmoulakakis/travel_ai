# V31 — Webflow Redesign Blueprint

## Product direction

V31 treats Webflow as the premium presentation, content, SEO and campaign layer while keeping the existing Next.js/Supabase stack as the AI runtime.

The redesign is not a visual port of V28–V30. It is a new Greece-first travel product with a clearer information architecture, stronger editorial identity, and explicit separation between inspiration, AI decision support, map intelligence and booking evidence.

## Non-negotiables

- Greece-first, bilingual Greek/English.
- Webflow owns layout, visual system, editorial/CMS content and marketing pages.
- Next.js keeps streaming AI, trip decision logic, Supabase access, external API adapters and evidence endpoints.
- No Cloudflare.
- Open-source map: Leaflet + OpenStreetMap-compatible tiles.
- Tripadvisor and Booking ratings/review counts are displayed only from live source responses; missing data is shown as unavailable.
- Affiliate EPC/commission never changes destination ranking.
- A selected destination/location remains a hard scope, not a preference bonus.
- One H1 per page, accessible semantic structure, keyboard-visible focus states.
- Mobile is a first-class product surface, not a collapsed desktop.

## New information architecture

### Primary navigation

1. **AI Planner / AI Σύμβουλος** — primary CTA, opens the conversational decision flow.
2. **AI Map / AI Χάρτης** — daily seasonal destination ranking on an interactive map.
3. **Destinations / Προορισμοί** — CMS-driven destination library.
4. **Seasonal Picks / Ανά Εποχή** — shoulder-season, summer, winter, family, couple and value landing pages.
5. **Guides / Οδηγοί** — useful editorial and methodology content.
6. **How AI Works / Πώς δουλεύει** — trust, evidence and ranking methodology.
7. **EL / EN** locale switch.

### Secondary navigation

- Compare destinations
- Islands vs mainland
- Family trips
- Couples
- Short breaks
- September in Greece
- Value travel
- About / Contact

## Page system

### 1. Home

**Hero:** editorial image field + floating AI trip prompt.

Hero copy direction:
- EL: `Η Ελλάδα δεν χρειάζεται άλλη μία λίστα. Χρειάζεται τη σωστή επιλογή για εσένα.`
- EN: `Greece does not need another top-10 list. It needs the right choice for you.`

Hero interaction:
- natural-language prompt
- quick chips: Θάλασσα / Ζευγάρι / Οικογένεια / Φαγητό / Φύση / Πολιτισμός
- optional destination field
- date/month intent
- CTA: `Βρες τον προορισμό μου`

**Section order:**
1. Hero + AI prompt
2. Daily AI map preview
3. Explore by feeling
4. This month in Greece
5. Three-way destination comparison
6. Islands vs mainland editorial split
7. Why this recommendation — transparent methodology
8. Destination stories / guides
9. Final AI CTA

### 2. AI Planner

A dedicated product page, not a modal hidden inside Home.

Layout:
- left: progressive trip brief
- center: streaming AI response / recommendations
- right: evidence rail (season, travel effort, cost, stay signal, source status)

States:
- blank inspiration state
- location-known state
- surprise-me state
- no-result / conflicting constraints state
- shortlist state
- compare state
- final trip-builder state

### 3. AI Map

Desktop:
- left rail: ranked cities/destinations
- center/right: interactive map
- floating evidence card after marker click

Mobile:
- map first
- bottom sheet with ranked destinations
- swipeable evidence card

Ranking labels:
- AI Overall
- Season fit
- Stay signal
- Access confidence
- Crowd/value balance

External review labels remain separate:
- Tripadvisor rating / review count / ranking
- Booking score / review count when partner API access is active

### 4. Destinations hub

CMS filters:
- island / mainland
- region
- best months
- traveler type
- trip length
- budget tier
- energy
- travel effort

No generic `Top 10` grid. The first screen is decision-oriented: `What kind of Greece do you want?`

### 5. Destination page

Hero:
- editorial image
- destination name + region
- one-sentence travel fit
- current/selected month fit

Sections:
- Who it fits
- Best time to go
- Crowd / cost pattern
- Getting there
- Where to stay
- What to do
- AI evidence card
- Tripadvisor trusted POIs when available
- tracked stay offers
- related destination comparison

### 6. Seasonal landing pages

Examples:
- Greece in September
- Best Greek islands in May/June
- Family Greece
- Romantic Greece
- Mainland escapes
- Winter Greece
- Short breaks from Athens

These are curated, people-first pages, not scaled AI doorway pages.

### 7. How AI Works

Explain the actual decision chain:

`location truth → intent → evidence → shortlist → season/route → external research → audit → recommendation`

Explicitly state what the AI does **not** do:
- does not invent ratings
- does not rank by affiliate commission
- does not substitute a different city when the user explicitly selected one

## Visual direction

### Brand concept

**Aegean Editorial Intelligence**

A premium Mediterranean editorial system combined with a modern decision-product UI. Avoid generic travel gradients, glassmorphism overload and stock-booking-site card grids.

### Palette

- Deep Aegean: `#123D3A`
- Pine: `#1E5954`
- Sea: `#4B8E89`
- Chalk: `#F4EFE5`
- Warm paper: `#FFF9F0`
- Terracotta: `#E87358`
- Sun: `#DDBA59`
- Ink: `#172321`
- Muted ink: `#64736F`
- Hairline: `#D9D7CC`

### Typography

- Editorial display: `Instrument Serif`, Georgia fallback
- Product/UI: `Inter`, system-ui fallback

Use oversized editorial headings, restrained UI type, generous line-height and high contrast.

### Shape language

- Hero surfaces: 28–36px radius
- Product panels: 20–24px radius
- Chips: pill
- Map markers: custom ranked teardrop, not default Leaflet pins
- Borders are subtle; depth comes from spacing before shadow

## Webflow component library

Create these reusable components after a site is connected:

- `Nav / Primary`
- `Nav / Locale Switch`
- `Hero / AI Prompt`
- `Chip / Intent`
- `Card / Destination Editorial`
- `Card / Destination Rank`
- `Card / Evidence`
- `Card / Season`
- `Compare / Three Destination`
- `Trust / Source Status`
- `Map / Ranked Shell`
- `CTA / AI Planner`
- `Footer / Primary`

Variants:
- light / dark
- EL / EN content through localization
- compact / editorial
- map-active / map-idle

## Webflow CMS model

### Destinations

Required fields:
- Name EL
- Name EN
- Slug
- Region
- Type (Island / Mainland / City / Mountain / Coastal)
- Hero image
- Gallery
- One-line fit EL
- One-line fit EN
- Best months
- Traveler fit
- Budget tier
- Crowd level
- Route confidence display
- Ideal nights
- Tags
- Editorial body EL
- Editorial body EN
- API destination slug
- Related destinations
- SEO title EL/EN
- SEO description EL/EN

### Seasonal Guides

- Title EL/EN
- Slug
- Season/month
- Hero image
- Intro EL/EN
- Body EL/EN
- Featured destinations
- Traveler type
- Canonical query theme
- Updated date

### Methodology / Trust notes

- Source name
- Source type
- What it is used for
- What it is not used for
- Live / optional / first-party status

## Runtime integration contract

Webflow must never own service-role credentials or paid provider secrets.

Public browser calls go only to safe Next.js routes, for example:

- `GET /api/ai-map`
- `GET /api/ai-map/:slug`
- `POST /api/recommend/stream`
- `GET /api/destination-detail`
- `POST /api/trip-builder`

Recommended integration pattern:

1. Webflow renders the page and branded shell.
2. A small page script mounts interactive widgets into elements with `data-travel-*` attributes.
3. Widgets call the existing Next.js API origin.
4. Streaming planner reads NDJSON from `/api/recommend/stream`.
5. AI Map mounts Leaflet and consumes `/api/ai-map`.
6. Webflow CMS supplies editorial copy and imagery; runtime APIs supply volatile evidence.

## Required data attributes

- `[data-travel-planner-root]`
- `[data-travel-prompt]`
- `[data-travel-start]`
- `[data-ai-map-root]`
- `[data-destination-slug]`
- `[data-evidence-root]`
- `[data-locale]`

## Migration sequence

### Phase A — Webflow foundation

1. Create/connect blank Webflow site.
2. Create variables/tokens from `design-system.css`.
3. Build Primary Nav and Footer components.
4. Build Home from `home.whtml.html`.
5. Build AI Map page from `ai-map.whtml.html`.
6. Create destination CMS.
7. Apply bilingual localization.

### Phase B — runtime bridge

1. Configure `NEXT_PUBLIC_WEBFLOW_ORIGIN`/CORS allowlist on runtime.
2. Host the integration JS from the existing Next.js project.
3. Mount planner and map widgets into Webflow shells.
4. Keep all external API credentials server-side.
5. Add runtime health/evidence badges.

### Phase C — SEO and production

1. Canonicals + hreflang.
2. Destination CMS schema markup.
3. Sitemap inclusion rules.
4. Redirect old Next.js marketing paths where appropriate.
5. Keep API routes on the runtime origin.
6. QA desktop/tablet/mobile.
7. Publish Webflow only after AI bridge and analytics tests pass.

## Acceptance criteria

- No unrelated destination can appear after an explicit city selection.
- AI Map works on desktop and mobile.
- No fabricated Tripadvisor/Booking scores.
- Home has one H1.
- EL and EN have equivalent navigation and core content.
- Core Webflow pages achieve good semantic/SEO structure before launch.
- AI interactions remain streaming and do not regress to static forms.
- The visual system is recognizably premium Greece travel, not a generic template.
