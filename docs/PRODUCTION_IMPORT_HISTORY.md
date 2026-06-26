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
