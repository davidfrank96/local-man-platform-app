# Localman Production Import Batch 4 Geographic Validation

CSV audited: `outputs/localman-production-import-batch-4/localman-production-import-batch-4.csv`

No coordinates were corrected. No CSV rows were changed. No import was run.

## Method

- Distance calculation: haversine distance from vendor coordinates to the assigned area center.
- PASS: coordinates inside Abuja sanity envelope and within 5 km of area center.
- WARNING: coordinates inside Abuja sanity envelope but more than 5 km and up to 10 km from area center.
- FAIL: coordinates outside the Abuja sanity envelope, clearly in another city/state, or more than 10 km from assigned area center.
- Configured discovery centers are used where the repo defines them. For governed non-discovery areas without configured centers, this audit uses an audit-only retained-vendor centroid and labels it clearly.

## Area Centers Used

| Area | Center | Source |
|---|---|---|
| Apo | `9.011869, 7.477657` | audit-only retained-vendor centroid; no configured governance center in repo |
| Asokoro | `9.047600, 7.515000` | configured discovery center |
| Garki | `9.026700, 7.483300` | configured discovery center |
| Gudu | `9.000642, 7.469461` | audit-only retained-vendor centroid; no configured governance center in repo |
| Jabi | `9.065000, 7.423100` | configured discovery center |
| Kado | `9.066476, 7.396403` | audit-only retained-vendor centroid; no configured governance center in repo |
| Life Camp | `9.070704, 7.399356` | audit-only retained-vendor centroid; no configured governance center in repo |

## Summary

| Result | Count |
|---|---:|
| PASS | 78 |
| WARNING | 3 |
| FAIL | 0 |

## Geographic Mismatches

| CSV Line | Vendor | Area | Coordinates | Distance From Area Center | Result | Reason |
|---:|---|---|---|---:|---|---|
| 76 | Mama Bole | Jabi | `9.0579, 7.4951` | 7.95 km | WARNING | Coordinates are plausible Abuja coordinates but unusually far from assigned area center (>5 km). |
| 77 | Tina Rimke dada | Jabi | `9.0579, 7.4951` | 7.95 km | WARNING | Coordinates are plausible Abuja coordinates but unusually far from assigned area center (>5 km). |
| 81 | Mama Nde | Jabi | `9.0579, 7.4951` | 7.95 km | WARNING | Coordinates are plausible Abuja coordinates but unusually far from assigned area center (>5 km). |

## Vendor-by-Vendor Area Distance Check

