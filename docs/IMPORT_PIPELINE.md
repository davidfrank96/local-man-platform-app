# Import Pipeline

This document describes the production vendor import workflow and validation rules.

## Workflow

Raw production collection data should flow through:

1. Raw XLSX
2. Transformation
3. Validation
4. Production CSV
5. Review
6. Import

Do not import raw Jotform-style XLSX files directly. The admin importer expects CSV with Localman template headers.

## Production CSV Contract

CSV headers include:

- `vendor_name`
- `slug`
- `category`
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
- featured dish columns
- image URL columns

## Field Mapping

Raw XLSX forms can contain business name, contact name, street details, coordinates, and uploaded media in non-template columns. Transform them before import.

Recommended mapping:

- business display name -> `vendor_name`
- optional approved slug -> `slug`
- primary category -> `category`
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

## Slug Rules

If `slug` is supplied, the importer preserves it.

If `slug` is empty, Localman generates one from `vendor_name` and warns.

Supplied slugs must use lowercase words separated by hyphens.

## Image Policy

Missing vendor image URLs are warnings, not blockers.

The import continues and the public app can use placeholder behavior until media is uploaded later.

If image metadata is supplied, it must be valid.

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

The CSV intake field currently accepts one primary category. If raw data has multiple labels, choose the best primary category before import.

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

FAIL:

- missing vendor name
- missing phone
- no valid Nigerian phone
- missing coordinates
- invalid coordinates
- invalid category
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
