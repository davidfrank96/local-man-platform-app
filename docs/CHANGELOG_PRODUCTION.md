# Historical Production Changelog

This file is retained for historical notes from earlier stabilization work.

The current approved production override register is `docs/PRODUCTION_CHANGELOG.md`. Future production-data certification, baseline, and override decisions must use that file instead of this historical changelog.

## Category Preservation Fix

Root cause:

- The onboarding path could collapse category data to a single category field, losing secondary categories even though the database supports many-to-many category mappings through `vendor_category_map`.

Fix:

- Production CSV format uses `category_1` through `category_6`.
- The importer creates one mapping per valid unique category.
- Legacy `category` remains supported only when `category_1` is absent.

Impact:

- Vendors can belong to multiple categories such as Rice, Swallow, Drinks, and Snacks without data loss.

## Day-Of-Week Mapping Fix

Root cause:

- Importer mapping treated Monday as `0`, while the platform uses `0 = Sunday`.

Fix:

- Intake mapping was standardized to the platform convention:
  - `0 = Sunday`
  - `1 = Monday`
  - `2 = Tuesday`
  - `3 = Wednesday`
  - `4 = Thursday`
  - `5 = Friday`
  - `6 = Saturday`

Impact:

- Vendor profile hours, open-now status, open-first ranking, search ranking, and closed-day behavior align with the imported schedule.

## CSV Corruption Fix

Root cause:

- Generated CSV rows with commas, descriptions, or ingredient-like text could shift columns when output was not safely escaped.

Fix:

- Production CSV generation must use proper CSV escaping and stable physical row structure.
- Validation checks compare generated headers and parsed column counts before import.

Impact:

- Descriptions, categories, featured dishes, coordinates, and price bands remain in the correct columns.

## Import Hardening

Root cause:

- Field collection includes real-world variations: padded time values, multiple phones, missing images, missing slugs, and three featured dishes.

Fix:

- Time normalization accepts common AM/PM formats.
- Missing images warn instead of blocking import.
- Multiple phones select the first valid Nigerian phone and warn.
- Supplied slugs are preserved; missing slugs are generated.
- Three featured dish slots are supported.

Impact:

- Production imports avoid unnecessary friction while still blocking unusable vendor rows.

## Map Camera Sync Fix

Root cause:

- Selected vendor camera movement could compete with bounds fitting or use fragile selection paths.

Fix:

- Vendor selection is synchronized by vendor id.
- Map camera and marker coordinates use `[longitude, latitude]`.
- Selected-vendor camera movement takes priority after card or marker selection.

Impact:

- Selecting a vendor card or marker should keep the selected card, selected marker, and camera target aligned.

## Map Marker Interception Fix

Root cause:

- Dense marker areas could allow one marker hitbox to intercept taps intended for another marker, especially on mobile and fallback map rendering.

Fix:

- Marker hit handling and selected-marker layering were tightened so selected and dense markers remain tappable.

Impact:

- Mobile map selection is more predictable in dense vendor areas.

## Production Batch Onboarding

Batch 1:

- 16 vendors
- 55 category mappings
- Wuse and Asokoro
- images intentionally omitted

Batch 2:

- 17 vendors
- 66 category mappings
- Wuse
- imported after blocker handling and validation

Batch 3:

- 23 vendors
- 69 category mappings
- Jabi and Utako
- duplicate slug and phone integrity reviews completed before import
