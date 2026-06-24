# Localman Batch 4 Excluded Vendors Summary

Source workbook: `/Users/frankenstein/Desktop/Data collection and entry for LOCALMANAPP/5th - 16th June/Localman_app_second_acc2026-06-24_07_24_53.xlsx`

Extraction only. The approved Batch 4 CSV was not modified. No import was run. No database data was modified.

## Executive Summary

- Total excluded vendors: **19**
- Coordinate Issues: **2**
- Governance Issues: **17**
- Slug Issues: **0**

## Reason Breakdown

| Reason Group | Validation Code | Count | Rows Affected | Agent Action Required |
|---|---|---:|---|---|
| Governance Issues | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | 17 | 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52 | Field/admin governance review required: confirm whether Karimo should be added to ABUJA_AREA_DEFINITIONS, then recapture or approve the canonical area before import. |
| Coordinate Issues | `EXCLUDED_UNVERIFIED_COORDINATES` | 2 | 79, 87 | Field agent must revisit or verify the vendor location and provide correct Abuja/Asokoro coordinates. Do not guess coordinates. |

## Excluded Vendors

| Source Row | Vendor Name | Business Name | Phone | Area | Latitude | Longitude | Validation Code |
|---:|---|---|---|---|---|---|---|
| 36 | Rachel Agu | Relax Delight | `09034276778` | Karimo | `9.0652911` | `7.3800676` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 37 | Precious Ayonami | Mme Indomie | `09113018488` | Karimo | `9.0671102` | `7.3660052` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 38 | Rosemary Peter | Madam yam and Beans | `09060718845` | Karimo | `9.0635308` | `7.3716828` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 39 | Blessing Sunday | CALABAR KITCHEN | `09076974647` | Karimo | `9.0616413` | `7.3730223` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 40 | Pricilia Ngozi | MUNACHIMNSOO RESTAURANT. | `07065018886` | Karimo | `9.0705827` | `7.348464` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 41 | Folashade Ezekiel | Samuel Toluwani | `08139194612` | Karimo | `9.0708967` | `7.3518383` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 42 | DORATHY RINDAP | Dorathy | `09044991778` | Karimo | `9.0698894` | `7.3523359` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 43 | Mercy Thomas | Yargata Kitchen | `08065642624` | Karimo | `9.0698183` | `7.3540141` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 44 | Amina Iyabo | Amis fresh and Hot | `08063915852` | Karimo | `9.0696838` | `7.3540974` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 45 | Esther Nwoko | Baby Fish Grills | `08101464349` | Karimo | `9.0701183` | `7.3574467` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 46 | Elizabeth Ogar | Chilled Oasis Lizzy's place | `08102751417` | Karimo | `9.0699877` | `7.357498` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 47 | Joyce Diko | Mama Sa | `09029628124` | Karimo | `9.0703281` | `7.3595898` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 48 | Okam Dorathy | Dora indomie Spot | `09136763603` | Karimo | `9.0697009` | `7.3623044` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 49 | Joy Andrew | Madam popcorn | `08138611913` | Karimo | `9.0696824` | `7.3623613` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 50 | Ngozi Kalu | Mama ofaku | `07036171506` | Karimo | `9.0696819` | `7.3623655` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 51 | Grace Ayo | Mama Taiye | `08164337439` | Karimo | `9.069385` | `7.3625633` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 52 | UJU Ijeoma | Mama Uche | `08056635112` | Karimo | `9.0691217` | `7.3636517` | `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` |
| 79 | Christiana Tanko | Matan Mangu | `08130720622` | Asokoro | `6.4541` | `3.3947` | `EXCLUDED_UNVERIFIED_COORDINATES` |
| 87 | Anabel Lawrence | lndomie woman | `07019683645` | Asokoro | `6.4541` | `3.3947` | `EXCLUDED_UNVERIFIED_COORDINATES` |

## Agent Actions Required

- For `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED`: confirm whether `Karimo` should be added to Localman governance or provide an approved canonical governed area. Do not rewrite the vendor location without governance approval.
- For `EXCLUDED_UNVERIFIED_COORDINATES`: revisit or verify the vendor location and provide correct Abuja/Asokoro coordinates. Do not guess coordinates.

## Output Workbook

`localman-batch-4-excluded-vendors.xlsx` contains:

- `Summary`: counts by reason.
- `Excluded Vendors`: focused agent follow-up fields plus exclusion metadata.
- `Original Source Rows`: full original submitted workbook columns for the excluded source rows, with correction metadata prepended.
