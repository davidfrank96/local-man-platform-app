# Localman Production Import Batch 2 Validation

## Executive Summary

- Vendor count: 19
- PASS: 0
- WARNING: 15
- FAIL: 4
- Import readiness verdict: **NOT READY FOR IMPORT**

## CSV Safety

- Header matches importer contract: PASS
- Parsed row count equals source vendor count: PASS
- Every parsed row has 46 columns: PASS
- Embedded workbook newlines were converted to spaces before CSV writing.

## Vendor-by-Vendor Results

| Excel Row | Vendor | Status | Issues | Warnings |
|---:|---|---|---|---|
| 2 | Salisu Suya and grill Spot | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Sunday closes at or before opening time: 9:00 AM - 1:00 AM.; TIME_NORMALIZED: Monday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Monday closes at or before opening time: 9:00 AM - 1:00 AM.; TIME_NORMALIZED: Tuesday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Tuesday closes at or before opening time: 9:00 AM - 1:00 AM.; TIME_NORMALIZED: Wednesday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Wednesday closes at or before opening time: 9:00 AM - 1:00 AM.; TIME_NORMALIZED: Thursday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Thursday closes at or before opening time: 9:00 AM - 1:00 AM.; TIME_NORMALIZED: Friday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Friday closes at or before opening time: 9:00 AM - 1:00 AM.; TIME_NORMALIZED: Saturday hours normalized from 09:00 AM - 01:00 AM to 9:00 AM - 1:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Saturday closes at or before opening time: 9:00 AM - 1:00 AM. |
| 3 | CorrectChow | FAIL | CATEGORY_SLOT_OVERFLOW: 1 valid category value(s) exceed the six-slot CSV contract: snacks. | HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Sunday closes at or before opening time: 12:00 PM - 12:00 AM.; TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 12:00 AM to 8:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Monday closes at or before opening time: 8:00 AM - 12:00 AM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 12:00 AM to 8:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Tuesday closes at or before opening time: 8:00 AM - 12:00 AM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 12:00 AM to 8:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Wednesday closes at or before opening time: 8:00 AM - 12:00 AM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 12:00 AM to 8:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Thursday closes at or before opening time: 8:00 AM - 12:00 AM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 12:00 AM to 8:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Friday closes at or before opening time: 8:00 AM - 12:00 AM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 12:00 AM to 8:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Saturday closes at or before opening time: 8:00 AM - 12:00 AM. |
| 4 | Oliver's Burger | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 01:00 PM - 12:00 AM to 1:00 PM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Sunday closes at or before opening time: 1:00 PM - 12:00 AM.; TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 12:00 AM to 7:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Monday closes at or before opening time: 7:00 AM - 12:00 AM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 12:00 AM to 7:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Tuesday closes at or before opening time: 7:00 AM - 12:00 AM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 12:00 AM to 7:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Wednesday closes at or before opening time: 7:00 AM - 12:00 AM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 12:00 AM to 7:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Thursday closes at or before opening time: 7:00 AM - 12:00 AM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 12:00 AM to 7:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Friday closes at or before opening time: 7:00 AM - 12:00 AM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 12:00 AM to 7:00 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Saturday closes at or before opening time: 7:00 AM - 12:00 AM. |
| 5 | Bianns Cuisine | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 08:00 PM to 7:00 AM - 8:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 08:00 PM to 7:00 AM - 8:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 08:00 PM to 7:00 AM - 8:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 08:00 PM to 7:00 AM - 8:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 08:00 PM to 7:00 AM - 8:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 08:00 PM to 7:00 AM - 8:00 PM. |
| 6 | special Abacha | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 12:30 PM - 06:00 PM to 12:30 PM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 12:30 PM - 06:00 PM to 12:30 PM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 12:30 PM - 06:00 PM to 12:30 PM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 12:30 PM - 06:00 PM to 12:30 PM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 12:30 PM - 06:00 PM to 12:30 PM - 6:00 PM. |
| 7 | Ozis Snacks, drinks and fast-food | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM. |
| 8 | Mama princess | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM.; TIME_NORMALIZED: Monday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:30 AM - 09:00 PM to 7:30 AM - 9:00 PM. |
| 9 | Nature's delight Natural drink | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 08:30 AM - 06:00 PM to 8:30 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:30 AM - 06:00 PM to 8:30 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:30 AM - 06:00 PM to 8:30 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:30 AM - 06:00 PM to 8:30 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 08:30 AM - 06:00 PM to 8:30 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:30 AM - 06:00 PM to 8:30 AM - 6:00 PM. |
| 10 | mama blessing | FAIL | DUPLICATE_SLUG_IN_BATCH: Generated slug "mama-blessing" appears in source rows 10, 20. Resolve before import. | TIME_NORMALIZED: Monday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM. |
| 11 | Native Hut | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 07:00 PM to 8:00 AM - 7:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 07:00 PM to 8:00 AM - 7:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 07:00 PM to 8:00 AM - 7:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 07:00 PM to 8:00 AM - 7:00 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 07:00 PM to 8:00 AM - 7:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 07:00 PM to 8:00 AM - 7:00 PM. |
| 12 | Idoma Kitchen | FAIL | REQUIRED_HOURS: At least one operating day is required. | - |
| 13 | madam yam | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 06:00 PM to 8:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 06:00 PM to 8:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 06:00 PM to 8:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 06:00 PM to 8:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 06:00 PM to 8:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 06:00 PM to 8:00 AM - 6:00 PM. |
| 14 | quasi quasi | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 03:00 PM to 7:00 AM - 3:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 03:00 PM to 7:00 AM - 3:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 03:00 PM to 7:00 AM - 3:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 03:00 PM to 7:00 AM - 3:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 03:00 PM to 7:00 AM - 3:00 PM. |
| 15 | Laraba | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 06:00 AM - 09:00 PM to 6:00 AM - 9:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:00 AM - 09:00 PM to 6:00 AM - 9:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:00 AM - 09:00 PM to 6:00 AM - 9:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 06:00 AM - 09:00 PM to 6:00 AM - 9:00 PM.; TIME_NORMALIZED: Friday hours normalized from 06:00 AM - 09:00 PM to 6:00 AM - 9:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 06:00 AM - 09:00 PM to 6:00 AM - 9:00 PM. |
| 16 | Mama food | WARNING | - | PHONE_NORMALIZED: Phone value normalized for import while preserving the first valid Nigerian number.; MULTIPLE_PHONES: Multiple valid phone numbers found; using the first valid number.; TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 PM - 06:00 PM to 7:00 PM - 6:00 PM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Saturday closes at or before opening time: 7:00 PM - 6:00 PM. |
| 17 | Christy | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 06:30 AM - 05:30 PM to 6:30 AM - 5:30 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:30 AM - 05:30 PM to 6:30 AM - 5:30 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:30 AM - 05:30 PM to 6:30 AM - 5:30 PM.; TIME_NORMALIZED: Thursday hours normalized from 06:30 AM - 05:30 PM to 6:30 AM - 5:30 PM.; TIME_NORMALIZED: Friday hours normalized from 06:30 AM - 05:30 PM to 6:30 AM - 5:30 PM. |
| 18 | Blessed Kitchen | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 10:00 AM - 07:00 PM to 10:00 AM - 7:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 10:00 AM - 07:00 PM to 10:00 AM - 7:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 10:00 AM - 07:00 PM to 10:00 AM - 7:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 10:00 AM - 07:00 PM to 10:00 AM - 7:00 PM.; TIME_NORMALIZED: Friday hours normalized from 10:00 AM - 07:00 PM to 10:00 AM - 7:00 PM. |
| 19 | Ahjiah | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 09:00 PM to 8:00 AM - 9:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 20 | mama blessing | FAIL | DUPLICATE_SLUG_IN_BATCH: Generated slug "mama-blessing" appears in source rows 10, 20. Resolve before import. | PHONE_NORMALIZED: Phone value normalized for import while preserving the first valid Nigerian number.; TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |

## Phone Validation Summary

- Valid selected phones: 19
- Invalid phones: 0
- Phone normalization warnings: 2
- Multiple phone warnings: 1

## Coordinate Validation Summary

- Rows with parseable coordinates: 19
- Coordinate failures: 0

## Hours Validation Summary

- Rows with at least one operating day: 18
- Hours failures: 1
- Overnight/reversed review warnings: 22

## Category Preservation Summary

- Source rows with more than six valid categories: 1
- Total category mappings represented in CSV: 71
- Category overflow blockers: 1
- Row 3 `CorrectChow` has overflow categories not representable in current six-slot contract: snacks

## Area Normalization Summary

- Known/normalized areas: 19
- Unknown area warnings: 0
- Area normalization warnings: 0

## Final Verdict

**NOT READY FOR IMPORT**

Blocking rows must be corrected or excluded before import.
