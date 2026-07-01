# Production Import History

This file is the permanent record of Localman production marketplace imports.

Current vendor onboarding workflow version: `v1.0`

Record every production vendor onboarding batch here before the batch is considered complete. The history should stay factual: counts, areas, warnings, validation outcome, coordinate review outcome, quality score, and sign-off status. Do not use this file for raw vendor data, credentials, private rider information, or database exports.

## Batch History

| Batch | Import Date | Vendor Count | Category Mapping Count | Areas Covered | Warnings | Outcome |
| --- | --- | ---: | ---: | --- | --- | --- |
| Batch 1 | 2026-06-22 | 16 | 55 | Wuse, Asokoro | Images intentionally omitted for Batch 1; riders and ratings not included in this batch; some vendor display names need later editorial cleanup. | GREEN - post-import verification passed |
| Batch 2 | 2026-06-22 | 17 | 66 | Wuse | Initial workbook validation found blocker rows that were corrected or excluded before import; images intentionally omitted; area remained Wuse. | GREEN - imported after blocker handling and validation |
| Batch 3 | 2026-06-22 | 23 | 69 | Jabi, Utako | Images intentionally omitted; time formatting normalized; three phone values normalized; one duplicate slug resolved deterministically. | GREEN - imported after duplicate slug and phone integrity review |
| Batch 4 | 2026-06-24 | 81 | 245 | Abuja governed areas after review | Governance review, coordinate validation, duplicate slug handling, excluded-vendor package, and geographic area validation completed before import. | GREEN - imported after blocker resolution and post-import validation |

## Production Data v1.0 Closeout

- Closeout date: 2026-07-01
- Production Data Version: 1.0
- Vendor count: 137
- Active vendor count: 137
- Category mappings: 435
- Vendor hours rows: 959
- Featured dish rows: 189
- Vendor image rows: 54
- Certification model: production matches original workbook or approved production override
- Certification status: CERTIFIED
- Override policy: `docs/PRODUCTION_OVERRIDE_POLICY.md`
- Override register: `docs/PRODUCTION_CHANGELOG.md`
- Integrity report: `docs/PRODUCTION_DATA_INTEGRITY.md`
- Baseline report: `docs/PRODUCTION_DATA_BASELINE.md`

## Production Featured Dish Correction v1

- Execution date: 2026-06-29
- Correction package: `outputs/dish-correction/featured-dish-correction-review.xlsx`
- Approved SQL draft: `outputs/dish-correction/apply-featured-dish-corrections.sql`
- Vendors corrected: 120
- Vendors excluded: 1 (`natures-delight-natural-drink`)
- Remaining manual review vendor: Nature's delight Natural drink
- Featured dish rows deleted: 360
- Featured dish rows inserted: 138
- Featured dish row count after correction: 189
- Scope: featured dish rows only; vendor names, slugs, phones, addresses, areas, categories, coordinates, hours, ratings, and analytics were not changed.
- Verification: production database audit matched the approved correction package with zero dish-set mismatches; the excluded manual-review vendor remained unchanged.
- Follow-up: featured dish rows do not have a dedicated display-order column, so multi-dish ordering should be treated as a separate schema/UI ordering concern if fixed dish slot order becomes product-critical.

## Production Coordinate Correction v1

- Approval date: 2026-06-29
- Approved update scope: 20 vendors
- Excluded scope: 5 revisit/rejected vendors
- Scope: latitude and longitude only
- Protected fields: vendor names, slugs, phones, addresses, categories, featured dishes, hours, areas, ratings, and analytics were not changed.
- Verification: vendor count remained unchanged; updated coordinates stayed inside Abuja/FCT bounds; duplicate-coordinate group size reduced.
- Baseline status: approved production override recorded in `docs/PRODUCTION_CHANGELOG.md`.

## Production Content Quality Correction v1

- Execution date: 2026-06-29
- Vendors updated: 41
- Content fields updated: 85
- Vendor name updates: 2
- Featured dish name updates: 23
- Dish description updates: 35
- Vendor description updates: 25
- Scope: human-readable content only
- Protected fields: coordinates, phones, governance areas, categories, hours, ratings, analytics, discovery, search, map, and slugs were not changed.
- Baseline status: approved production override recorded in `docs/PRODUCTION_CHANGELOG.md`.

## Production Architecture Hardening

