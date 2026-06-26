# Production Import Standard

This document defines the permanent onboarding standard for all Localman production vendor imports.

Version: `v1.0`

This replaces all previous ad-hoc onboarding. Do not import raw field-collection workbooks directly. Every batch must complete every phase below before production import. No production import may skip a phase.

## Permanent Rules

Never:

- Silently remap governance areas
- Silently update coordinates
- Silently overwrite phone values
- Silently overwrite vendor or business names
- Invent coordinates, hours, dishes, images, descriptions, or vendor identity
- Collapse secondary categories or discard the third featured dish

Always:

- Preserve the unchanged source workbook
- Produce review packages before production writes
- Resolve every FAIL before import
- Manually approve WARNING and REVIEW rows before import
- Record the batch in `docs/PRODUCTION_IMPORT_HISTORY.md`

## Required Batch Deliverables

Every vendor batch must produce:

1. Production CSV
2. Validation report
3. Audit report
4. Excluded vendors report
5. Coordinate review package
6. Release gate report
7. Quality score
8. Import history update

## Permanent Workflow v1.0

### Phase 1 - Source Validation

Validate workbook integrity before any transformation.

Check:

- Duplicate rows
- Duplicate phones
- Duplicate business names
- Missing vendor names
- Missing addresses
- Missing coordinates
- Malformed coordinates
- Malformed phones

Output:

- Batch validation report

### Phase 2 - Data Normalization

Normalize only:

- Phones
- Governance areas
- Category fields
- Hours formatting
- Slugs

Never modify these source fields unless explicitly approved and documented:

- Vendor names
- Business names
- Featured dishes
- Addresses
- Coordinates

### Phase 3 - Governance Review

Check every source area against Localman area governance.

If the area is unknown:

- Do not silently remap it
- Report the candidate mapping
- Report mapping confidence
- Require manual approval or governance addition before import readiness

### Phase 4 - Coordinate Validation

For every vendor, verify that area, address, and coordinates agree.

Check:

- Coordinates are inside Abuja/FCT bounds
- Coordinates are plausible for the assigned area
- Coordinates are not duplicate placeholder coordinates
- Coordinates are not clearly in another city/state

Classify each row:

- `PASS`
- `WARNING`
- `FAIL`

### Phase 5 - Duplicate Coordinate Audit

This phase is mandatory before every import.

Detect vendors sharing identical coordinates, group them, and classify the groups:

- `APPROVED`
- `REVIEW`
- `REVISIT`

Never update coordinates automatically. Coordinate corrections require a separate review package and approval trail.

### Phase 6 - Description Review

Review vendor descriptions and dish descriptions.

Rules:

- Keep descriptions short
- Keep descriptions clear
- Keep descriptions customer-focused
- Do not invent marketing language
- Do not invent dishes, quality claims, popularity claims, or history

### Phase 7 - Import Package

Generate the production import package only after all blockers are resolved.

Required outputs:

- CSV
- Audit report
- Validation report

### Phase 8 - Release Gate

Before import, verify:

- Phones
- Coordinates
- Hours
- Categories
- Slugs
- Areas
- Featured dishes
- CSV safety

### Phase 9 - Post Import

After import, verify:

- Vendor count
- Category count
- Hours
- Search
- Map
- Clusters
- Dashboard

### Phase 10 - Post Import Quality

Immediately run a duplicate coordinate audit on production after import.

If duplicate coordinate groups exist, create:

- Approved package
- Review package
- Revisit package

### Phase 11 - Quality Score

Every batch receives a quality score.

Required scoring output:

- Final grade: `PASS`, `WARNING`, or `FAIL`
- Overall quality percentage
- Warning count
- Fail count
- Manual review count

Example:

```text
Final grade: PASS
Overall quality: 98%
```

### Phase 12 - Documentation

Update `docs/PRODUCTION_IMPORT_HISTORY.md` before the batch is considered complete.

Record:

- Batch number
- Vendor count
- Warnings
- Manual reviews
- Approved coordinate corrections
- Release verdict

