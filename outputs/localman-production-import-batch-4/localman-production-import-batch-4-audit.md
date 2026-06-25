# Localman Production Import Batch 4 Audit

Source workbook: `/Users/frankenstein/Desktop/Data collection and entry for LOCALMANAPP/5th - 16th June/Localman_app_second_acc2026-06-24_07_24_53.xlsx`

No import was run. No database or production data was modified. No governance code was changed.

## Executive Summary

- Source workbook vendor rows: **100**.
- Rows included in generated CSV: **81**.
- Rows excluded before CSV generation: **19**.
- CSV generated: **YES**.
- Final verdict: **READY FOR MANUAL REVIEW**.

This package resolves the previous blockers by applying explicit area mappings where evidence supports them, excluding rows that still require governance addition or coordinate verification, and applying deterministic slug uniqueness without changing vendor names.

## Governance Resolution

| Original Area | Applied Result | Decision | Evidence | Rows |
|---|---|---|---|---|
| Area 1 | Garki | `REVIEWED_CONTEXT_MAPPING` | Area 1 rows cluster 1.5-2.2 km from configured Garki center and source text includes Garki/Gariki/Area 1 district context; applied explicitly, not silently. | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 |
| Gaduwa | Gudu | `REVIEWED_CONTEXT_MAPPING` | Both Gaduwa rows include Gudu in the submitted address context; mapped to governed Gudu for this import package with warning. | 18, 19 |
| Gariki | Garki | `APPROVED_ALIAS` | User-approved alias application; source text and coordinates support Garki. | 30, 31, 32, 33, 34, 35 |
| Karimo | Excluded | `Governance addition required` | 17 vendors use Karimo; no current governed area preserves this locality without loss. | 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52 |
| Life camp | Life Camp | `EXISTING_GOVERNANCE` | Existing governance canonicalizes spacing/casing to Life Camp. | 61, 62, 64, 65 |
| Lifecamp | Life Camp | `APPROVED_ALIAS` | User-approved alias application; spelling variant of governed Life Camp. | 54, 55, 56, 57, 58, 59, 60, 63 |

## Coordinate Review

| Row | Vendor | Source coordinates | Decision | Evidence |
|---:|---|---|---|---|
| 79 | Matan Mangu | `Longitude: 3.3947<br>Latitude: 6.4541` | Excluded | Source coordinates 6.4541, 3.3947 are 537.8 km from Asokoro; likely Lagos/default coordinate pair. |
| 87 | lndomie woman | `Longitude: 3.3947<br>Latitude: 6.4541` | Excluded | Source coordinates 6.4541, 3.3947 are 537.8 km from Asokoro; likely Lagos/default coordinate pair. |

## Excluded Rows

| Row | Vendor | Area | Reason | Detail |
|---:|---|---|---|---|
| 36 | Relax Delight | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 37 | Mme Indomie | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 38 | Madam yam and Beans | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 39 | CALABAR KITCHEN | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 40 | MUNACHIMNSOO RESTAURANT. | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 41 | Samuel Toluwani | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 42 | Dorathy | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 43 | Yargata Kitchen | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 44 | Amis fresh and Hot | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 45 | Baby Fish Grills | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 46 | Chilled Oasis Lizzy's place | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 47 | Mama Sa | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 48 | Dora indomie Spot | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 49 | Madam popcorn | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 50 | Mama ofaku | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 51 | Mama Taiye | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 52 | Mama Uche | Karimo | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | Karimo is not in current governance and no safe existing canonical area preserves locality meaning. |
| 79 | Matan Mangu | Asokoro | `EXCLUDED_UNVERIFIED_COORDINATES` | Source coordinates 6.4541, 3.3947 are 537.8 km from Asokoro; likely Lagos/default coordinate pair. |
| 87 | lndomie woman | Asokoro | `EXCLUDED_UNVERIFIED_COORDINATES` | Source coordinates 6.4541, 3.3947 are 537.8 km from Asokoro; likely Lagos/default coordinate pair. |

## Duplicate Slug Resolution

| Row | Vendor Name | Base Slug | Final Slug |
|---:|---|---|---|
| 16 | Madam Indomie | `madam-indomie` | `madam-indomie-row-016` |
| 21 | Favour | `favour` | `favour-row-021` |
| 22 | Favour | `favour` | `favour-row-022` |
| 28 | Zoveno kitchen | `zoveno-kitchen` | `zoveno-kitchen-row-028` |
| 29 | Zoveno kitchen | `zoveno-kitchen` | `zoveno-kitchen-row-029` |
| 35 | Mama Obinna | `mama-obinna` | `mama-obinna-row-035` |
| 61 | Mama Obinna | `mama-obinna` | `mama-obinna-row-061` |
| 67 | Madam Indomie | `madam-indomie` | `madam-indomie-row-067` |
| 83 | Mme Suya | `mme-suya` | `mme-suya-row-083` |
| 92 | Mme Suya | `mme-suya` | `mme-suya-row-092` |
| 97 | Mama Sisi | `mama-sisi` | `mama-sisi-row-097` |
| 98 | Mama sisi | `mama-sisi` | `mama-sisi-row-098` |

## Area Summary

| Final CSV Area | Vendor Count |
|---|---:|
| Apo | 6 |
| Asokoro | 18 |
| Garki | 19 |
| Gudu | 9 |
| Jabi | 16 |
| Kado | 1 |
| Life Camp | 12 |

## Category Preservation Summary

- Source category assignments in full workbook: **309**.
- Category assignments in generated CSV: **245**.
- Difference is due to documented row exclusions, not category truncation in included rows.

| Category | Vendor Count |
|---|---:|
| `breakfast` | 60 |
| `dinner` | 53 |
| `drinks` | 16 |
| `grills` | 10 |
| `late-night` | 1 |
| `lunch` | 59 |
| `rice` | 19 |
| `snacks` | 9 |
| `swallow` | 18 |

## Featured Dish Preservation Summary

- Source featured-dish slots in full workbook: **300**.
- Featured-dish slots in generated CSV: **243**.
- Dish slots 1 through 3 are preserved for included rows.

## Warning Summary

| Code | Count |
|---|---:|
| `APPROVED_ALIAS` | 14 |
| `DETERMINISTIC_SLUG_UNIQUENESS` | 12 |
| `EMBEDDED_NEWLINE_SANITIZED` | 211 |
| `EXISTING_GOVERNANCE` | 4 |
| `MISSING_IMAGE` | 81 |
| `REVIEWED_CONTEXT_MAPPING` | 15 |
| `SUSPICIOUS_OVERNIGHT` | 36 |

## Import Readiness Verdict

**READY FOR MANUAL REVIEW**
