# Localman Production Import Batch 4 Validation

## Executive Summary

- Source rows: **100**.
- CSV rows: **81**.
- Excluded rows: **19**.
- Blocking failures in generated CSV: **0**.
- Warnings: **373**.
- Verdict: **READY FOR MANUAL REVIEW**.

## PASS / WARNING / FAIL Counts

| Result | Count | Checks |
|---|---:|---|
| PASS | 9 | CSV generated; Vendor count; Unique slugs; Valid phones; Valid coordinates; Valid governance areas; Categories preserved; Featured dishes preserved; CSV safety |
| WARNING | 4 | Rows excluded before CSV generation; Images missing but optional; Approved/reviewed area mappings applied; Deterministic slug uniqueness applied |
| FAIL | 0 | None |

## Validation Checklist

| Check | Result | Evidence |
|---|---|---|
| CSV generated | PASS | Generated final review CSV. |
| Vendor count | PASS | 81 parsed CSV rows; 81 included rows. |
| Unique slugs | PASS | 0 duplicate final slug values. |
| Valid phones | PASS | 0 invalid phone failures. |
| Valid coordinates | PASS | 0 coordinate failures in generated CSV. |
| Valid governance areas | PASS | 0 unknown final areas. |
| Categories preserved | PASS | 245 category assignments in CSV. |
| Featured dishes preserved | PASS | 243 featured dish slots in CSV. |
| CSV safety | PASS | 0 CSV safety errors. |

## Exclusion Counts

| Exclusion Reason | Count | Rows |
|---|---:|---|
| `EXCLUDED_GOVERNANCE_ADDITION_REQUIRED` | 17 | 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52 |
| `EXCLUDED_UNVERIFIED_COORDINATES` | 2 | 79, 87 |

## Warning Code Counts

| Code | Count |
|---|---:|
| `APPROVED_ALIAS` | 14 |
| `DETERMINISTIC_SLUG_UNIQUENESS` | 12 |
| `EMBEDDED_NEWLINE_SANITIZED` | 211 |
| `EXISTING_GOVERNANCE` | 4 |
| `MISSING_IMAGE` | 81 |
| `REVIEWED_CONTEXT_MAPPING` | 15 |
| `SUSPICIOUS_OVERNIGHT` | 36 |

## Failure Detail

_No failures remain in the generated CSV._


## Geographic Area Validation

| Result | Count |
|---|---:|
| PASS | 78 |
| WARNING | 3 |
| FAIL | 0 |

Geographic validation report: `localman-production-import-batch-4-geographic-validation.md`

## Import Readiness Verdict

**READY FOR MANUAL REVIEW**