## Legacy Workflow Reference

1. Raw workbook
2. Transformation into the Localman CSV contract
3. Validation
4. Audit report generation
5. Manual review
6. Release gate
7. Import
8. Post-import validation
9. Post-import quality audit
10. Import history update

The 12-phase workflow above is authoritative. This condensed list is only a quick reference.

## Vendor Name Rules

Vendor identity must prioritize the public business identity, not the collector contact name.

Priority:

1. Business/vendor name
2. Slug/business identifier
3. Contact/vendor name as fallback only

If the contact/vendor name fallback is used, the row should continue with a warning:

```text
CONTACT_NAME_USED_AS_VENDOR_NAME
```

This warning does not block import. It flags the row for manual review because public Localman vendor names should normally be business names.

## Phone Rules

One valid Nigerian phone number is required.

Source and CSV review requirements:

- Treat phone values as text/string during transformation
- Preserve leading zero in source-derived CSV values
- Use 11 digits for local Nigerian mobile numbers
- Use a Nigerian mobile format

Examples:

- `07032512357`
- `08029018585`
- `08167476078`
- `09077805114`

Multiple phones:

- Select the first valid Nigerian phone number
- Continue import
- Record a warning

No valid phone:

- FAIL

Importer behavior:

- Accepted Nigerian phone inputs may be normalized for storage into the app's canonical callable format.
- Do not treat canonical storage normalization as source data loss as long as the value remains callable and traceable to the reviewed CSV value.

## Coordinate Rules

Coordinates are required for production vendor discovery.

Required fields:

- `latitude`
- `longitude`

Rules:

- Preserve coordinates exactly from the source
- Do not geocode during source transformation
- Do not modify during source transformation
- Do not round
- Do not infer coordinates from address or area

Coordinate candidate generation is allowed only inside the duplicate-coordinate or correction-review package. Candidate coordinates are never production data until manually approved and applied through a separate guarded update.

Missing or malformed coordinates:

- FAIL

## Area Rules

The `area` field should contain the canonical high-level Abuja area. The detailed street, market, landmark, or zone text belongs in `address`.

Examples:

- `Jabi market text` -> `area: Jabi`
- `Utako market text` -> `area: Utako`
- `Wuse Zone 4, Constantine Street` -> `area: Wuse`, detailed text stays in `address`

Unknown area:

- WARNING
- Not FAIL

Area warnings should not block import because discovery uses coordinates and radius. Area values still matter for governance, reporting, filtering context, and user-facing labels.

Unknown or ambiguous area mappings must be reported during Phase 3. Do not silently map an unknown workbook value to an existing governance area.

## Category Rules

Production CSVs must use the multi-category format:

- `category_1`
- `category_2`
- `category_3`
- `category_4`
- `category_5`
- `category_6`

Rules:

- Preserve all valid source categories
- Do not collapse multiple categories into one
- Do not discard secondary categories
- Do not duplicate category mappings
- Normalize category values to Localman category slugs

No valid category:

- FAIL

Invalid category when at least one valid category remains:

- WARNING

## Featured Dish Rules

Production imports support three featured dishes:

- `dish_1_name`
- `dish_2_name`
- `dish_3_name`

Rules:

- Preserve original food names
- Do not discard the third dish
- Do not rewrite local dish names into generic English labels
- Do not invent featured dishes

At least one featured dish is required.

Missing all featured dishes:

- FAIL

## Hours Rules

Accepted source formats include:

- `8:00 AM`
- `08:00 AM`
- `8:00AM`
- `08:00AM`

The importer may normalize internally, but the source meaning must be preserved.

Closed-day rule:

- Blank open time + blank close time = closed day

Incomplete day rule:

- Open time present + close time missing = FAIL
- Open time missing + close time present = FAIL

Suspicious overnight or reversed ranges:

- WARNING
- Manual review required

Examples requiring review:

- `8:00 PM - 1:00 PM`
- `7:00 AM - 6:00 AM`

