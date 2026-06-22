# Localman Production Import Batch 2 Audit

- Source workbook: `/Users/frankenstein/Desktop/Data collection and entry for LOCALMANAPP/2nd june submissions/Localman_app_vendors 2nd June 2026.xlsx`
- Generated CSV: `/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/outputs/localman-production-import-batch-2/localman-production-import-batch-2.csv`
- Vendor rows processed: 19
- CSV shape valid: yes
- PASS rows: 0
- WARNING rows: 15
- FAIL rows: 4
- Import readiness verdict: **NOT READY FOR IMPORT**

## Transformation Rules Applied

- Business/vendor name selected from the public business identifier where available; contact names were not used when a business identifier was present.
- Coordinates were split from the combined source field and preserved as exact latitude/longitude strings.
- Area values were normalized to canonical governance values when recognized.
- Categories were normalized to Localman category slugs and written to `category_1` through `category_6`.
- Featured dishes 1-3 and descriptions were preserved.
- Images were kept as source URLs when present; images remain optional.
- Closed days are represented by blank open/close fields.
- No database import was executed.

## Vendor Summary

| Excel Row | Vendor | Slug | Area | Categories | Phone | Status |
|---:|---|---|---|---|---|---|
| 2 | Salisu Suya and grill Spot | `salisu-suya-and-grill-spot` | Wuse | lunch, dinner, late-night, budget-friendly, grills | 08086236152 | WARNING |
| 3 | CorrectChow | `correctchow` | Wuse | breakfast, lunch, dinner, late-night, budget-friendly, drinks | 08035377636 | FAIL |
| 4 | Oliver's Burger | `olivers-burger` | Wuse | lunch, drinks, rice, snacks | 08057522491 | WARNING |
| 5 | Bianns Cuisine | `bianns-cuisine` | Wuse | breakfast, lunch, dinner, drinks, rice, swallow | 07079789421 | WARNING |
| 6 | special Abacha | `special-abacha` | Wuse | breakfast, lunch, dinner | 08163141900 | WARNING |
| 7 | Ozis Snacks, drinks and fast-food | `ozis-snacks-drinks-and-fast-food` | Wuse | breakfast, lunch, budget-friendly, drinks, snacks | 08175573357 | WARNING |
| 8 | Mama princess | `mama-princess` | Wuse | breakfast, lunch, dinner | 08060299929 | WARNING |
| 9 | Nature's delight Natural drink | `natures-delight-natural-drink` | Wuse | drinks | 08065297100 | WARNING |
| 10 | mama blessing | `mama-blessing` | Wuse | breakfast, lunch, dinner | 08169290605 | FAIL |
| 11 | Native Hut | `native-hut` | Wuse | breakfast, lunch, budget-friendly, drinks, grills, swallow | 09131231411 | WARNING |
| 12 | Idoma Kitchen | `idoma-kitchen` | Wuse | breakfast, lunch, budget-friendly, drinks, grills, swallow | 08080371554 | FAIL |
| 13 | madam yam | `madam-yam` | Wuse | breakfast, lunch, dinner | 07061728071 | WARNING |
| 14 | quasi quasi | `quasi-quasi` | Wuse | breakfast, lunch | 09064765465 | WARNING |
| 15 | Laraba | `laraba` | Wuse | breakfast, lunch | 07018810177 | WARNING |
| 16 | Mama food | `mama-food` | Wuse | breakfast, lunch | 08160027490 | WARNING |
| 17 | Christy | `christy` | Wuse | breakfast, lunch, dinner | 07038753053 | WARNING |
| 18 | Blessed Kitchen | `blessed-kitchen` | Wuse | breakfast, lunch, budget-friendly, drinks, grills | 09033663384 | WARNING |
| 19 | Ahjiah | `ahjiah` | Wuse | breakfast, lunch, dinner | 08035173130 | WARNING |
| 20 | mama blessing | `mama-blessing` | Wuse | breakfast, lunch, dinner | 09168508997 | FAIL |

## Category Preservation Summary

| Category | Mapping Count |
|---|---:|
| `breakfast` | 16 |
| `budget-friendly` | 6 |
| `dinner` | 10 |
| `drinks` | 8 |
| `grills` | 4 |
| `late-night` | 2 |
| `lunch` | 18 |
| `rice` | 2 |
| `snacks` | 2 |
| `swallow` | 3 |

## Area Normalization Summary

| Area | Vendor Count |
|---|---:|
| Wuse | 19 |

## Warnings

| Code | Count |
|---|---:|
| `HOURS_REVIEW_OVERNIGHT_OR_REVERSED` | 22 |
| `MISSING_IMAGE` | 2 |
| `MULTIPLE_PHONES` | 1 |
| `PHONE_NORMALIZED` | 2 |
| `TIME_NORMALIZED` | 108 |

## Blocking Issues

| Code | Count |
|---|---:|
| `CATEGORY_SLOT_OVERFLOW` | 1 |
| `DUPLICATE_SLUG_IN_BATCH` | 2 |
| `REQUIRED_HOURS` | 1 |

## Manual Review Notes

- Row 3 `CorrectChow`: CATEGORY_SLOT_OVERFLOW (category_6)
- Row 10 `mama blessing`: DUPLICATE_SLUG_IN_BATCH (slug)
- Row 12 `Idoma Kitchen`: REQUIRED_HOURS (monday_open)
- Row 20 `mama blessing`: DUPLICATE_SLUG_IN_BATCH (slug)
