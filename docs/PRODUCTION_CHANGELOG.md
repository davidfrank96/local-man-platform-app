# Localman Production Changelog

This file records approved production overrides and production-impacting hardening changes for Localman.

Only rows with status `APPROVED` may be used by integrity certification as `APPROVED_PRODUCTION_OVERRIDE`.

## Production Data v1.0 Approved Overrides

| Override ID | Date | Status | Approver | Scope | Field / System | Approved Value / Decision | Reason | Evidence Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OVERRIDE-20260701-001 | 2026-07-01 | APPROVED | Product owner | Production Data v1.0 | source model | Production is operational source of truth; workbooks are historical source documents. | Hardening closeout governance decision. | `docs/PRODUCTION_OVERRIDE_POLICY.md` |
| OVERRIDE-20260701-002 | 2026-07-01 | APPROVED | Product owner | 20 vendors | coordinates | Approved coordinate corrections retained as production baseline. | Duplicate-coordinate audit and phase-1 correction approval. | `outputs/location-correction/phase-1-coordinate-update-report.md` |
| OVERRIDE-20260701-003 | 2026-07-01 | APPROVED | Product owner | 120 vendors | featured dishes | Featured dish correction v1 retained as production baseline. | Source workbook reconciliation and approved SQL execution. | `outputs/dish-correction/featured-dish-correction-review.xlsx` |
| OVERRIDE-20260701-004 | 2026-07-01 | APPROVED | Product owner | 41 vendors | content quality | Content quality correction v1 retained as production baseline. | Final visual approval and content-quality execution package. | `outputs/content-quality-review/content-quality-review.xlsx` |
| OVERRIDE-20260701-005 | 2026-07-01 | APPROVED | Product owner | Production vendors | vendor identity | Approved identity corrections and retained display decisions are baseline. | Vendor identity reconciliation and content-quality approval. | `outputs/vendor-identity-review/vendor-identity-review.xlsx` |
| OVERRIDE-20260701-006 | 2026-07-01 | APPROVED | Product owner | `correctchef` | slug, display name, categories | Retain production state pending future vendor-confirmed branding/category action. | Production hardening closeout decision; do not auto-revert to workbook. | `docs/PRODUCTION_DATA_INTEGRITY.md` |
| OVERRIDE-20260701-007 | 2026-07-01 | APPROVED | Product owner | `esther` | short description | Retain production content-quality state as baseline. | Production hardening closeout decision; content quality is approved production state. | `docs/PRODUCTION_DATA_INTEGRITY.md` |
| OVERRIDE-20260701-008 | 2026-07-01 | APPROVED | Product owner | `g-g-restaurant`, `god-s-hand-food-vendor`, `madam-fish`, `nations-eat-plate-fast-food` | operating hours | Retain production hours as baseline until vendor-confirmed hours update. | Production hardening closeout decision; no automatic overwrite from historical workbook. | `docs/PRODUCTION_DATA_INTEGRITY.md` |
| OVERRIDE-20260701-009 | 2026-07-01 | APPROVED | Product owner | `natures-delight-natural-drink` | display name / featured dishes | Retain current production state as approved baseline carry-forward. | Manual review item accepted as non-blocking for Production Data v1.0; future correction requires separate approval. | `docs/PRODUCTION_DATA_INTEGRITY.md` |

## Production Hardening Changes

| Change ID | Date | Status | Area | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| HARDENING-20260701-001 | 2026-07-01 | APPROVED | Discovery | Discovery scaling split map visibility from card pagination. Map receives all matching vendors; cards are paginated. | `docs/DISCOVERY.md`, `tests/public-discovery-scaling.test.ts` |
| HARDENING-20260701-002 | 2026-07-01 | APPROVED | Map | MapLibre clustering, selected overlay, storefront markers, card-click priority, and same-location selector are the production map model. | `docs/ARCHITECTURE.md`, `tests/vendor-map-clustering.test.ts` |
| HARDENING-20260701-003 | 2026-07-01 | APPROVED | Admin dashboard | Dashboard cards use database totals instead of loaded-page counts. | Admin dashboard count tests and release-gate validation. |
| HARDENING-20260701-004 | 2026-07-01 | APPROVED | Admin edit workspace | Edit workspace remounts/resets on selected vendor id changes; image upload targets current vendor. | `tests/admin-edit-form-state.test.ts` |
| HARDENING-20260701-005 | 2026-07-01 | APPROVED | CSV intake | Route-specific intake preview body limit increased while global API body limit remains unchanged. | `tests/admin-vendor-intake-route.test.ts` |
| HARDENING-20260701-006 | 2026-07-01 | APPROVED | Import pipeline | Category preservation, featured dish preservation, governance validation, coordinate validation, duplicate-coordinate audit, suspicious-hours review, and CSV safety are permanent import locks. | `docs/IMPORT_PIPELINE.md`, `docs/PRODUCTION_IMPORT_STANDARD.md` |

## Future Override Template

Use this template for every future approved override.

```md
| Override ID | Date | Status | Approver | Scope | Field / System | Approved Value / Decision | Reason | Evidence Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OVERRIDE-YYYYMMDD-001 | YYYY-MM-DD | APPROVED | Name / role | vendor slug or system area | field_name | approved value | concise reason | ticket, workbook, vendor message, field-agent confirmation, or approval report |
```

## Rules

- Do not infer approval from production state.
- Do not infer approval from generated CSVs alone.
- Do not use `PENDING_REVIEW`, `REJECTED`, or undocumented rows to pass certification.
- Approved overrides become part of the certified production baseline.
