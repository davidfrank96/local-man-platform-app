# Localman Production Import Batch 4 Governance Resolution

Source workbook: `/Users/frankenstein/Desktop/Data collection and entry for LOCALMANAPP/5th - 16th June/Localman_app_second_acc2026-06-24_07_24_53.xlsx`

No import was run. No database or production data was modified. No governance code was changed.

## Executive Summary

- Workbook vendor rows reviewed: **100**.
- Unknown governance area values reviewed: **5** values across **46** vendors.
- Area values safely resolvable only with explicit alias approval: **2** (`Gariki`, `Lifecamp`).
- Area values not resolved by existing governance: **3** (`Area 1`, `Gaduwa`, `Karimo`).
- Coordinate failures: **2** rows.
- Duplicate slug blocker rows found in preflight: **14**.
- CSV generated: **NO**.
- Import readiness verdict: **NOT READY FOR IMPORT**.

The final production CSV was not generated because unresolved governance mappings and coordinate failures remain. Generating a CSV now would either preserve unknown governance areas or require unapproved location rewrites.

## Governance Resolution Report

| Original Area | Vendor Count | Recommended Canonical Area | Status | Evidence / Reason | Rows |
|---|---:|---|---|---|---|
| Area 1 | 13 | Garki, only after explicit governance approval | `CONDITIONAL_NOT_RESOLVED` | Coordinates cluster near configured Garki center (centroid 1.7 km), but source area is explicitly Area 1 and current governance has no Area 1 alias. Silent remap would hide the source district. Coordinate centroid nearest configured centers: Garki 1.7 km; Utako 5.6 km; Asokoro 5.7 km. | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 |
| Gaduwa | 2 | Add Gaduwa or explicitly alias to Gudu after product/governance approval | `NOT_RESOLVED` | Source area is Gaduwa; both addresses also mention Gudu, but Gaduwa is a distinct locality label. Mapping to Gudu would lose the submitted area meaning without an approved alias. Coordinate centroid nearest configured centers: Garki 3.3 km; Asokoro 7.4 km; Utako 7.9 km. | 18, 19 |
| Gariki | 6 | Garki | `RESOLVABLE_WITH_EXPLICIT_ALIAS` | Likely spelling variant of Garki; all 6 coordinates are within 0.4-1.3 km of configured Garki center and addresses repeatedly say Gariki/Gariki Market. Coordinate centroid nearest configured centers: Garki 0.7 km; Asokoro 4.2 km; Wuse 7.0 km. | 30, 31, 32, 33, 34, 35 |
| Karimo | 17 | Add Karimo to governance | `NOT_RESOLVED` | 17 vendors use Karimo as source area. Coordinates span Karimo/Idu corridor; nearest discovery centers vary between Jabi and Gwarinpa. No safe existing canonical area preserves the source meaning. Coordinate centroid nearest configured centers: Gwarinpa 6.6 km; Jabi 6.8 km; Lugbe 8.7 km. | 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52 |
| Lifecamp | 8 | Life Camp | `RESOLVABLE_WITH_EXPLICIT_ALIAS` | Whitespace/casing variant of governed Life Camp; addresses contain Lifecamp/life camp and existing governance already canonicalizes `Life camp` to `Life Camp`. Coordinate centroid nearest configured centers: Jabi 2.6 km; Gwarinpa 4.4 km; Utako 4.5 km. | 54, 55, 56, 57, 58, 59, 60, 63 |

### Governance Decision

- `Gariki` can be normalized to `Garki` only if an explicit alias decision is recorded.
- `Lifecamp` can be normalized to `Life Camp` only if an explicit alias decision is recorded.
- `Area 1` should not be silently remapped. It likely belongs under Garki for this dataset, but that must be an approved governance rule or manual CSV decision.
- `Gaduwa` should not be silently mapped to Gudu. The address evidence mentions Gudu, but the submitted area value is Gaduwa.
- `Karimo` should be added to governance or explicitly handled as its own area; mapping to Jabi/Gwarinpa/Idu would lose locality meaning.

## Coordinate Review

