# Import Pipeline

This document describes the production vendor import workflow and validation rules.

## Workflow

Raw production collection data should flow through:

1. Raw XLSX
2. Transformation
3. Validation
4. Audit report
5. Production CSV
6. Manual review
7. Import
8. Post-import validation

Do not import raw Jotform-style XLSX files directly. The admin importer expects CSV with Localman template headers.

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

Unknown areas warn but do not block CSV import.

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

## Time Normalization

The importer accepts common field-collection formats:

- `8:00 AM`
- `08:00 AM`
- `08:30 AM`
- `08:00PM`

Times are normalized internally to stored 24-hour values.

Incomplete day pairs still fail. At least one open day is required.

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
