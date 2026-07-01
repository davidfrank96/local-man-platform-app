# Localman Production Hardening Summary

Closeout Date: 2026-07-01

Production Data Version: 1.0

Final Status: Production hardening complete.

## Executive Summary

The Localman Production Hardening Project closed the marketplace data and runtime architecture around a certified Production Data v1.0 baseline.

Production is now the operational source of truth. Original onboarding workbooks remain historical source documents. Future audits must classify differences as `SOURCE_MATCH`, `APPROVED_PRODUCTION_OVERRIDE`, or `UNEXPECTED_CHANGE`.

## Architecture Improvements

- Discovery scaling now separates map visibility from card pagination.
- Search and ranking run against the complete active discovery dataset before pagination.
- Map receives all matching vendors and uses MapLibre native clustering.
- Card pagination cannot change discovery, search, clustering, or selected vendor behavior.
- Selected vendor id remains the single source of truth across cards, map, camera, and admin edit state.

## Data Improvements

- Production Data v1.0 closed at 137 active vendors.
- Category mappings are preserved through multi-category vendor records.
- Featured dish correction v1 removed generated duplication from the production dataset.
- Content quality correction v1 polished human-readable content without changing protected operational fields.
- Coordinate correction v1 reduced duplicate-coordinate map artifacts using approved review packages.
- Protected local food names are documented in `docs/LOCALMAN_FOOD_DICTIONARY.md`.

## Operational Improvements

- Permanent import pipeline v1.0 is documented.
- Every future batch requires validation, governance review, coordinate validation, duplicate-coordinate audit, content review, release gate, post-import audit, quality score, and history update.
- Approved production overrides are recorded in `docs/PRODUCTION_CHANGELOG.md`.
- Production baseline and certification docs now distinguish source matches, approved overrides, and unexpected changes.

## Security And Safety Improvements

- Production operations require explicit approval before SQL execution, imports, marketplace reset, or production data changes.
- CSV intake preview body limit is route-specific and does not change global API defaults.
- Marketplace reset remains explicit, dry-run first, and protected by confirmation.
- Admin edit workspace prevents stale vendor identity from being saved or used for image uploads.

## Import Improvements

- Governance values are reviewed instead of silently remapped.
- Coordinates are checked against area, address, and Abuja/FCT bounds.
- Duplicate coordinate audits are mandatory before and after imports.
- Category fields `category_1` through `category_6` are preserved.
- Featured dish slots `dish_1` through `dish_3` are preserved without fallback duplication.
- Rows with unresolved blockers are extracted for field-agent follow-up.

## Discovery Improvements

- Radius determines the complete matching dataset.
- Map receives all matching vendors.
- Cards are paginated with default page size 25 and maximum page size 50.
- Search runs against all matching vendors before pagination.
- Load More appends without duplicates or skipped vendors.

## Map Improvements

- MapLibre native clustering handles dense vendor groups.
- Clusters display counts only.
- Individual vendors display storefront markers.
- Selected vendor overlay remains visible above clustered source state.
- Same-location selector handles exact duplicate coordinates.
- Mobile camera offsets keep selected markers visible above card/sheet UI.

## Admin Improvements

- Dashboard counts use database totals instead of loaded-page counts.
- Vendor registry remains paginated and can show loaded count versus total count.
- Edit workspace remounts or resets when selected vendor changes.
- Image upload targets the current selected vendor.
- Save actions must use the current selected vendor identity.

## Lessons Learned

- Generated CSVs are not source of truth when source workbooks and production evidence conflict.
- Production/workbook differences must be investigated before correction.
- Approved production edits need a permanent register so future audits do not repeatedly flag intentional differences.
- Coordinate quality directly affects user trust on the map.
- Card pagination and map visibility must remain separate ownership surfaces.

## Future Roadmap

- Continue onboarding through the permanent import pipeline.
- Run duplicate-coordinate audits after every production batch.
- Add richer field-agent correction workflows for low-confidence addresses.
- Add explicit display ordering for multi-dish featured dish rows if product requires fixed slot order.
- Keep browser/mobile release-gate smoke tests current with production scale.
- Continue admin portal redesign on top of the certified Production Data v1.0 baseline.

## Final Baseline References

- Architecture: `docs/ARCHITECTURE.md`
- Discovery: `docs/DISCOVERY.md`
- Import pipeline: `docs/IMPORT_PIPELINE.md`
- Release gate: `docs/MASTER_RELEASE_GATE.md`
- Regression locks: `docs/PERMANENT_REGRESSION_LOCKS.md`
- Production baseline: `docs/PRODUCTION_DATA_BASELINE.md`
- Production integrity: `docs/PRODUCTION_DATA_INTEGRITY.md`
- Override policy: `docs/PRODUCTION_OVERRIDE_POLICY.md`
- Production changelog: `docs/PRODUCTION_CHANGELOG.md`
- Import history: `docs/PRODUCTION_IMPORT_HISTORY.md`
