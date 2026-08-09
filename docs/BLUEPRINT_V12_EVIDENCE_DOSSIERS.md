# Ελληνικός AI Travel Guru — V12 Evidence & Dossier Blueprint

Updated: 2026-08-09

## Product contract

V12 is a Greece-wide AI travel decision system. It does not choose a destination because a hotel pays, because a review site ranks it, or because the database has many offers. It first understands the traveler, then ranks destinations against hard and soft criteria, then verifies time-sensitive evidence, and only after destination selection shows stays whose exact CD104 feed link covers the entire requested trip.

The traveler never sees provider, token, quota, timeout, model, database, or scraping errors. Missing evidence produces a clear absence state rather than an invented claim.

## Decision team

| Role | Responsibility | May not do |
|---|---|---|
| Intent Interpreter | Convert answers and free text into structured hard/soft criteria | Invent a destination, price, route, rating, or event |
| Psychology Reader | Infer desired emotional outcome, energy, novelty, social rhythm, and pace | Diagnose personality or collect sensitive data |
| Catalog Explorer | Search the active Greek destination graph | Use offer economics to rank destinations |
| Matchmaker | Apply hard gates, bounded scoring, and diversity | Relax a red line without labelling the compromise |
| Season Analyst | Evaluate month fit, crowd posture, duration, and travel effort | Present a seasonal score as a weather forecast |
| Evidence Verifier | Admit only fresh, timestamped, source-backed facts | Scrape prohibited sources or expose source URLs as commerce exits |
| Skeptic | Challenge the shortlist and expose trade-offs | Replace deterministic eligibility rules |
| Storyteller | Produce distinct, engaging explanations and dossiers | Turn uncertain evidence into fact |

## End-to-end funnel

1. Home offers “I do not know”, “I have an idea”, “surprise me”, and a weekly AI choice.
2. Five-stage funnel learns dates, party, emotional outcome, energy, novelty, pace, must-have, red line, effort, total group budget, stay posture, flexibility, and free text.
3. Hard gates remove impossible candidates before scoring.
4. Soft matching returns up to eight diverse Greek choices, each with a personal reason, psychology hook, season note, effort, and honest trade-off.
5. The user compares up to three and selects one destination.
6. The destination landing page becomes date-specific and displays only current evidence, relevant events, and full-trip-valid stays.
7. A personal ten-page dossier and a multi-destination thematic edition use real eligible database photos and one exact CD104 QR per offer.
8. The only commerce exit is the exact stored `https://go.linkwi.se/.../CD104/...` tracking URL.

## Evidence policy

- `destination_evidence_v12` stores provider, evidence type, subject, observation time, expiry, confidence, status, fingerprint, optional month/rank/rating/review count, date window, and optional stay product ID.
- TripAdvisor popularity statements require a source month and year. They expire and disappear automatically.
- Booking proof is attached to a stay only when `source_product_id` matches that exact offer. Generic destination evidence cannot become a property badge.
- Events are displayed only when their verified interval overlaps the selected dates.
- Third-party source URLs remain server-side. They are evidence provenance, not user exits.
- Automated collection from sources whose terms prohibit it is not part of the system. Approved APIs, official tourism/event calendars, licensed feeds, or timestamped reviewed snapshots are allowed.
- The daily evidence audit expires stale rows and queues the next three monthly thematic dossier research runs. Publishing remains gated by verified evidence.

## Media truth contract

- Live area and property photography comes from eligible database offers or `destination_media_v12` rows with verified rights.
- Every governed asset records provider, source, rights status, truthful label, observation time, and—if synthetic—the generation model.
- Enhancement may improve crop, color, contrast, or resolution but must not materially add landscape, amenities, rooms, views, or weather.
- Synthetic concept art must be visibly labelled and may not be presented as the actual destination or property.
- Drone-like video is disabled in this release. Open-source image-to-video software is acceptable only when self-hosted compute, rights, provenance, disclosure, and visual QA are available; it is never a substitute for real property evidence.

## PDF system

### Personal dossier

