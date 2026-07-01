# Import Pipeline

This document describes the permanent production vendor import workflow and validation rules. This v1.0 workflow replaces ad-hoc onboarding. Every future batch must complete every phase before production import.

## Workflow

Raw production collection data must flow through:

1. Raw XLSX
2. Source validation
3. Data normalization
4. Governance review
5. Coordinate validation
6. Duplicate coordinate audit
7. Description review
8. Production CSV package
9. Release gate
10. Manual review
11. Import
12. Post-import validation
13. Post-import duplicate coordinate audit
14. Quality score and import history update
15. Production baseline and override register update

Do not import raw Jotform-style XLSX files directly. The admin importer expects CSV with Localman template headers.

No production import may skip phases. Review artifacts must be generated before import, including the validation report, audit report, excluded vendors report, coordinate review package, release gate result, quality score, and import history entry.

After a batch is imported and verified, production becomes the operational source of truth for that batch. Original workbooks remain historical source documents. Any approved post-import change must be recorded as an approved production override before future integrity certification may treat it as baseline.

## Production CSV Contract

CSV headers include:

- `vendor_name`
- `slug`
- `category_1` through `category_6`
- `price_band`
- `description`
- `phone`
- `address`
- `area`
- `city`
- `state`
- `country`
- `latitude`
- `longitude`
- `is_active`
- daily open/close columns for Monday through Sunday
- featured dish columns for `dish_1`, `dish_2`, and `dish_3`
- image URL columns

## Field Mapping

Raw XLSX forms can contain business name, contact name, street details, coordinates, and uploaded media in non-template columns. Transform them before import.

Recommended mapping:

- business/vendor name collected in the field -> `vendor_name`
- optional approved slug -> `slug`
- all source categories, in source order -> `category_1` through `category_6`
- high-level district -> `area`
- detailed street/market/plaza/landmark -> `address`
- extracted coordinate values -> `latitude`, `longitude`
- first valid Nigerian phone -> `phone`

## Area Extraction

Use canonical governance areas in `area`.

Examples:

- `Jabi Bitikuwe street by Car wash` -> area `Jabi`, address keeps the full street detail
- `Utako market opposite SAY plaza` -> area `Utako`, address keeps the full market detail

Unknown areas are governance findings and must not be silently remapped. A batch can proceed only when every unknown value has an explicit recommendation: safe mapping to an existing governed area, approved governance addition, warning with manual acceptance, or vendor exclusion.

## Coordinate Extraction

Coordinates are required.

Inputs like this must be transformed:

```text
Longitude: 7.4328425
Latitude: 9.0737793
```

Into:

- `latitude`: `9.0737793`
- `longitude`: `7.4328425`

Missing or malformed coordinates block import.

Coordinates must also be geographically plausible for the assigned area and address. Validation checks must compare `area`, `address`, `latitude`, and `longitude` together, confirm the point is inside Abuja/FCT bounds, and flag duplicate placeholder coordinates.

## Phone Normalization

One valid Nigerian phone number is required.

Accepted examples:

- `08012345678`
- `+2348012345678`
- `2348012345678`

If multiple numbers are provided, the importer selects the first valid Nigerian phone number, warns, and continues.

If no valid phone exists, the row fails.

Source workbooks and generated CSVs should preserve leading-zero Nigerian numbers as text during review. The importer validates those inputs and stores accepted phone values in the app's canonical callable format.

## Slug Rules

If `slug` is supplied, the importer preserves it.

If `slug` is empty, Localman generates one from `vendor_name` and warns.

Supplied slugs must use lowercase words separated by hyphens.

## Image Policy

Missing vendor image URLs are warnings, not blockers.

The import continues and the public app can use placeholder behavior until real vendor media is uploaded later. Batch 1 production onboarding should not use generated or fake vendor photos.

If image metadata is supplied, it must be valid.

## Featured Dish Policy

The CSV importer supports three featured dish slots:

- `dish_1_name`, `dish_1_description`, `dish_1_image_url`
- `dish_2_name`, `dish_2_description`, `dish_2_image_url`
- `dish_3_name`, `dish_3_description`, `dish_3_image_url`

