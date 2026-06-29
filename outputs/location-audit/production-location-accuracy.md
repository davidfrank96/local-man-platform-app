# Localman Production Location Accuracy Audit

Generated: 2026-06-26T01:27:13.166Z

## Executive Summary

- Total production vendors audited: 137
- Geocoding provider: MapTiler Geocoding API
- HIGH/MEDIUM addresses geocoded or attempted: 125
- Geocoded candidates returned: 125
- Current coordinates outside Abuja/FCT audit bounds: 0
- Geocode candidates outside Abuja/FCT audit bounds: 30
- Duplicate coordinate groups currently present: 9
- Overall location accuracy score: 36.2%

This audit did not modify production data and did not generate SQL.

## Method Notes

- Accuracy grades measure the cross-reference between stored coordinates and geocoded address candidates.
- A `CRITICAL` grade can mean the geocoded candidate landed outside Abuja/FCT; it does not necessarily mean the stored production coordinate is outside Abuja/FCT.
- Current production coordinates are reported separately from geocode candidate coordinates.
- Geocode candidates are review evidence only, not approved replacement coordinates.

## Accuracy Distribution

| Accuracy Grade | Vendor Count |
| --- | --- |
| EXCELLENT | 20 |
| VERY GOOD | 1 |
| GOOD | 1 |
| ACCEPTABLE | 1 |
| NEEDS REVIEW | 34 |
| LIKELY WRONG | 50 |
| CRITICAL | 30 |

## Address Quality Distribution

| Address Confidence | Vendor Count |
| --- | --- |
| HIGH | 93 |
| LOW | 12 |
| MEDIUM | 32 |

## Distance Statistics

- Distance sample size: 125 geocoded candidates
- Average distance error, all candidates: 95879m
- Median distance error, all candidates: 1314m
- Largest distance error: 591848m (Mummy Emma, mummy-emma)
- In-FCT candidate sample size: 95
- Average distance error, in-FCT candidates only: 2759m
- Median distance error, in-FCT candidates only: 1137m
- Largest distance error, in-FCT candidates only: 48731m

## Highest Risk Vendors

| Vendor | Slug | Area | Current Coordinates | Candidate Coordinates | Distance | Grade | Flags | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mummy Emma | mummy-emma | Gudu | 8.998030, 7.472592 | 13.439269, 4.481072 | 591848m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Madam Indomie | madam-indomie-row-016 | Gudu | 8.998249, 7.471815 | 13.439269, 4.481072 | 591781m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Madam leaky finger | madam-leaky-finger | Apo | 9.000146, 7.471777 | 13.439269, 4.481072 | 591602m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Ify plantain | ify-plantain | Gudu | 8.999855, 7.471179 | 13.439269, 4.481072 | 591593m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Favour | favour-row-021 | Gudu | 8.999889, 7.471159 | 13.439269, 4.481072 | 591589m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Favour | favour-row-022 | Gudu | 9.000689, 7.472025 | 13.439269, 4.481072 | 591566m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mai Nama | mai-nama | Gudu | 9.002695, 7.464647 | 13.439269, 4.481072 | 590936m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mama Lovina | mama-lovina | Gudu | 9.003595, 7.464559 | 13.439269, 4.481072 | 590847m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mama Hassan | mama-hassan | Garki | 9.023996, 7.487406 | 6.526904, 3.577400 | 512477m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Magdalene | magdalene | Garki | 9.021629, 7.487287 | 6.526904, 3.577400 | 512325m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| G&G Restaurant | g-g-restaurant | Garki | 9.021222, 7.485418 | 4.762353, 7.021299 | 476327m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Adamu kilishi | adamu-kilishi | Garki | 9.030478, 7.470312 | 12.501423, 5.084473 | 465683m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Ann's kitchen | ann-s-kitchen | Garki | 9.025817, 7.463713 | 12.411648, 9.085097 | 416068m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Christina Onishinu | christina-onishinu | Garki | 9.026029, 7.463856 | 12.411648, 9.085097 | 416040m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| NATIONS EAT PLATE FAST FOOD | nations-eat-plate-fast-food | Garki | 9.024827, 7.469010 | 12.411648, 9.085097 | 415922m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mai Suya | mai-suya | Garki | 9.025971, 7.470082 | 12.411648, 9.085097 | 415757m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Madam Jos | madam-jos | Garki | 9.018934, 7.492072 | 12.411648, 9.085097 | 415455m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mama Obinna | mama-obinna-row-035 | Garki | 9.023327, 7.485540 | 12.411648, 9.085097 | 415310m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| MaMa Ola | mama-ola | Garki | 9.031401, 7.469866 | 12.411648, 9.085097 | 415220m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| God's Hand food vendor | god-s-hand-food-vendor | Jabi | 9.070958, 7.432193 | 5.555400, 8.149800 | 398842m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Oliver's Burger | olivers-burger | Wuse | 9.057900, 7.495100 | 11.894839, 8.536413 | 335368m | CRITICAL | AREA_DISTANCE_WARNING; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mma Afam | mma-afam | Kado | 9.066476, 7.396403 | 11.888589, 8.168249 | 324953m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| madam food | madam-food | Asokoro | 9.053476, 7.524534 | 7.464787, 5.423214 | 290984m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Joy Fish Service | joy-fish-service | Life Camp | 9.067647, 7.404028 | 11.170944, 7.626570 | 235141m | CRITICAL | AREA_DISTANCE_WARNING; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mama Obinna | mama-obinna-row-061 | Life Camp | 9.079551, 7.386105 | 9.600036, 7.999972 | 88804m | CRITICAL | AREA_MISMATCH_CURRENT_COORDINATE; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mama sunny | mama-sunny | Life Camp | 9.068706, 7.401444 | 9.600036, 7.999972 | 88337m | CRITICAL | AREA_DISTANCE_WARNING; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Madam Franka | madam-franka | Life Camp | 9.067772, 7.402510 | 9.600036, 7.999972 | 88320m | CRITICAL | AREA_DISTANCE_WARNING; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Mama Ezikel | mama-ezikel | Life Camp | 9.067436, 7.404266 | 9.600036, 7.999972 | 88202m | CRITICAL | AREA_DISTANCE_WARNING; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Aunty Indomie | aunty-indomie | Life Camp | 9.067421, 7.404541 | 9.600036, 7.999972 | 88180m | CRITICAL | AREA_DISTANCE_WARNING; AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |
| Madam Indomie | madam-indomie-row-067 | Jabi | 9.061188, 7.421405 | 9.600036, 7.999972 | 87293m | CRITICAL | AREA_MISMATCH_CANDIDATE; CANDIDATE_OUTSIDE_ABUJA_FCT | HIGH PRIORITY: verify immediately before relying on map/directions. |

