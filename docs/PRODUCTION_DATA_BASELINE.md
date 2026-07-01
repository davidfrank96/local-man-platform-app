# Localman Production Data Baseline

Production Data Version: 1.0

Date: 2026-07-01

## Counts

- Vendor Count: 137
- Active Vendor Count: 137
- Vendor Hours Rows: 959
- Category Mapping Rows: 435
- Featured Dish Rows: 189
- Vendor Image Rows: 54

## Completed Corrections

- Featured Dish Correction: Completed
- Coordinate Correction: Completed
- Governance: Completed
- Vendor Identity: Completed
- Content Quality: Completed
- Release Gates: Passed
- Production Override Policy: Completed
- Production Changelog: Completed
- Production Hardening Closeout: Completed

## Override Policy

- Production override policy: `docs/PRODUCTION_OVERRIDE_POLICY.md`
- Production override register: `docs/PRODUCTION_CHANGELOG.md`
- Future integrity certifications must classify every field as `SOURCE_MATCH`, `APPROVED_PRODUCTION_OVERRIDE`, or `UNEXPECTED_CHANGE`.
- Production is now the operational source of truth.
- Original onboarding workbooks remain historical source documents.
- Production Data v1.0 certification passes when production matches the original source workbook or an approved production override.

## Content Quality v1 Execution

- Vendors Updated: 41
- Content Fields Updated: 85
- Vendor Name Updates: 2
- Featured Dish Name Updates: 23
- Dish Description Updates: 35
- Vendor Description Updates: 25

## Protected Data Verification

- Vendor Count: Unchanged
- Coordinates: Unchanged
- Phones: Unchanged
- Categories: Unchanged
- Governance Areas: Unchanged
- Hours: Unchanged

## Carry-Forward Review Items

- Nature's delight Natural drink is retained as an approved baseline carry-forward item. Future correction requires a separate approved vendor-confirmation or content-quality package.

## Certification Baseline

- Hash baseline: `outputs/integrity/production-data-hashes.csv`
- Certification report: `docs/PRODUCTION_DATA_INTEGRITY.md`
- Certification status as of 2026-07-01: `CERTIFIED` under the approved production override model.
