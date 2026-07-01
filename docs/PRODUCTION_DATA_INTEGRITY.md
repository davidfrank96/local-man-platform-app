# Localman Production Data Integrity Certification

Production Data Version: 1.0

Certification Date: 2026-07-01

Vendor Count: 137

## Executive Summary

Production Data v1.0 is certified under the approved production override model.

Production is now the operational source of truth. Original onboarding workbooks remain historical source documents. A production value passes certification when it matches either the original source workbook after approved normalization or an approved production override recorded in `docs/PRODUCTION_CHANGELOG.md`.

## Certification Model

Every checked field is classified as:

| Classification | Result | Meaning |
| --- | --- | --- |
| `SOURCE_MATCH` | PASS | Production matches the original workbook after approved normalization. |
| `APPROVED_PRODUCTION_OVERRIDE` | PASS | Production intentionally differs from the workbook and is recorded in the production changelog. |
| `UNEXPECTED_CHANGE` | FAIL | Production differs from both the workbook and approved override register. |

Approved overrides must never be treated as failures. Pending, rejected, undocumented, or guessed changes must never be used to pass certification.

## Integrity Results

| Category | Result | Evidence |
| --- | --- | --- |
| Vendor Count | PASS | 137 active production vendors. |
| Phone Integrity | PASS | 137 / 137 production phones normalize to accepted Nigerian phone formats. |
| Coordinate Integrity | PASS | Original coordinates plus approved coordinate corrections are inside Abuja/FCT bounds. |
| Governance Integrity | PASS | Source area matches and approved governance normalizations are recorded; no silent remaps are accepted. |
| Hours Integrity | PASS | Source matches plus approved production hour overrides are accepted baseline. |
| Vendor Identity | PASS | Source matches plus approved identity/content corrections are accepted baseline. |
| Category Integrity | PASS | Source category preservation plus approved production decisions are accepted baseline. |
| Featured Dish Integrity | PASS | Featured dish correction v1 completed; remaining retained exception is recorded as an approved production baseline item. |
| Content Quality | PASS | Content quality correction v1 completed and recorded as approved production override work. |

## Approved Production Overrides

Approved override categories are recorded in `docs/PRODUCTION_CHANGELOG.md` and include:

- coordinate corrections after field/geocode review
- featured dish correction v1
- content quality correction v1
- vendor identity corrections and retained identity decisions
- approved hour decisions
- approved category decisions
- discovery scaling redesign
- map clustering and storefront marker rollout
- admin dashboard count correction
- admin edit-form stale-state fix
- CSV intake preview body-limit fix

## Certification Baseline

| Metric | Value |
| --- | ---: |
| Vendors | 137 |
| Active Vendors | 137 |
| Vendor Hours Rows | 959 |
| Category Mappings | 435 |
| Featured Dish Rows | 189 |
| Vendor Images | 54 |
| Duplicate Slug Groups | 0 |
| Invalid Normalized Phones | 0 |
| Invalid Abuja/FCT Coordinates | 0 |

## Manual Review Status

No open item blocks Production Data v1.0 certification.

The retained `natures-delight-natural-drink` featured-dish/display-name state is recorded in `docs/PRODUCTION_CHANGELOG.md` as an approved baseline carry-forward item. Future correction is allowed only through a new approved content or vendor-confirmation package.

## Hash Baseline

- File: `outputs/integrity/production-data-hashes.csv`
- Rows: 137
- Fields hashed: Vendor ID, Slug, Phone, Latitude, Longitude, Area, Address, Vendor Name, Business Name

## Integrity Score

| Dimension | Score |
| --- | ---: |
| Identity | 100.0% |
| Phones | 100.0% |
| Coordinates | 100.0% |
| Governance | 100.0% |
| Hours | 100.0% |
| Categories | 100.0% |
| Featured Dishes | 100.0% |
| Content Quality | 100.0% |
| Overall | 100.0% |

## Final Certification

CERTIFIED
