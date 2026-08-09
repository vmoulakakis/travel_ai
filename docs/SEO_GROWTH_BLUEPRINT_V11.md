# Travel Guru V11 - SEO, sharing and guide growth blueprint

Updated: 2026-08-09

## Executive decision

Recommended public domain: **taxidiguru.gr**.

Why: short enough to remember, clear travel meaning for Greek users, aligned with the existing Guru identity, and not dependent on one destination or season. Exact-match keywords in a domain are not a ranking strategy by themselves; brand recall, trustworthy results and useful destination pages matter more.

Final registration availability is **unverified until checked and submitted through the official .gr Web WHOIS/registrar flow**. Search and DNS pre-screening found no active indexed site for the shortlist, but this is not proof of availability.

## Domain shortlist

| Rank | Candidate | Strength | Risk | Pre-screen |
|---|---|---|---|---|
| 1 | taxidiguru.gr | Clear, memorable, matches the product | Greeklish/English blend | No active site observed; official WHOIS still required |
| 2 | pameellada.gr | Friendly, national and easy to say | More generic; may sound like a campaign | No active site observed; official WHOIS still required |
| 3 | taxidimou.gr | Personal and warm | Less explicit about AI guidance | No active site observed; official WHOIS still required |
| 4 | apodrasiguru.gr | Strong for short-break intent | Narrows the brand toward escapes | No active site observed; official WHOIS still required |
| 5 | pounapao.gr | Excellent problem-language match | Search ambiguity with music/lyrics | No active site observed; official WHOIS still required |

## Greek keyword architecture

The following are intent clusters, not fictional keyword volumes.

| Cluster | Primary phrase | Evidence | Page type | Commercial role |
|---|---|---|---|---|
| Decision uncertainty | πού να πάω διακοπές | Observed SERP language + inferred product fit | Homepage funnel | Core acquisition |
| Domestic discovery | προορισμοί στην Ελλάδα | Observed competitor architecture | Destination hub | Broad discovery |
| International discovery | ταξίδια στο εξωτερικό | Observed broad discovery language | Destination hub | Broad discovery |
| City break | city break από Αθήνα | Inferred from route-and-duration problem | Origin-specific comparison | High practical intent |
| Short breaks | αποδράσεις σαββατοκύριακου | Observed editorial results | Curated landing pages | High consideration |
| Budget | οικονομικές διακοπές στην Ελλάδα | Observed editorial results | Evidence-led comparison | Commercial research |
| Origin constraint | προορισμοί κοντά στην Αθήνα | Observed editorial results | Origin-specific comparison | High practical intent |
| Psychology | ποιο ελληνικό νησί μου ταιριάζει | Inferred from user problem | Interactive funnel | Differentiator |
| Season | πού να πάω διακοπές τον Σεπτέμβριο | Inferred from recurring seasonal SERPs | Monthly decision page | Seasonal demand |
| Segment | οικογενειακές διακοπές στην Ελλάδα | Inferred + common travel taxonomy | Segment comparison | High consideration |
| Couple | ρομαντικές αποδράσεις στην Ελλάδα | Inferred + common travel taxonomy | Segment comparison | High consideration |
| Low crowd | ήσυχα νησιά στην Ελλάδα | Inferred from review/community pain | Honest comparison | Defensible long-tail |

Every destination page targets a unique decision job: best period, trip duration, effort, budget, crowd trade-off and traveler fit. It must not become a thin template containing only a changed place name.

## The bounded SEO agent

Autonomy level: **bounded analysis, human-reviewed publication**.

Weekly loop:

1. Load the canonical Greek-language catalog for Greece and international trips.
2. Calculate season relevance, route confidence and content gaps.
3. Create evidence-labelled query opportunities.
4. Store them as `draft` in Supabase.
5. Reject fabricated ratings, duplicate pages and unsupported superlatives.
6. Require review before any page becomes indexable.
7. Later, join Search Console impressions/clicks and first-party conversion events when that integration is explicitly connected.

Stop conditions:

- no original value beyond an existing page;
- no reliable evidence for a factual claim;
- content differs only by destination name;
- a page would exist mainly to manipulate rankings;
- a source prohibits automated reuse.

