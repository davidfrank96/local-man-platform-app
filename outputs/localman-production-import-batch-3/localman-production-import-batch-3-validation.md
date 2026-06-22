# Localman Production Import Batch 3 Validation

## Executive Summary

- Vendor count: 23
- PASS: 0
- WARNING: 23
- FAIL: 0
- Slugs unique: PASS
- Import readiness verdict: **READY FOR MANUAL REVIEW**

## CSV Safety

- Header matches importer contract: PASS
- Parsed row count equals source vendor count: PASS
- Every parsed row has 46 columns: PASS
- Embedded workbook newlines were converted to spaces before CSV writing.

## Duplicate Slug Resolution

| Excel Row | Vendor | Original Base Slug | Final Slug | Resolution |
|---:|---|---|---|---|
| 7 | Mama mary | `mama-mary` | `mama-mary` | unchanged first occurrence |
| 14 | Mama mary | `mama-mary` | `mama-mary-2` | numeric suffix |

## Vendor-by-Vendor Results

| Excel Row | Vendor | Status | Issues | Warnings |
|---:|---|---|---|---|
| 2 | Blessing indomie | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 08:00 PM to 8:00 AM - 8:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 08:00 PM to 8:00 AM - 8:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 08:00 PM to 8:00 AM - 8:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 08:00 PM to 8:00 AM - 8:00 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 08:00 PM to 8:00 AM - 8:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 08:00 PM to 8:00 AM - 8:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 3 | mai Awara | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 12:00 PM - 05:00 PM to 12:00 PM - 5:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 12:00 PM - 05:00 PM to 12:00 PM - 5:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 12:00 PM - 05:00 PM to 12:00 PM - 5:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 12:00 PM - 05:00 PM to 12:00 PM - 5:00 PM.; TIME_NORMALIZED: Friday hours normalized from 12:00 PM - 05:00 PM to 12:00 PM - 5:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 12:00 PM - 05:00 PM to 12:00 PM - 5:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 4 | Madam Fish | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 10:00 PM - 08:00 PM to 10:00 PM - 8:00 PM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Monday closes at or before opening time: 10:00 PM - 8:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 10:00 AM - 08:00 PM to 10:00 AM - 8:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 10:00 AM - 08:00 PM to 10:00 AM - 8:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 10:00 AM - 08:00 PM to 10:00 AM - 8:00 PM.; TIME_NORMALIZED: Friday hours normalized from 10:00 AM - 08:00 PM to 10:00 AM - 8:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 10:00 AM - 08:00 PM to 10:00 AM - 8:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 5 | Chi joy Catherine Services | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 05:30 PM to 8:00 AM - 5:30 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 05:30 PM to 8:00 AM - 5:30 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 05:30 PM to 8:00 AM - 5:30 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 05:30 PM to 8:00 AM - 5:30 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 05:30 PM to 8:00 AM - 5:30 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 05:30 PM to 8:00 AM - 5:30 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 6 | Chizzy African food | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 7 | Mama mary | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 06:30 PM to 7:00 AM - 6:30 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 06:00 PM to 7:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 06:30 PM to 7:00 AM - 6:30 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 06:30 PM to 7:00 AM - 6:30 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 06:30 PM to 7:00 AM - 6:30 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 06:30 PM to 7:00 AM - 6:30 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 8 | Alice kitchen | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 06:00 AM - 04:00 PM to 6:00 AM - 4:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:00 AM - 04:00 PM to 6:00 AM - 4:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:00 AM - 04:00 PM to 6:00 AM - 4:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 06:00 AM - 04:00 PM to 6:00 AM - 4:00 PM.; TIME_NORMALIZED: Friday hours normalized from 06:00 AM - 04:00 PM to 6:00 AM - 4:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 06:00 AM - 04:00 PM to 6:00 AM - 4:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 9 | Blessing | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 10 | Mai kilishi | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; TIME_NORMALIZED: Saturday hours normalized from 08:00 AM - 07:30 PM to 8:00 AM - 7:30 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 11 | mama Obaje | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 07:00 PM to 7:00 AM - 7:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 12 | KC faith kitchen | WARNING | - | PHONE_NORMALIZED: Phone value normalized for import while preserving the first valid Nigerian number.; MULTIPLE_PHONES: Multiple valid phone numbers found; using the first valid number.; TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 05:00 PM to 7:00 AM - 5:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 05:00 PM to 7:00 AM - 5:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 05:00 PM to 7:00 AM - 5:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 05:00 PM to 7:00 AM - 5:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 05:00 PM to 7:00 AM - 5:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 05:00 PM to 7:00 AM - 5:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 13 | mummy Dominic | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 09:00 AM - 07:30 PM to 9:00 AM - 7:30 PM.; TIME_NORMALIZED: Tuesday hours normalized from 09:00 AM - 07:30 PM to 9:00 AM - 7:30 PM.; TIME_NORMALIZED: Wednesday hours normalized from 09:00 AM - 07:30 PM to 9:00 AM - 7:30 PM.; TIME_NORMALIZED: Thursday hours normalized from 09:00 AM - 07:30 PM to 9:00 AM - 7:30 PM.; TIME_NORMALIZED: Friday hours normalized from 09:00 AM - 07:30 PM to 9:00 AM - 7:30 PM.; TIME_NORMALIZED: Saturday hours normalized from 09:00 AM - 07:30 PM to 9:00 AM - 7:30 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 14 | Mama mary | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 10:00 AM - 06:00 PM to 10:00 AM - 6:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 10:00 AM - 06:00 PM to 10:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 10:00 AM - 06:00 PM to 10:00 AM - 6:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 10:00 AM - 06:00 PM to 10:00 AM - 6:00 PM.; TIME_NORMALIZED: Friday hours normalized from 10:00 AM - 06:00 PM to 10:00 AM - 6:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 10:00 AM - 06:00 PM to 10:00 AM - 6:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later.; DUPLICATE_SLUG_RESOLVED: Duplicate base slug "mama-mary" resolved to "mama-mary-2". |
| 15 | Afaihat | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 04:00 PM to 7:00 AM - 4:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 04:00 PM to 7:00 AM - 4:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 04:00 PM to 7:00 AM - 4:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 04:00 PM to 7:00 AM - 4:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 04:00 PM to 7:00 AM - 4:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 16 | madam Bole | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 09:00 AM - 04:00 PM to 9:00 AM - 4:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 09:00 AM - 04:00 PM to 9:00 AM - 4:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 09:00 AM - 04:00 PM to 9:00 AM - 4:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 09:00 AM - 04:00 PM to 9:00 AM - 4:00 PM.; TIME_NORMALIZED: Friday hours normalized from 09:00 AM - 04:00 PM to 9:00 AM - 4:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 17 | Mme Doya | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 09:00 AM - 05:00 PM to 9:00 AM - 5:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 09:00 AM - 05:00 PM to 9:00 AM - 5:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 09:00 AM - 05:00 PM to 9:00 AM - 5:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 09:00 AM - 05:00 PM to 9:00 AM - 5:00 PM.; TIME_NORMALIZED: Friday hours normalized from 09:00 AM - 05:00 PM to 9:00 AM - 5:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 18 | UCHE BEST TASTY MEAL | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 03:00 PM - 11:00 PM to 3:00 PM - 11:00 PM.; TIME_NORMALIZED: Monday hours normalized from 07:30 AM - 11:00 PM to 7:30 AM - 11:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:30 AM - 11:00 PM to 7:30 AM - 11:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:30 AM - 11:00 PM to 7:30 AM - 11:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:30 AM - 11:00 PM to 7:30 AM - 11:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:30 AM - 11:08 PM to 7:30 AM - 11:08 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:30 AM - 11:00 PM to 7:30 AM - 11:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 19 | Awashe suya spot | WARNING | - | MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 20 | mme Masa | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 06:00 AM - 12:00 PM to 6:00 AM - 12:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:00 AM - 06:00 PM to 6:00 AM - 6:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:00 AM - 12:00 PM to 6:00 AM - 12:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 06:00 AM - 12:00 PM to 6:00 AM - 12:00 PM.; TIME_NORMALIZED: Friday hours normalized from 06:00 AM - 12:00 PM to 6:00 AM - 12:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 06:00 AM - 12:00 PM to 6:00 AM - 12:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 21 | NIKIS SPECIAL | WARNING | - | PHONE_NORMALIZED: Phone value normalized for import while preserving the first valid Nigerian number.; MULTIPLE_PHONES: Multiple valid phone numbers found; using the first valid number.; TIME_NORMALIZED: Sunday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; TIME_NORMALIZED: Monday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; TIME_NORMALIZED: Friday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:30 AM - 10:30 PM to 7:30 AM - 10:30 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 22 | Mme kunu | WARNING | - | PHONE_NORMALIZED: Phone value normalized for import while preserving the first valid Nigerian number.; MULTIPLE_PHONES: Multiple valid phone numbers found; using the first valid number.; TIME_NORMALIZED: Monday hours normalized from 07:00 AM - 09:00 PM to 7:00 AM - 9:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 07:00 AM - 09:00 PM to 7:00 AM - 9:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 07:00 AM - 09:00 PM to 7:00 AM - 9:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 07:00 AM - 09:00 PM to 7:00 AM - 9:00 PM.; TIME_NORMALIZED: Friday hours normalized from 07:00 AM - 09:00 PM to 7:00 AM - 9:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 07:00 AM - 09:00 PM to 7:00 AM - 9:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 23 | Esther | WARNING | - | TIME_NORMALIZED: Sunday hours normalized from 06:30 AM - 12:00 PM to 6:30 AM - 12:00 PM.; TIME_NORMALIZED: Monday hours normalized from 06:30 AM - 12:00 PM to 6:30 AM - 12:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 06:30 AM - 12:00 PM to 6:30 AM - 12:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 06:30 AM - 12:00 AM to 6:30 AM - 12:00 AM.; HOURS_REVIEW_OVERNIGHT_OR_REVERSED: Wednesday closes at or before opening time: 6:30 AM - 12:00 AM.; TIME_NORMALIZED: Thursday hours normalized from 06:30 AM - 12:00 PM to 6:30 AM - 12:00 PM.; TIME_NORMALIZED: Friday hours normalized from 06:30 AM - 12:00 PM to 6:30 AM - 12:00 PM.; TIME_NORMALIZED: Saturday hours normalized from 06:30 AM - 12:00 PM to 6:30 AM - 12:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |
| 24 | Mama Daniel | WARNING | - | TIME_NORMALIZED: Monday hours normalized from 08:00 AM - 02:00 PM to 8:00 AM - 2:00 PM.; TIME_NORMALIZED: Tuesday hours normalized from 08:00 AM - 02:00 PM to 8:00 AM - 2:00 PM.; TIME_NORMALIZED: Wednesday hours normalized from 08:00 AM - 02:00 PM to 8:00 AM - 2:00 PM.; TIME_NORMALIZED: Thursday hours normalized from 08:00 AM - 02:00 PM to 8:00 AM - 2:00 PM.; TIME_NORMALIZED: Friday hours normalized from 08:00 AM - 02:00 PM to 8:00 AM - 2:00 PM.; MISSING_IMAGE: No vendor image provided; import can continue and media can be uploaded later. |

## Phone Validation Summary

- Valid selected phones: 23
- Invalid phones: 0
- Phone normalization warnings: 3
- Multiple phone warnings: 3

## Coordinate Validation Summary

- Rows with parseable coordinates: 23
- Coordinate failures: 0

## Hours Validation Summary

- Rows with at least one operating day: 23
- Hours failures: 0
- Overnight/reversed review warnings: 2

## Category Preservation Summary

- Source rows with more than six valid categories: 0
- Total category mappings represented in CSV: 69
- Category overflow blockers: 0

## Area Normalization Summary

- Known/normalized areas: 23
- Unknown area warnings: 0
- Area normalization warnings: 0

## Data Preservation Summary

- Coordinate preservation exceptions: 0
- Category preservation exceptions: 0
- Featured dish preservation exceptions: 0
- Address preservation: PASS, source text preserved with newlines collapsed for CSV safety.

## Final Verdict

**READY FOR MANUAL REVIEW**
