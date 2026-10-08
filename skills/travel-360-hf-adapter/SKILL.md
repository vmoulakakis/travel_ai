---
name: travel-360-hf-adapter
description: TravelAI's integration guide for MyAgenticTeam 360 intelligence, multilingual retrieval, seasonal ranking and SEO.
version: 0.1.0
---
# TravelAI 360 adapter

Canonical cross-project guidance lives in MyAgenticTeam at `skills/travel-360-intelligence/SKILL.md`. Follow this project's `skills/travel-orchestrator/SKILL.md`, `skills/travel-learning/SKILL.md`, `skills/travel-regression-guardian/SKILL.md` and `skills/greece-seo-growth/SKILL.md`.

Use evidence-backed temporal and geospatial context, travel intent, verified inventory and value before recommending stays. Retrieve from the entire eligible catalog; display an explorable Top 100 and a personalized Top 3–5. Respect explicit exclusions before any model scoring. Keep affiliate payouts separate from traveler fit.

Candidate open multilingual embedding baselines are `intfloat/multilingual-e5-small` and `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. Verify runtime availability, language relevance, data security and costs; HF model discovery alone does not constitute production inference integration.

Do not claim a pretrained recommender, dense embeddings, real-time availability or calibrated conversion probabilities without verifying them. Record model version, source provenance, feature completeness, uncertainty, evaluation metrics and bounded fallbacks. Missing embeddings mean structured/lexical retrieval remains active.

Before any activation: inspect data, add offline scenario benchmarks, run typecheck, strict regression suite, build and endpoint tests. Never deploy an unverified implementation.