## Legal, durable backlink system

1. **Data-led digital PR:** publish quarterly, anonymized insights such as which traveler needs conflict most often, how season changes the final choice, or which destinations are overlooked by origin city. Pitch the real dataset and methodology to Greek travel/business media.
2. **Embeddable Travel Fit card:** offer a useful, lightweight destination-fit card or mini quiz to travel blogs. Attribution is optional and editorial; never require keyword-rich anchor text.
3. **Local expert contributions:** invite guides, cultural organizations and event organizers to contribute one verifiable local note. Give a profile/source citation, not a paid-link exchange.
4. **Resource pages:** create genuinely useful planning resources for families, couples, accessible travel and shoulder season. Outreach targets pages already curating Greek travel resources.
5. **Journalist response workflow:** answer relevant media requests with transparent first-party data and a named methodology page.
6. **Original visual assets:** offer reusable infographics with a canonical source page and clear reuse terms.
7. **Broken-resource replacement:** identify outdated Greek travel resources and suggest a superior current guide only when it genuinely replaces the missing value.

Forbidden: bought links passing ranking credit, automated directory submissions, private blog networks, mass guest posts, link exchanges at scale, fake awards, fake reviews and hidden sponsored relationships.

## Tripadvisor boundary

Public Tripadvisor pages may be consulted manually as one signal during a specific destination research task. The product must not scrape reviews automatically, copy review text, or present Tripadvisor scores as first-party facts without a licensed data path and current verification. Official tourism, event organizers, weather providers and the product's own destination knowledge remain the default evidence sources.

## Sharing and prize mechanics

The live product uses native device sharing. The shared URL points to an internal destination page and gets a destination-specific Open Graph image composed from a real database photo.

Prize messaging remains disabled unless all of these exist:

- real prize and responsible organizer;
- start/end dates and territory;
- eligibility and minimum age;
- entry method that does not force misleading social actions;
- draw/judging method and winner contact process;
- privacy notice, retention period and platform disclaimers;
- internal terms page connected through `NEXT_PUBLIC_GIVEAWAY_TERMS_PATH`.

## PDF engine decision

Evaluated: `pdfme/pdfme` for a future visual template editor. Implemented now: `pdf-lib` plus `soldair/node-qrcode` for smaller production footprint and strict server-side validation.

The eight-page guide is generated only when:

- destination exists in the canonical catalog;
- the requested stay exists for the selected destination;
- `valid_from` covers the start date;
- `valid_to` covers the end date;
- the outbound URL is an exact `https://go.linkwi.se/.../CD104/...` URL.

## KPI tree

Primary business outcome: useful trip decision leading to a qualified final handoff.

| KPI | Definition | Decision |
|---|---|---|
| Qualified destination rate | destination selections / completed recommendation sessions | Diagnose recommendation usefulness |
| Share activation | successful native shares or link copies / destination selections | Measure social intent, not button clicks |
| Guide activation | valid PDF downloads / stay impressions | Measure planning commitment |
| Guide-to-handoff | outbound clicks after guide download / guide downloads | Test whether the guide helps or distracts |
| Destination SEO engagement | qualified funnel starts / organic destination visits | Judge search traffic quality |
| Approved outcome rate | approved outcomes / outbound clicks | Ultimate quality guardrail when data becomes available |

## Evidence and references

- Google Search Central: spam policies, generative AI guidance, helpful content, structured data and mobile-first indexing.
- EETT / .gr Registry: official registration and Web WHOIS process.
- GitHub: `pdfme/pdfme`, `soldair/node-qrcode`, `garmeeh/next-seo`, Vercel/Next.js Open Graph implementation discussions.
- Public Greek travel SERPs observed on 2026-08-09 for domestic destinations, weekend breaks, economical travel and origin-constrained trips.

## Next gate

Register the chosen domain through an EETT-listed registrar, connect it to Vercel, set `NEXT_PUBLIC_SITE_URL`, then verify the property in Google Search Console. Search Console data is required before the SEO agent can optimize from real impressions and clicks rather than public-demand inference.