At least one featured dish is required. Production transformation should preserve all three field-collected dishes when available. The operational shorthand `featured_dish_1` through `featured_dish_3` maps to the CSV columns `dish_1_*` through `dish_3_*`.

## Category Mapping

Current categories are:

- `breakfast`
- `lunch`
- `dinner`
- `late-night`
- `rice`
- `swallow`
- `grills`
- `snacks`
- `drinks`
- `budget-friendly`

The production CSV template supports multiple categories per vendor through `category_1` through `category_6`.

When `category_1` is present, the importer uses `category_1` through `category_6` as the source of truth, validates each non-empty category slug, skips duplicate category values, and creates one `vendor_category_map` row for every valid unique category.

The legacy `category` column remains supported for older CSVs only. If `category_1` is absent and `category` exists, the importer treats `category` as the first category.

Invalid category values warn and are skipped. A row fails only when no valid category exists.

Category preservation is a permanent lock. Production transformation must preserve `category_1` through `category_6`; the importer must create one mapping row for every valid unique category and must not collapse multi-category vendors to a single category.

## Time Normalization

The importer accepts common field-collection formats:

- `8:00 AM`
- `08:00 AM`
- `08:30 AM`
- `08:00PM`

Times are normalized internally to stored 24-hour values.

Incomplete day pairs still fail. At least one open day is required.

Blank open and blank close means a closed day. One side missing is a row failure. Suspicious overnight ranges are warnings for manual review unless explicitly approved.

## Duplicate Coordinate Audit

Every batch must include a duplicate coordinate audit before import and a production duplicate-coordinate audit after import.

The audit must:

- group vendors sharing exact latitude and longitude
- extract address evidence for each duplicate group
- classify candidates as approved, review, or revisit
- produce a human-review coordinate package
- avoid automatic coordinate updates

No geocoded coordinate may be applied without human approval. Approved coordinate update scripts must update only latitude and longitude, target vendors by id or slug, and include old-coordinate guards in the `WHERE` clause.

## Description Review

Descriptions and dish descriptions are reviewable text fields. They may be edited for clarity only when the review preserves meaning and does not invent dishes, quality claims, popularity claims, history, or pricing assertions.

## PASS / WARNING / FAIL

PASS:

- required identity, phone, coordinates, category, price, hours, and featured dish data are valid

WARNING:

- missing image
- missing slug
- area normalization or unknown area
- multiple phones with at least one valid phone
- time formatting normalized
- invalid category value when at least one other valid category exists
- duplicate category values

FAIL:

- missing vendor name
- missing phone
- no valid Nigerian phone
- missing coordinates
- invalid coordinates
- no valid category
- invalid price band
- incomplete hours
- no operating day
- missing featured dish

## CSV Safety

Generated CSVs must be importer-safe:

- no embedded newlines in fields
- stable column count on every row
- no duplicate slugs unless resolved before import
- no coordinate loss
- no category loss
- no featured dish loss
- leading-zero phone values preserved as text in review artifacts

Rows with unresolved blockers are excluded into a correction workbook rather than silently corrected.

## Review Before Import

Before import, review:

- row count
- duplicate vendor names/slugs
- unique phones
- unknown areas
- coordinate coverage
- image warnings
- hours coverage
- category mapping
- generated slugs
- duplicate coordinate groups
- excluded vendor package
- quality score

## Post-Import Validation

After import, validate:

- vendor count matches the approved CSV
- `vendor_hours` has one row per imported vendor per weekday
- `vendor_category_map` preserves all valid category assignments
- featured dishes are present through the third slot where supplied
- vendor profiles load by slug
- search finds vendors by name, category, and featured dish
- default Wuse, selected-area, and GPS discovery still work
- map markers match selected vendor cards
- closed days, open-now status, and overnight warnings remain correct
- dashboard database totals and vendor registry pagination remain correct
- post-import duplicate coordinate audit is complete

Record every completed import in `docs/PRODUCTION_IMPORT_HISTORY.md`, including batch number, vendor count, warnings, manual reviews, coordinate corrections, and final quality score. Update `docs/PRODUCTION_DATA_BASELINE.md` and `docs/PRODUCTION_CHANGELOG.md` when approved production corrections become part of the certified baseline.