| CSV Line | Vendor | Area | Coordinates | Distance From Area Center | PASS / WARNING / FAIL |
|---:|---|---|---|---:|---|
| 2 | Mai Suya | Garki | `9.0259712, 7.4700817` | 1.45 km | PASS |
| 3 | Anambra Kitchen | Garki | `9.025545, 7.469465` | 1.52 km | PASS |
| 4 | NATIONS EAT PLATE FAST FOOD | Garki | `9.0248273, 7.4690103` | 1.58 km | PASS |
| 5 | Ann's kitchen | Garki | `9.0258168, 7.4637133` | 2.15 km | PASS |
| 6 | Comfort Kitchen | Garki | `9.0263632, 7.4639992` | 2.12 km | PASS |
| 7 | Mama Edo | Garki | `9.0260453, 7.4638509` | 2.14 km | PASS |
| 8 | Christina Onishinu | Garki | `9.0260285, 7.4638563` | 2.14 km | PASS |
| 9 | Mama mimi | Garki | `9.0274517, 7.467905` | 1.69 km | PASS |
| 10 | Madam TIV | Garki | `9.0278317, 7.4671867` | 1.77 km | PASS |
| 11 | Precious Indomie | Garki | `9.0284875, 7.4663562` | 1.87 km | PASS |
| 12 | MaMa Ola | Garki | `9.031401, 7.4698664` | 1.57 km | PASS |
| 13 | ADAMU SPECIAL KILISHI | Garki | `9.0310461, 7.4704132` | 1.50 km | PASS |
| 14 | Adamu kilishi | Garki | `9.0304783, 7.4703117` | 1.49 km | PASS |
| 15 | Mummy Emma | Gudu | `8.9980303, 7.4725915` | 0.45 km | PASS |
| 16 | Madam Indomie | Gudu | `8.998249, 7.4718152` | 0.37 km | PASS |
| 17 | Iya | Gudu | `8.9999369, 7.472287` | 0.32 km | PASS |
| 18 | Mama Lovina | Gudu | `9.0035953, 7.4645591` | 0.63 km | PASS |
| 19 | Samira | Gudu | `9.002836, 7.4648849` | 0.56 km | PASS |
| 20 | Mai Nama | Gudu | `9.002695, 7.4646465` | 0.58 km | PASS |
| 21 | Favour | Gudu | `8.9998887, 7.4711588` | 0.20 km | PASS |
| 22 | Favour | Gudu | `9.0006891, 7.4720249` | 0.28 km | PASS |
| 23 | Ify plantain | Gudu | `8.9998551, 7.4711794` | 0.21 km | PASS |
| 24 | Madam leaky finger | Apo | `9.000146, 7.4717771` | 1.45 km | PASS |
| 25 | Diamond Gee global | Apo | `9.0113782, 7.4728413` | 0.53 km | PASS |
| 26 | SANA'S FOOD COMBO | Apo | `9.0121238, 7.4780563` | 0.05 km | PASS |
| 27 | Mummy Samuel | Apo | `9.0154183, 7.48145` | 0.57 km | PASS |
| 28 | Zoveno kitchen | Apo | `9.016075, 7.4809089` | 0.59 km | PASS |
| 29 | Zoveno kitchen | Apo | `9.016075, 7.4809089` | 0.59 km | PASS |
| 30 | Madam Jos | Garki | `9.018934, 7.4920715` | 1.29 km | PASS |
| 31 | Mama Hassan | Garki | `9.0239963, 7.4874059` | 0.54 km | PASS |
| 32 | Nikxy nice | Garki | `9.0224526, 7.4876739` | 0.67 km | PASS |
| 33 | Magdalene | Garki | `9.0216288, 7.4872872` | 0.71 km | PASS |
| 34 | G&G Restaurant | Garki | `9.021222, 7.4854184` | 0.65 km | PASS |
| 35 | Mama Obinna | Garki | `9.0233273, 7.4855401` | 0.45 km | PASS |
| 36 | Mma Afam | Kado | `9.0664762, 7.3964027` | 0.00 km | PASS |
| 37 | Mme Yam | Life Camp | `9.067795, 7.4001182` | 0.33 km | PASS |
| 38 | China | Life Camp | `9.0682094, 7.4081856` | 1.01 km | PASS |
| 39 | Aunty Indomie | Life Camp | `9.0674206, 7.4045409` | 0.68 km | PASS |
| 40 | Mama Ezikel | Life Camp | `9.0674361, 7.4042659` | 0.65 km | PASS |
| 41 | Joy Fish Service | Life Camp | `9.0676466, 7.4040284` | 0.62 km | PASS |
| 42 | Madam No be lie | Life Camp | `9.0785426, 7.3897845` | 1.37 km | PASS |
| 43 | Calabar kitchen | Life Camp | `9.0790368, 7.3872816` | 1.62 km | PASS |
| 44 | Mama Obinna | Life Camp | `9.079551, 7.3861045` | 1.76 km | PASS |
| 45 | Mama sunny | Life Camp | `9.0687064, 7.4014437` | 0.32 km | PASS |
| 46 | Mummy Twins | Life Camp | `9.0685533, 7.4014767` | 0.33 km | PASS |
| 47 | Blessing Smoothie | Life Camp | `9.0677749, 7.4025378` | 0.48 km | PASS |
| 48 | Madam Franka | Life Camp | `9.067772, 7.4025096` | 0.48 km | PASS |
| 49 | Madam Mbpodium plantain | Jabi | `9.0618181, 7.4195524` | 0.53 km | PASS |
| 50 | Madam Indomie | Jabi | `9.0611876, 7.4214052` | 0.46 km | PASS |
| 51 | Potable kitchen | Jabi | `9.0605014, 7.4214052` | 0.53 km | PASS |
| 52 | Mama Shilo | Jabi | `9.0624617, 7.4186817` | 0.56 km | PASS |
| 53 | Theresa fish | Jabi | `9.062329, 7.4183137` | 0.60 km | PASS |
| 54 | madam food | Asokoro | `9.0534762, 7.5245344` | 1.23 km | PASS |
| 55 | Madam CoCo | Asokoro | `9.0519221, 7.5247999` | 1.18 km | PASS |
| 56 | Mama Mmesoma | Asokoro | `9.0489642, 7.5266493` | 1.29 km | PASS |
| 57 | IVY KITCHEN | Asokoro | `9.0426935, 7.5251815` | 1.24 km | PASS |
| 58 | Baba Suya | Asokoro | `9.042504, 7.5248981` | 1.23 km | PASS |
| 59 | Madam Calabar | Asokoro | `9.0406898, 7.5233262` | 1.19 km | PASS |
| 60 | Success Snacks and Drinks | Asokoro | `9.0432905, 7.5202339` | 0.75 km | PASS |
| 61 | Joy Cathering and outdoor services | Asokoro | `9.0470049, 7.5243863` | 1.03 km | PASS |
| 62 | Madam Cash | Asokoro | `9.0579, 7.4951` | 2.47 km | PASS |
| 63 | Mama Amira | Asokoro | `9.0579, 7.4951` | 2.47 km | PASS |
| 64 | Mme Fura | Asokoro | `9.0579, 7.4951` | 2.47 km | PASS |
| 65 | Mme Suya | Asokoro | `9.0147332, 7.5168852` | 3.66 km | PASS |
| 66 | Madam Roasted yam | Asokoro | `9.0160302, 7.5167711` | 3.52 km | PASS |
| 67 | Mama Awara | Asokoro | `9.0169855, 7.5148138` | 3.40 km | PASS |
| 68 | Mme Awara | Asokoro | `9.0136923, 7.5137255` | 3.77 km | PASS |
| 69 | Mama moi moi | Asokoro | `9.0579, 7.4951` | 2.47 km | PASS |
| 70 | Medoya /Mme yam | Asokoro | `9.0579, 7.4951` | 2.47 km | PASS |
| 71 | Mama Ada | Asokoro | `9.0499955, 7.5272579` | 1.37 km | PASS |
| 72 | Mandy's signature | Jabi | `9.075363, 7.42624` | 1.20 km | PASS |
| 73 | Mme Suya | Jabi | `9.071592, 7.4328962` | 1.30 km | PASS |
| 74 | God's Hand food vendor | Jabi | `9.0709583, 7.4321933` | 1.20 km | PASS |
| 75 | Madam put more | Jabi | `9.0666231, 7.4311676` | 0.90 km | PASS |
| 76 | Mama Bole | Jabi | `9.0579, 7.4951` | 7.95 km | WARNING |
| 77 | Tina Rimke dada | Jabi | `9.0579, 7.4951` | 7.95 km | WARNING |
| 78 | Mama Sisi | Jabi | `9.0656116, 7.427056` | 0.44 km | PASS |
| 79 | Mama sisi | Jabi | `9.0652368, 7.4269701` | 0.43 km | PASS |
| 80 | Mama thank God | Jabi | `9.0649922, 7.4249045` | 0.20 km | PASS |
| 81 | Mama Nde | Jabi | `9.0579, 7.4951` | 7.95 km | WARNING |
| 82 | Ultimate ontop | Jabi | `9.0648142, 7.4252123` | 0.23 km | PASS |

## Verdict

**READY FOR MANUAL REVIEW WITH GEOGRAPHIC WARNINGS**

No geographic failures were found, but warning rows require manual review before import.
