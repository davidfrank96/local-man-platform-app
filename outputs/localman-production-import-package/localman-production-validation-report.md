# Localman Production Validation Report

## 1. Executive Summary

- Source workbook: `Localman_app_vendors2026: !st june-Piliot version.xlsx`
- Output package: `/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/outputs/localman-production-import-package`
- No database import was executed.
- No Supabase data was modified.
- Final verdict: **READY FOR IMPORT**

## 2. Vendor Count

- Total vendors: 16
- Source row 17 was excluded because the workbook contains a contact/person name (`Hannah Agbo`) but no source business/vendor name.

## 3. PASS / WARNING / FAIL Counts

- PASS: 0
- WARNING: 16
- FAIL: 0

## 4. Area Mapping Summary

- Asokoro: 1
- Wuse: 15

## 5. Phone Cleanup Summary

- Rows with phone cleanup warnings: 4
- Valid callable Nigerian phone rows: 16
- Invalid phone rows: 0
- Selected phone numbers are local Nigerian 11-digit values beginning with `0`.

## 6. Coordinate Extraction Summary

- Parseable coordinate rows: 16
- Coordinate failure rows: 0

## 7. Hours Normalization Summary

- Rows with time or hours review warnings: 15
- Times were normalized to `h:mm AM/PM` format where parseable.
- Source row 5 Sunday was marked closed because the source range `08:00 PM - 01:00 PM` is unconfirmable and likely erroneous.
- Source row 13 Tuesday was marked closed because the source range `07:00 AM - 06:00 AM` is unconfirmable and likely erroneous.

## 8. Image Generation Summary

- Images generated: 0
- Batch 1 images are optional and should be uploaded later as real vendor media.
- No placeholder or AI food photos were generated.

## 9. Category Mapping Summary

- breakfast: 13
- budget-friendly: 6
- dinner: 7
- drinks: 5
- grills: 2
- late-night: 3
- lunch: 12
- rice: 4
- swallow: 3
- Total category assignments preserved: 55
- Vendors with multiple categories: 14

## Warning Code Summary

- BUSINESS_NAME_SLUGIFIED_FOR_IMPORT: 15
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_FRIDAY: 2
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_MONDAY: 2
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_SATURDAY: 2
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_SUNDAY: 1
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_THURSDAY: 2
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_TUESDAY: 2
- HOURS_REVIEW_OVERNIGHT_OR_REVERSED_WEDNESDAY: 2
- PHONE_NORMALIZED_LEADING_ZERO: 4
- TIME_NORMALIZED: 15

## Fail Reason Summary

- None

## Import Readiness Verdict

**READY FOR IMPORT**

## Final CSV Correction Pass

- Source row 5 (`Oga Munkaila fast-food/Meishai`): `sunday_open` and `sunday_close` are blank in the final CSV so Sunday imports as closed. Monday-Saturday hours were not changed.
- Source row 13 (`madam Ekaette`): `tuesday_open` and `tuesday_close` are blank in the final CSV so Tuesday imports as closed. Other days were not changed.
- Source row 17 (`Hannah Agbo`): excluded from the final CSV because no public business/vendor name is available in the source workbook.

## Category Preservation

The production CSV preserves up to six source category assignments per vendor using `category_1` through `category_6`. The legacy `category` column has been removed from the production template; the importer still accepts it only for older CSVs when `category_1` is absent.

- Vendors in CSV: 16
- Vendors with multiple categories: 14
- Total preserved category assignments: 55
- Category distribution: breakfast 13, budget-friendly 6, dinner 7, drinks 5, grills 2, late-night 3, lunch 12, rice 4, swallow 3