## Vendors Outside Abuja/FCT

No current vendor coordinates are outside the approximate Abuja/FCT audit bounds.

## Candidate Outside Abuja/FCT

| Vendor | Slug | Area | Candidate Address | Candidate Coordinates | Grade |
| --- | --- | --- | --- | --- | --- |
| Adamu kilishi | adamu-kilishi | Garki | Sokoto, Nigeria | 12.501423, 5.084473 | CRITICAL |
| Ann's kitchen | ann-s-kitchen | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| Aunty Indomie | aunty-indomie | Life Camp | Nigeria | 9.600036, 7.999972 | CRITICAL |
| Christina Onishinu | christina-onishinu | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| Favour | favour-row-022 | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| Favour | favour-row-021 | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| G&G Restaurant | g-g-restaurant | Garki | Lagos Street, Port Harcourt, Nigeria | 4.762353, 7.021299 | CRITICAL |
| God's Hand food vendor | god-s-hand-food-vendor | Jabi | Eastern Nigeria Development Corporation Ibiae Oil Palm Estate, Nigeria | 5.555400, 8.149800 | CRITICAL |
| Ify plantain | ify-plantain | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| Joy Fish Service | joy-fish-service | Life Camp | T, Nigeria | 11.170944, 7.626570 | CRITICAL |
| madam food | madam-food | Asokoro | Round About, Ise/Orun, Nigeria | 7.464787, 5.423214 | CRITICAL |
| Madam Franka | madam-franka | Life Camp | Nigeria | 9.600036, 7.999972 | CRITICAL |
| Madam Indomie | madam-indomie-row-016 | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| Madam Indomie | madam-indomie-row-067 | Jabi | Nigeria | 9.600036, 7.999972 | CRITICAL |
| Madam Jos | madam-jos | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| Madam leaky finger | madam-leaky-finger | Apo | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| Magdalene | magdalene | Garki | Lagos State, Nigeria | 6.526904, 3.577400 | CRITICAL |
| Mai Nama | mai-nama | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| Mai Suya | mai-suya | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| Mama Ezikel | mama-ezikel | Life Camp | Nigeria | 9.600036, 7.999972 | CRITICAL |
| Mama Hassan | mama-hassan | Garki | Lagos State, Nigeria | 6.526904, 3.577400 | CRITICAL |
| Mama Lovina | mama-lovina | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| Mama Obinna | mama-obinna-row-061 | Life Camp | Nigeria | 9.600036, 7.999972 | CRITICAL |
| Mama Obinna | mama-obinna-row-035 | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| MaMa Ola | mama-ola | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| Mama sunny | mama-sunny | Life Camp | Nigeria | 9.600036, 7.999972 | CRITICAL |
| Mma Afam | mma-afam | Kado | Kabo, Nigeria | 11.888589, 8.168249 | CRITICAL |
| Mummy Emma | mummy-emma | Gudu | Gudu, Nigeria | 13.439269, 4.481072 | CRITICAL |
| NATIONS EAT PLATE FAST FOOD | nations-eat-plate-fast-food | Garki | Garki, Nigeria | 12.411648, 9.085097 | CRITICAL |
| Oliver's Burger | olivers-burger | Wuse | Kano State, Nigeria | 11.894839, 8.536413 | CRITICAL |