Do not guess corrected hours. If a suspicious range cannot be confirmed, mark that day closed rather than inventing a schedule.

## Image Rules

Images are optional for onboarding.

Missing image:

- WARNING
- Not FAIL

Rules:

- Real vendor media is preferred
- Do not generate fake vendor images
- Do not create fake vendor branding
- Do not block Batch 1-style imports because images are missing

## PASS / WARNING / FAIL Criteria

PASS:

- Business/vendor identity is valid
- Phone is valid
- Coordinates are present and parseable
- At least one valid category exists
- Hours are complete and importable
- At least one featured dish exists
- No manual-review warning is present

WARNING:

- Contact name used as vendor name fallback
- Multiple phones with at least one valid phone
- Area normalization
- Unknown area
- Missing image
- Missing slug when slug can be generated
- Time normalization
- Suspicious overnight or reversed hours
- Invalid category when at least one valid category remains
- Duplicate category values

FAIL:

- Missing vendor name after fallback rules
- Missing phone
- No valid Nigerian phone
- Missing coordinates
- Invalid coordinates
- No valid category
- Incomplete hours pair
- No operating day
- Missing all featured dishes

## Future Batch Pre-Import Checklist

Before importing a production batch:

- Confirm the raw workbook is archived unchanged.
- Complete Phase 1 source validation.
- Transform the workbook into the approved Localman CSV format.
- Complete Phase 3 governance review.
- Complete Phase 4 coordinate validation.
- Complete Phase 5 duplicate coordinate audit.
- Complete Phase 6 description review.
- Verify `vendor_name` follows the identity priority rules.
- Verify all phone values are stored as text and preserve leading zero.
- Verify importer storage normalization remains callable.
- Verify every retained vendor has latitude and longitude.
- Verify coordinates were not rounded, geocoded, or modified.
- Verify `area` uses canonical high-level areas where possible.
- Verify detailed location text remains in `address`.
- Verify categories are stored in `category_1` through `category_6`.
- Verify all valid source categories are preserved.
- Verify featured dishes 1-3 are preserved when available.
- Verify blank open/close pairs represent closed days.
- Review suspicious overnight or reversed hours.
- Verify missing images are warnings, not blockers.
- Generate and review the validation report.
- Generate and review the audit report.
- Generate and review the excluded vendors report.
- Generate and review the coordinate review package.
- Resolve every FAIL row before import.
- Manually approve WARNING rows before import.
- Run the release gate.

## Future Batch Post-Import Smoke Test

After importing a production batch:

- Confirm imported vendor count matches the approved CSV.
- Confirm vendor slugs are unique and route correctly.
- Confirm vendor cards render names, area labels, categories, dishes, hours, phone actions, and directions.
- Confirm discovery returns imported vendors under GPS, selected area, and default Wuse modes as appropriate.
- Confirm search operates against the active discovery dataset.
- Confirm category filters include vendors with secondary categories.
- Confirm map markers match vendor cards.
- Confirm vendor profiles open for imported vendors.
- Confirm missing images do not break cards or profiles.
- Confirm closed days display as closed and do not create phantom hours.
- Confirm admin vendor list and edit screens load imported vendors.
- Confirm Rider Connect, ratings, and public discovery remain functional.
- Run the post-import duplicate coordinate audit.
- Create approved/review/revisit coordinate packages if duplicate groups remain.
- Assign the final batch quality score.
- Update `docs/PRODUCTION_IMPORT_HISTORY.md`.

## Import Standards Summary

Future Localman onboarding batches should optimize for preserving real field data while preventing avoidable production blockers. The import standard is:

- Keep real business identity public.
- Preserve phone, coordinate, address, category, dish, and hours meaning.
- Warn on data-quality risks that can be reviewed after transformation.
- Fail only when the vendor cannot safely function in Localman.
- Never import raw workbooks directly.
- Never silently discard secondary categories or the third featured dish.
- Never invent coordinates, hours, dishes, images, or vendor identities.