- Discovery scaling: map receives all matching vendors; cards are paginated.
- Search: runs against the complete active discovery dataset before pagination.
- Map: MapLibre clustering, storefront markers, selected overlay, card-click priority, and same-location selector are locked.
- Admin dashboard: database aggregate totals replace loaded-page counts.
- Admin edit workspace: selected vendor changes remount/reset edit state; image upload targets current vendor.
- CSV intake: route-specific preview body limit added without changing global API body limits.
- Baseline status: approved hardening changes recorded in `docs/PRODUCTION_CHANGELOG.md`.

## Batch 1 Notes

- Marketplace reset had already completed before Batch 1 onboarding.
- Expected counts were met: 16 vendors and 55 category mappings.
- Every imported vendor had 7 vendor-hour rows and 3 featured dishes.
- Vendor images were optional for Batch 1 and were not imported.
- Post-import checks found no duplicate slugs, duplicate category mappings, orphaned vendor records, missing coordinates, or invalid phone shapes.
- Public discovery, category filters, search, vendor profiles, and admin page rendering were verified after import.

## Batch 2 Notes

- Source workbook: `Localman_app_vendors 2nd June 2026.xlsx`.
- Batch 2 used the same production import standard as Batch 1.
- Initial transformation reviewed 19 source rows and surfaced blocker rows for category overflow, duplicate slug, and required hours.
- Final imported production record is 17 vendors and 66 category mappings after blocker handling.
- Vendor images were optional and were not imported.
- Discovery, search, category mapping, and admin review remain governed by the same post-import checks as Batch 1.

## Batch 3 Notes

- Source workbook: `Localman_app_vendors2026-3rd : 4th June.xlsx`.
- Batch 3 added Jabi and Utako production vendors.
- Final imported production record is 23 vendors and 69 category mappings.
- Phone integrity was explicitly checked after spreadsheet numeric conversion risk was found; corrected CSV values preserve callable Nigerian numbers through importer normalization.
- Duplicate slug `mama-mary` was resolved with a deterministic unique slug while preserving vendor names.
- Vendor images were optional and were not imported.
- Time normalization warnings were accepted after manual review; suspicious overnight ranges remained review warnings, not silent corrections.

## Batch 4 Notes

- Source workbook: `Localman_app_second_acc2026-06-24_07_24_53.xlsx`.
- Batch 4 added 81 production vendors after governance, coordinate, slug, phone, category, hours, and CSV-safety validation.
- The source audit found unknown governance values, duplicate slug risk, excluded coordinate blockers, and location consistency warnings before the final import package was generated.
- Excluded vendors were moved into a correction workbook for field-agent follow-up instead of being silently corrected.
- Final import preserved category mappings, featured dishes, source phone values through importer normalization, area governance decisions, and approved coordinates.
- Post-import verification confirmed the expected total of 137 production vendors.

## Future Batch Template

Copy this block for each new production import batch.

```md
## Batch N

- Import date:
- Operator:
- Source workbook:
- Production CSV:
- Vendor count:
- Category mapping count:
- Areas covered:
- New areas introduced:
- Vendors with images:
- Vendors without images:
- Riders imported:
- Ratings imported:

### Validation Summary

- Source validation:
- Governance review:
- Pre-import validation:
- CSV parser validation:
- Phone validation:
- Coordinate validation:
- Duplicate coordinate audit:
- Description review:
- Category validation:
- Hours validation:
- Duplicate slug check:
- Dry-run result:
- Release gate result:

### Warnings

- Warning 1:
- Warning 2:

### Exclusions And Manual Review

- Excluded vendor count:
- Exclusion reasons:
- Manual review count:
- Approved warnings:

### Coordinate Review

- Duplicate coordinate groups before import:
- Approved coordinate candidates:
- Review coordinate candidates:
- Revisit coordinate candidates:
- Approved coordinate corrections applied:

### Post-Import Verification

- Vendor count:
- Vendor hours count:
- Vendor category mappings count:
- Featured dishes count:
- Orphan checks:
- Discovery checks:
- Category filter checks:
- Search checks:
- Vendor profile checks:
- Admin checks:
- Map and cluster checks:
- Dashboard count checks:
- Post-import duplicate coordinate audit:

### Quality Score

- Grade: PASS / WARNING / FAIL
- Overall quality:
- Warning count:
- Fail count:
- Manual review count:

### Outcome

- Verdict: GREEN / YELLOW / RED
- Sign-off owner:
- Sign-off date:
- Follow-up items:
```

## Outcome Definitions

- `GREEN`: Import completed and post-import verification passed with no release-blocking issues.
- `YELLOW`: Import completed with known non-blocking warnings that must be tracked.
- `RED`: Import should not be considered production-ready. Stop and resolve blockers before launch or further onboarding.