## Priority Queues

- HIGH PRIORITY: 80
- REVIEW: 34
- LOW PRIORITY: 23

## Review Queue Sample

| Vendor | Slug | Area | Address Confidence | Distance | Flags | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| madam Ekaette | madam-ekaette | Wuse | HIGH | 980m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mama mary | mama-mary-2 | Utako | HIGH | 876m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| mummy Dominic | mummy-dominic | Utako | HIGH | 871m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| mama Obaje | mama-obaje | Utako | HIGH | 856m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mai kilishi | mai-kilishi | Utako | HIGH | 844m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Ahjiah | ahjiah | Wuse | HIGH | 838m | AREA_DISTANCE_WARNING | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| KC faith kitchen | kc-faith-kitchen | Utako | HIGH | 800m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mama mary | mama-mary | Utako | MEDIUM | 782m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| quasi quasi | quasi-quasi | Wuse | HIGH | 761m | AREA_DISTANCE_WARNING | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Joy Cathering and outdoor services | joy-cathering-and-outdoor-services | Asokoro | MEDIUM | 731m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Madam CoCo | madam-coco | Asokoro | MEDIUM | 696m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mme Doya | mme-doya | Utako | HIGH | 670m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Success Snacks and Drinks | success-snacks-and-drinks | Asokoro | HIGH | 654m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| madam Bole | madam-bole | Utako | HIGH | 575m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mama Daniel | mama-daniel | Utako | HIGH | 558m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mama Mmesoma | mama-mmesoma | Asokoro | MEDIUM | 525m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mandy's signature | mandy-s-signature | Jabi | MEDIUM | 441m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mama thank God | mama-thank-god | Jabi | HIGH | 430m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Mme kunu | mme-kunu | Utako | MEDIUM | 407m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Esther | esther | Utako | MEDIUM | 384m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| NIKIS SPECIAL | nikis-special | Utako | MEDIUM | 361m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| Madam Mbpodium plantain | madam-mbpodium-plantain | Jabi | HIGH | 350m | PASS | REVIEW: candidate mismatch or no reliable candidate; verify manually. |
| ADAMU SPECIAL KILISHI | adamu-special-kilishi | Garki | LOW |  | PASS | REVIEW: improve address evidence before coordinate correction. |
| China | china | Life Camp | LOW |  | AREA_DISTANCE_WARNING | REVIEW: improve address evidence before coordinate correction. |
| Comfort Kitchen | comfort-kitchen | Garki | LOW |  | PASS | REVIEW: improve address evidence before coordinate correction. |
| Madam TIV | madam-tiv | Garki | LOW |  | PASS | REVIEW: improve address evidence before coordinate correction. |
| Mama Edo | mama-edo | Garki | LOW |  | PASS | REVIEW: improve address evidence before coordinate correction. |
| Mama mimi | mama-mimi | Garki | LOW |  | PASS | REVIEW: improve address evidence before coordinate correction. |
| Mama moi moi | mama-moi-moi | Asokoro | LOW |  | PASS | REVIEW: improve address evidence before coordinate correction. |
| Mama Nde | mama-nde | Jabi | LOW |  | AREA_MISMATCH_CURRENT_COORDINATE | REVIEW: improve address evidence before coordinate correction. |

## Remaining Duplicate Coordinate Groups

| Coordinates | Vendor Count |
| --- | --- |
| 9.057900,7.495100 | 5 |
| 9.062046,7.466555 | 4 |
| 9.074458,7.443211 | 3 |
| 9.045927,7.522983 | 3 |
| 9.073458,7.472005 | 2 |
| 9.079649,7.470913 | 2 |
| 9.066700,7.457200 | 2 |
| 9.063691,7.477501 | 2 |
| 9.016075,7.480909 | 2 |

## Geocoding Errors

No geocoding errors.

## Recommendations

1. Prioritize CRITICAL and LIKELY WRONG rows for field-agent confirmation.
2. Improve LOW-confidence addresses before attempting coordinate correction.
3. Re-run the duplicate-coordinate correction workflow for remaining shared coordinate groups.
4. Treat geocode candidates as review evidence only; do not update coordinates without guarded, manually approved correction SQL.
5. Use this report as the baseline for future batch quality scoring.

## Final Trust Assessment

Overall location trust needs substantial cleanup before the dataset should be considered high-confidence.
