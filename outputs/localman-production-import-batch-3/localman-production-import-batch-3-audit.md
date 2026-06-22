# Localman Production Import Batch 3 Audit

- Source workbook: `/Users/frankenstein/Desktop/Data collection and entry for LOCALMANAPP/3rd:4th June submissions/Localman_app_vendors2026-3rd : 4th June.xlsx`
- Generated CSV: `/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/outputs/localman-production-import-batch-3/localman-production-import-batch-3.csv`
- Vendor rows processed: 23
- CSV shape valid: yes
- Slugs unique: yes
- PASS rows: 0
- WARNING rows: 23
- FAIL rows: 0
- Import readiness verdict: **READY FOR MANUAL REVIEW**

## Duplicate Slug Report

| Base Slug | Row | Vendor Name | Business Name | Phone | Coordinates | Address | Resolution |
|---|---:|---|---|---|---|---|---|
| `mama-mary` | 7 | Blessing Ngozi | Mama mary | 08168291113 | 9.0659725, 7.4371586 | Utako opposite NUJ Fct Council | `mama-mary` |
| `mama-mary` | 14 | Magreat Augustine | Mama mary | 08169762420 | 9.0671467, 7.44619 | Utako market by SAY plaza | `mama-mary-2` |

## Root Cause

Rows 7 and 14 are two different vendors sharing the same source business identifier, `Mama mary`. They have different contact names, phone numbers, coordinates, addresses, food descriptions, and hours. This is not a duplicate vendor entry.

## Transformation Rules Applied

- Business/vendor name selected from the public business identifier where available; contact names were not used when a business identifier was present.
- Duplicate base slugs are resolved deterministically by keeping the first occurrence unchanged and appending a numeric suffix to later occurrences.
- Coordinates were split from the combined source field and preserved as exact latitude/longitude strings.
- Area values were normalized to canonical governance values when recognized.
- Categories were normalized to Localman category slugs and written to `category_1` through `category_6`.
- Featured dishes 1-3 and descriptions were preserved.
- Images were kept as source URLs when present; missing images remain warnings only.
- Closed days are represented by blank open/close fields.
- No database import was executed.

## Vendor Summary

| Excel Row | Vendor | Slug | Area | Coordinates | Categories | Phone | Status |
|---:|---|---|---|---|---|---|---|
| 2 | Blessing indomie | `blessing-indomie` | Jabi | 9.0737793, 7.4328425 | breakfast, lunch, dinner | 09060535220 | WARNING |
| 3 | mai Awara | `mai-awara` | Jabi | 9.0732157, 7.43258 | lunch, dinner | 09073132789 | WARNING |
| 4 | Madam Fish | `madam-fish` | Jabi | 9.0720683, 7.4331236 | grills | 09012313375 | WARNING |
| 5 | Chi joy Catherine Services | `chi-joy-catherine-services` | Jabi | 9.0716052, 7.4337068 | drinks, snacks | 08036086442 | WARNING |
| 6 | Chizzy African food | `chizzy-african-food` | Utako | 9.0653398, 7.4366143 | breakfast, lunch, dinner, rice, swallow | 08028501536 | WARNING |
| 7 | Mama mary | `mama-mary` | Utako | 9.0659725, 7.4371586 | breakfast, lunch, dinner, rice, swallow | 08168291113 | WARNING |
| 8 | Alice kitchen | `alice-kitchen` | Utako | 9.0579, 7.4951 | breakfast, lunch, dinner, rice, swallow | 07012264698 | WARNING |
| 9 | Blessing | `blessing` | Utako | 9.0579, 7.4951 | breakfast, lunch, dinner | 07039841690 | WARNING |
| 10 | Mai kilishi | `mai-kilishi` | Utako | 9.0669149, 7.4440806 | grills | 08126703153 | WARNING |
| 11 | mama Obaje | `mama-obaje` | Utako | 9.066911, 7.4447423 | breakfast, lunch, dinner | 09115773894 | WARNING |
| 12 | KC faith kitchen | `kc-faith-kitchen` | Utako | 9.066981, 7.4453189 | breakfast, lunch, dinner, rice, swallow | 09039036107 | WARNING |
| 13 | mummy Dominic | `mummy-dominic` | Utako | 9.0665537, 7.4460218 | drinks | 07068787999 | WARNING |
| 14 | Mama mary | `mama-mary-2` | Utako | 9.0671467, 7.44619 | breakfast, lunch, dinner | 08169762420 | WARNING |
| 15 | Afaihat | `afaihat` | Utako | 9.0579, 7.4951 | breakfast, lunch, rice, swallow | 08123077968 | WARNING |
| 16 | madam Bole | `madam-bole` | Utako | 9.0685354, 7.4383286 | breakfast, lunch | 08032080383 | WARNING |
| 17 | Mme Doya | `mme-doya` | Utako | 9.0688114, 7.4410824 | breakfast, lunch, dinner | 09017718166 | WARNING |
| 18 | UCHE BEST TASTY MEAL | `uche-best-tasty-meal` | Utako | 9.0579, 7.4951 | breakfast, lunch, dinner, drinks, rice, swallow | 08034658710 | WARNING |
| 19 | Awashe suya spot | `awashe-suya-spot` | Utako | 9.0579, 7.4951 | grills | 08126818766 | WARNING |
| 20 | mme Masa | `mme-masa` | Utako | 9.0713346, 7.4457946 | breakfast, lunch | 08149961258 | WARNING |
| 21 | NIKIS SPECIAL | `nikis-special` | Utako | 9.0713738, 7.4452178 | breakfast, lunch, dinner, swallow | 09077271144 | WARNING |
| 22 | Mme kunu | `mme-kunu` | Utako | 9.0713718, 7.4458122 | breakfast, lunch, dinner, snacks | 08036117208 | WARNING |
| 23 | Esther | `esther` | Utako | 9.0715296, 7.4456709 | breakfast, dinner | 08035858527 | WARNING |
| 24 | Mama Daniel | `mama-daniel` | Utako | 9.0701888, 7.4458813 | breakfast, lunch | 08135888811 | WARNING |

## Category Preservation Summary

| Category | Mapping Count |
|---|---:|
| `breakfast` | 17 |
| `dinner` | 14 |
| `drinks` | 3 |
| `grills` | 3 |
| `lunch` | 17 |
| `rice` | 6 |
| `snacks` | 2 |
| `swallow` | 7 |

## Area Normalization Summary

| Area | Vendor Count |
|---|---:|
| Jabi | 4 |
| Utako | 19 |

## Warnings

| Code | Count |
|---|---:|
| `DUPLICATE_SLUG_RESOLVED` | 1 |
| `HOURS_REVIEW_OVERNIGHT_OR_REVERSED` | 2 |
| `MISSING_IMAGE` | 23 |
| `MULTIPLE_PHONES` | 3 |
| `PHONE_NORMALIZED` | 3 |
| `TIME_NORMALIZED` | 133 |

## Blocking Issues

No blocking issues.

## Original Workbook vs Generated CSV Preservation

- Coordinates: preserved as exact split latitude/longitude strings from the combined source field.
- Phone content: selected first valid Nigerian phone while preserving leading zero; multiple-phone rows are flagged.
- Vendor names: public vendor name comes from source business identifier where available.
- Categories: all valid categories fit within the six-slot contract for this batch.
- Featured dishes: all three dish slots were preserved when present.
- Addresses: source address text preserved with embedded newlines collapsed to spaces for CSV safety.

## Manual Review Notes

- No failed rows. Review warnings before import.
