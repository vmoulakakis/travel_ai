# `travelai_greece` -> `travel_ai` Legacy Salvage Audit

Date: 2026-09-17

## Purpose
Evaluate the frozen `vmoulakakis/travelai_greece` repository as a historical knowledge source and identify anything worth integrating into the canonical `vmoulakakis/travel_ai` repository without regressing the current product.

## Executive conclusion
Do **not** merge or copy the legacy repository wholesale.

The canonical repository is already a functional superset. Most legacy skills, documents, scripts and several runtime modules are already present byte-for-byte. Where Git object SHAs differ, the canonical versions are generally newer/evolved and are connected to later V29-V40 product and regression work.

The useful extraction is therefore **operational knowledge and regression discipline**, captured in `skills/travel-regression-guardian/SKILL.md`, rather than old runtime implementation.

## Skills comparison

### Already identical in both repositories
The following skill directories have the same Git tree SHA in the compared `main` branches and require no port:

- `travel-fullstack-auditor`
- `travel-guru`
- `travel-learning`
- `travel-model-router`
- `travel-stay-constraint-auditor`
- `travel-web-design`
- `travel-web-designer`

### `travel-orchestrator`
The legacy repository contains the V15 orchestrator skill. The canonical repository contains the newer V35 skill with the inventory-reality pass, reverse check, explicit solution ranking and current route contract.

Decision: **keep canonical; do not overwrite with V15**.

### Skills only in canonical
The current repository also contains newer capabilities such as:

- `greece-seo-growth`
- `web-design`

This reinforces that the canonical skill layer is already ahead of the frozen repository.

## Documentation comparison
Many historical documents are already present in the canonical repository with the same blob SHA, including architecture, V9/V10/V12 blueprints, V10 evaluation, the V11 SEO blueprint, stay intelligence and historical audit documents. Canonical additionally contains later design, deployment and product-generation documentation.

Decision: **no bulk documentation copy**.

## Test and script comparison
The legacy `package.json` strict suite ends at the V26 criterion-combination generation.

The canonical suite retains those historical gates and extends them with later checks including V29 SEO, V30 location/map, V31 Webflow/native production, V32 multipage product map, V34 semantic funnel, V36 bidirectional funnel, V37 live-agent scenarios, V38 cinematic 360, V39 map review and V40 experience checks.

Decision: **canonical strict suite is the stronger regression baseline**. Do not replace it with the legacy script set.

## Runtime comparison
At top-level `lib/` comparison:

### Identical or preserved
- `commerce/`
- `continuity.ts`
- `site.ts`
- `validation/`

### Evolved in canonical
- `ai/`
- `data/`
- `decision/`
- `seo/`
- `trip-builder/`

Canonical also adds newer runtime infrastructure such as `lib/http/`.

Decision: **never copy the legacy `lib/` tree over canonical**. Any future salvage must be function-level and justified by a missing capability plus a regression test.

## Legacy principles worth retaining
The legacy repo still documents durable principles that should survive future rewrites:

1. hard traveler constraints own eligibility;
2. accommodation inventory does not define destination truth;
3. affiliate economics have zero destination-fit weight;
4. model output cannot invent factual travel evidence;
5. deterministic/result audit may reject candidates;
6. insufficient confidence may return no recommendation rather than fabricate one;
7. learned influence stays bounded behind evidence thresholds;
8. expensive model verification is conditional;
9. post-deploy validation includes health, deterministic match, semantic/free-text match and downstream stay lookup.

These principles are now formalized in `skills/travel-regression-guardian/SKILL.md`.

## Freeze policy for `travelai_greece`
Keep the repository frozen as historical/reference material until the public production lineage is fully consolidated onto `travel_ai`.

Allowed:
- read and compare;
- recover a demonstrably missing requirement or test idea;
- use historical behavior as regression evidence.

Not allowed:
- new feature development there;
- treating it as production source of truth;
- copying old runtime trees wholesale into `travel_ai`;
- deleting/archiving it before the remaining production deployment lineage has been migrated and verified.

## Future salvage rule
A candidate from `travelai_greece` is eligible for integration only when all three are true:

1. the capability is absent from current `travel_ai`;
2. it remains valid for the current architecture;
3. it can be introduced with a deterministic test and without weakening current release gates.

Otherwise, leave it in history.
