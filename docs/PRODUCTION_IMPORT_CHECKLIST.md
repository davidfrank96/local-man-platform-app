# Production Import Checklist

Use this checklist for every Localman production vendor onboarding batch.

Workflow version: `v1.0`

The permanent workflow is intentionally conservative:

```text
Raw workbook
-> source validation
-> normalization
-> governance review
-> coordinate validation
-> duplicate coordinate audit
-> description review
-> import package
-> release gate
-> import
-> post-import verification
-> post-import quality audit
-> quality score
-> import history update
-> sign-off
```

Do not import raw workbooks directly. Do not skip post-import verification.
Do not skip any phase in `docs/PRODUCTION_IMPORT_STANDARD.md`.

## Pre-Import

### Phase 1 - Source Validation

- [ ] Confirm the source workbook path and batch number.
- [ ] Confirm the batch owner and operator.
- [ ] Check duplicate rows.
- [ ] Check duplicate phones.
- [ ] Check duplicate business names.
- [ ] Confirm vendor names use business/vendor names, not contact names, unless a documented fallback is required.
- [ ] Check missing vendor names.
- [ ] Check missing addresses.
- [ ] Confirm every vendor has one valid Nigerian phone number.
- [ ] Confirm every vendor has latitude and longitude.
- [ ] Check malformed phone values.
- [ ] Check missing, malformed, or impossible coordinates.
- [ ] Produce the batch validation report.

### Phase 2 - Data Normalization

- [ ] Normalize phones only according to the production import standard.
- [ ] Normalize governance areas only through documented governance rules.
- [ ] Normalize category fields into `category_1` through `category_6`.
- [ ] Normalize hours formatting without changing source meaning.
- [ ] Normalize or generate slugs deterministically.
- [ ] Confirm vendor names and business names were not rewritten.
- [ ] Confirm featured dishes were not rewritten.
- [ ] Confirm addresses were not rewritten.
- [ ] Confirm coordinates are preserved exactly from the source data.
- [ ] Confirm detailed addresses are preserved.

### Phase 3 - Governance Review

- [ ] Confirm areas are normalized through Localman area governance where possible.
- [ ] Report every unknown area value.
- [ ] Report candidate mapping and confidence for every unknown area.
- [ ] Confirm unknown areas were not silently remapped.
- [ ] Resolve governance additions or manual mapping approvals before import readiness.

### Phase 4 - Coordinate Validation

- [ ] Verify area, address, latitude, and longitude agree for every vendor.
- [ ] Confirm coordinates are inside Abuja/FCT bounds.
- [ ] Confirm coordinates are plausible for the assigned area.
- [ ] Flag coordinates that are unusually far from area center.
- [ ] Flag coordinates that are clearly in another city/state.
- [ ] Flag duplicate placeholder coordinates.
- [ ] Classify each vendor coordinate as PASS / WARNING / FAIL.

### Phase 5 - Duplicate Coordinate Audit

- [ ] Detect duplicate latitude/longitude groups.
- [ ] Group duplicate-coordinate vendors.
- [ ] Extract address evidence for duplicate groups.
- [ ] Classify coordinate candidates as APPROVED / REVIEW / REVISIT.
- [ ] Confirm no coordinate correction is applied automatically.
- [ ] Produce the coordinate review package.

### Phase 6 - Description Review

- [ ] Review vendor descriptions.
- [ ] Review dish descriptions.
- [ ] Keep descriptions short, clear, and customer-focused.
- [ ] Confirm no invented dishes, claims, popularity, history, or marketing language.

### Phase 7 - Import Package

- [ ] Generate the production CSV from the transformed source data.
- [ ] Generate the audit report.
- [ ] Generate the validation report.
- [ ] Generate the excluded vendors report.
- [ ] Confirm all blockers are resolved before import package approval.
- [ ] Confirm all valid categories are preserved in `category_1` through `category_6`.
- [ ] Confirm no vendor loses secondary categories.
- [ ] Confirm featured dishes are preserved in `dish_1`, `dish_2`, and `dish_3`.
- [ ] Confirm images are treated according to the current batch policy.

### Phase 8 - Release Gate

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
- [ ] Confirm areas are governed or explicitly approved.
- [ ] Confirm the final release gate verdict is GREEN / YELLOW / RED.

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

### Phase 9 - Post Import

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

### Phase 10 - Post Import Quality

- [ ] Run production duplicate coordinate audit immediately after import.
- [ ] Create approved coordinate package if approved candidates exist.
- [ ] Create review coordinate package if review candidates exist.
- [ ] Create revisit coordinate package if revisit candidates exist.
- [ ] Confirm no coordinate updates are applied without manual approval and guarded SQL.

### Phase 11 - Quality Score

- [ ] Assign final grade: PASS / WARNING / FAIL.
- [ ] Calculate overall quality percentage.
- [ ] Record warning count.
- [ ] Record fail count.
- [ ] Record manual review count.
- [ ] Record coordinate correction count.

### Phase 12 - Documentation

- [ ] Update `docs/PRODUCTION_IMPORT_HISTORY.md`.
- [ ] Record batch number.
- [ ] Record vendor count.
- [ ] Record warnings.
- [ ] Record manual reviews.
- [ ] Record approved coordinate corrections.
- [ ] Record final release verdict.

## Sign-Off

- [ ] Confirm all 12 onboarding phases completed.
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
