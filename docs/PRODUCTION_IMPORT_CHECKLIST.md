# Production Import Checklist

Use this checklist for every Localman production vendor onboarding batch.

The workflow is intentionally conservative:

```text
Raw workbook
-> transformation
-> validation
-> manual review
-> import
-> post-import verification
-> sign-off
```

Do not import raw workbooks directly. Do not skip post-import verification.

## Pre-Import

### Source Data

- [ ] Confirm the source workbook path and batch number.
- [ ] Confirm the batch owner and operator.
- [ ] Confirm vendor names use business/vendor names, not contact names, unless a documented fallback is required.
- [ ] Confirm every vendor has one valid Nigerian phone number.
- [ ] Confirm every vendor has latitude and longitude.
- [ ] Confirm coordinates are preserved exactly from the source data.
- [ ] Confirm detailed addresses are preserved.
- [ ] Confirm areas are normalized through Localman area governance where possible.
- [ ] Confirm unknown areas are warnings, not blockers, unless coordinates are missing or invalid.
- [ ] Confirm all valid categories are preserved in `category_1` through `category_6`.
- [ ] Confirm no vendor loses secondary categories.
- [ ] Confirm featured dishes are preserved in `dish_1`, `dish_2`, and `dish_3`.
- [ ] Confirm images are treated according to the current batch policy.

### Validation

- [ ] Generate the production CSV from the transformed source data.
- [ ] Verify the CSV header matches the importer contract.
- [ ] Verify the CSV has one physical row per vendor.
- [ ] Verify embedded newlines in CSV fields have been flattened or the importer can safely parse them.
- [ ] Run import validation and confirm PASS / WARNING / FAIL counts.
- [ ] Resolve all FAIL rows.
- [ ] Review all warnings and decide whether they are acceptable for the batch.
- [ ] Confirm no invalid phones remain.
- [ ] Confirm no invalid or missing coordinates remain.
- [ ] Confirm no rows are missing all categories.
- [ ] Confirm no rows are missing all featured dishes unless the batch policy explicitly allows it.
- [ ] Confirm hours are valid, including closed days and overnight ranges.
- [ ] Confirm supplied slugs are preserved and generated slugs are valid.

### Reset And Readiness

- [ ] Confirm marketplace reset status for the target environment.
- [ ] Confirm retained infrastructure tables are intact.
- [ ] Confirm admin access is available.
- [ ] Confirm storage cleanup scope is understood if images are included.
- [ ] Confirm no production import is started until the final CSV has been manually reviewed.

## Import

- [ ] Confirm the target environment before import.
- [ ] Confirm the exact production CSV path.
- [ ] Confirm the operator has permission to run the import.
- [ ] Confirm no unrelated marketplace data operation is running.
- [ ] Import the reviewed production CSV only.
- [ ] Capture import start time.
- [ ] Capture import completion time.
- [ ] Capture import result summary.
- [ ] Record any import warnings.
- [ ] Stop immediately if unexpected FAIL rows or write errors occur.

## Post-Import

### Count Checks

- [ ] Verify `vendors` count.
- [ ] Verify `vendor_hours` count.
- [ ] Verify `vendor_category_map` count.
- [ ] Verify `vendor_featured_dishes` count.
- [ ] Verify `vendor_images` count if images are included.
- [ ] Verify retained infrastructure tables still exist.

### Integrity Checks

- [ ] Check for duplicate vendor slugs.
- [ ] Check for duplicate category mappings.
- [ ] Check for orphaned `vendor_hours`.
- [ ] Check for orphaned `vendor_category_map` records.
- [ ] Check for orphaned `vendor_featured_dishes`.
- [ ] Check for orphaned `vendor_images`.
- [ ] Check for vendors without hours.
- [ ] Check for vendors without categories.
- [ ] Check for vendors without featured dishes.
- [ ] Check for invalid coordinates.
- [ ] Check for invalid phone shapes.

### Public App Verification

- [ ] Verify default Wuse discovery.
- [ ] Verify selected-area discovery for every area represented in the batch.
- [ ] Verify GPS-like discovery near the imported vendor cluster.
- [ ] Verify category filters for the main categories in the batch.
- [ ] Verify search by vendor name.
- [ ] Verify search by category or food term.
- [ ] Verify search by featured dish.
- [ ] Verify open/closed labels.
- [ ] Verify closed days display correctly.
- [ ] Verify overnight hours display correctly.
- [ ] Verify vendor cards render names, areas, categories, featured dish, distance, hours, and actions.
- [ ] Verify vendor profiles load for every imported slug.

### Admin Verification

- [ ] Verify vendor management page renders.
- [ ] Verify CSV intake page renders.
- [ ] Verify analytics page renders.
- [ ] Verify rider management page renders.
- [ ] Verify no runtime errors appear in admin routes.

## Sign-Off

- [ ] Add the batch record to `docs/PRODUCTION_IMPORT_HISTORY.md`.
- [ ] Record final counts.
- [ ] Record accepted warnings.
- [ ] Record unresolved follow-up items.
- [ ] Assign a final verdict: GREEN / YELLOW / RED.
- [ ] Confirm business owner sign-off.
- [ ] Confirm technical owner sign-off.
- [ ] Confirm launch or monitoring next step.

## Sign-Off Template

```md
Batch:
Date:
Operator:
Business owner:
Technical owner:

Final counts:
- Vendors:
- Vendor hours:
- Category mappings:
- Featured dishes:
- Images:

Accepted warnings:
- 

Follow-up items:
- 

Verdict: GREEN / YELLOW / RED
Signed off by:
```