| Row | Vendor | Area | Source workbook coordinates | Transformed coordinates | Distance from Asokoro center | Likely location | Decision |
|---:|---|---|---|---|---:|---|---|
| 79 | Matan Mangu | Asokoro | `Longitude: 3.3947<br>Latitude: 6.4541` | `6.4541, 3.3947` | 537.8 km | Lagos coordinate pair / default bad GPS value | `FAIL_DATA_ENTRY_ERROR` |
| 87 | lndomie woman | Asokoro | `Longitude: 3.3947<br>Latitude: 6.4541` | `6.4541, 3.3947` | 537.8 km | Lagos coordinate pair / default bad GPS value | `FAIL_DATA_ENTRY_ERROR` |

Answer: the two Asokoro coordinates are not correct for Abuja/Asokoro. They are source workbook values and would transform unchanged; no coordinate correction is possible without guessing.

## Import Readiness Decision

| Check | Result | Evidence |
|---|---|---|
| Vendor count | PASS | 100 source rows found. |
| Governance areas | FAIL | 46 vendors use raw area values not currently in `ABUJA_AREA_DEFINITIONS`; 32 of those vendors remain unresolved after safe-alias review (`Area 1`, `Gaduwa`, `Karimo`). |
| Coordinates | FAIL | 2 Asokoro rows have coordinates ~537.8 km from Asokoro center. |
| Unique slugs | FAIL | 7 duplicate slug value(s): `calabar-kitchen`, `favour`, `madam-indomie`, `mama-obinna`, `mama-sisi`, `mme-suya`, `zoveno-kitchen`. |
| Phones | PASS | 0 invalid phone row(s); 0 multiple-phone rows would select first valid phone. |
| Categories preserved | PASS | 309 source category assignments detected; 309 assignments fit the 6-slot importer contract; 0 unknown category assignments. |
| Featured dishes preserved | PASS | 300 source featured-dish slots detected; 0 rows missing all featured dishes. |

## Exact Blocking Rows

| Blocker Type | Rows | Detail |
|---|---|---|
| Governance unresolved | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 19, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52 | `Area 1`, `Gaduwa`, and `Karimo` require governance approval/addition before a valid governed CSV can be produced. |
| Coordinate failure | 79, 87 | Rows have source coordinates outside Abuja; no guessing or correction applied. |
| Duplicate slugs | 16, 21, 22, 28, 29, 35, 39, 60, 61, 67, 83, 92, 97, 98 | Duplicate generated slugs must be resolved before import. |

### Duplicate Slug Detail

| Slug | Rows | Vendors |
|---|---|---|
| `calabar-kitchen` | 39, 60 | CALABAR KITCHEN, Calabar kitchen |
| `favour` | 21, 22 | Favour, Favour |
| `madam-indomie` | 16, 67 | Madam Indomie, Madam Indomie |
| `mama-obinna` | 35, 61 | Mama Obinna, Mama Obinna |
| `mama-sisi` | 97, 98 | Mama Sisi, Mama sisi |
| `mme-suya` | 83, 92 | Mme Suya, Mme Suya |
| `zoveno-kitchen` | 28, 29 | Zoveno kitchen, Zoveno kitchen |

## CSV Generation Decision

CSV Generated: **NO**

Files intentionally not created in this run:

- `localman-production-import-batch-4.csv`
- `localman-production-import-batch-4-audit.md`
- `localman-production-import-batch-4-validation.md`

Reason: Phase 4 requires CSV generation only if governance and coordinate issues are resolved. They are not resolved.

## PASS / WARNING / FAIL Counts

| Result | Count | Checks |
|---|---:|---|
| PASS | 4 | Vendor count; Phones; Categories; Featured dishes |
| WARNING | 2 | Safe aliases require approval: Gariki->Garki, Lifecamp->Life Camp; Multiple phone rows select first valid phone |
| FAIL | 3 | Governance areas; Coordinates; Unique slugs |

## Import Readiness Verdict

**NOT READY FOR IMPORT**

Exact reason: governance remains unresolved for `Area 1`, `Gaduwa`, and `Karimo`; rows 79 and 87 have source coordinate failures; duplicate generated slugs also need review before import. The CSV was not generated because doing so would produce a package that is not import-ready.