- Ten A4 pages with destination verdict, dates, decision explanation, real stay imagery, reputation snapshot, exact-date events, property gallery, practical plan, trade-off, and final handoff.
- Large high-error-correction QR and printed exact tracking URL on every conversion handoff.
- No fake rating, event, scarcity, discount, price, or availability claim.

### Thematic edition

- Themes: surprise, sea, culture, romance, food, nature, and family.
- Ranks by month fit, thematic affinity, crowd posture, and cost tier, then requires at least three destinations with a full-trip-valid CD104 offer.
- Produces three to six distinct choices, real database imagery, transparent evidence absence states, and one exact offer QR per destination.

The current runtime uses `pdf-lib` because it is already stable in the deployed Next.js server bundle. `pdfme`, React-PDF, Typst, and WeasyPrint are evaluated options for a future editable template studio; no repository code is copied without license and security review.

## Model routing

- Deterministic matching and validity gates always operate without an LLM.
- Language models may parse intent and synthesize cited research, but their output is schema-checked and cannot create eligibility facts.
- Primary configured providers can be replaced by an OpenAI-compatible self-hosted endpoint using `SELF_HOSTED_AI_BASE_URL`, `SELF_HOSTED_AI_MODEL`, and optional `SELF_HOSTED_AI_API_KEY`.
- Qwen-class open-weight models can be served through vLLM or Ollama, but open weights do not mean free compute. Provider failures fall back to deterministic product behavior.

## Database and security

- `destination_evidence_v12`, `destination_media_v12`, and `thematic_dossier_runs_v12` have RLS enabled, explicit default-deny policies, no `anon`, `authenticated`, or `public` grants, and service-role-only access.
- The client receives a reduced evidence bundle that excludes source URLs and internal payloads.
- Consumer evidence reads always use the read-only `destination-evidence-v12` Edge Function. It accepts only a validated destination slug and returns a reduced allow-list without source URLs, payloads, or credentials. Next.js service-role configuration cannot change this public evidence contract.
- Anonymous learning stores structured features and outcomes, not identity or raw private conversation.
- Secrets live only in Supabase/Vercel environment configuration. Never place raw keys in Git, PDFs, browser code, logs, or this blueprint.

## Release gates

1. TypeScript typecheck and production build pass.
2. V8/V9 smoke suites pass.
3. V10 suite passes 100 traveler scenarios and all acceptance checks.
4. All surfaced offers cover the whole trip, use an eligible database image, and contain `/CD104/`.
5. Evidence is verified and unexpired; TripAdvisor rows include source month; events overlap dates.
6. Render and visually inspect every page of both PDF types; decode QR codes and compare them byte-for-byte with their exact offer URLs.
7. Browser-test the complete home → funnel → results → destination → stay → outbound journey on production.
8. Scan all consumer anchors: internal navigation or exact CD104 tracking URL only.
9. Run Supabase security/performance advisors and inspect Vercel runtime logs.

## Recovery map

- GitHub: `github.com/vmoulakakis/travel_ai`, branch `main`.
- Vercel: project `travel-ai`, ID `prj_kdR7ALi7Z1zETL1GcD98t3SFLESA`.
- Supabase: project ref `bgvgstpoypqbjnemqcqp`.
- Main experience: `components/travel-decision-experience.tsx`, `app/v8.css`.
- Destination landing: `app/proorismoi/[slug]/page.tsx`, `app/proorismoi/v12.css`.
- Matcher: `lib/decision/v8-matcher.ts`.
- Evidence loader: `lib/data/evidence-v12.ts`.
- Public evidence gateway: `supabase/functions/destination-evidence-v12/index.ts`.
- Personal PDF: `app/api/guide/route.ts`.
- Thematic PDF: `app/api/thematic-guide/route.ts`.
- Evidence audit: `app/api/jobs/evidence-audit/route.ts` and `vercel.json`.
- Schema: migrations `20260809143000_evidence_dossiers_v12.sql`, `20260809145500_seed_verified_corfu_evidence_v12.sql`, and `20260809152000_explicit_service_only_policies_v12.sql`.
- Scenario regression: `scripts/v10-scenario-suite.ts`.

Update this blueprint whenever the decision contract, evidence sources, agent permissions, media policy, PDF structure, data schema, or deployment topology changes.
