# Release Status

This document summarizes the current release state after marketplace reset, production onboarding framework setup, import hardening, Batch 1-4 vendor onboarding, Production Data v1.0 hardening, discovery scaling, map clustering, admin count fixes, and content-quality correction.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Discovery | Stable | GPS -> selected area -> default Wuse priority is documented and validated. |
| Search | Stable | Search operates against the active discovery dataset. |
| Map | Stable | Map receives all matching vendors, uses MapLibre clustering, storefront markers, selected overlay, and same-location selector behavior. |
| Ratings | Stable | Anonymous hash exposure has been hardened; public badges are conservative. |
| Rider Connect | Stable | Max 3 verified, visible, available riders; WhatsApp handoff privacy boundaries are documented. |
| PWA | Stable | Static shell caching only; dynamic APIs remain network-owned. |
| Governance | Stable | Area governance exists for manual creation and CSV normalization. |
| Reset Script | Ready | Dry-run mode passed previously; execute mode requires explicit confirmation. |
| Import Hardening | Ready | Time, image, phone, slug, category, featured dish, day mapping, duplicate-coordinate, governance, content-quality, and warning policies are aligned with production field collection. |
| Admin | Stable | Dashboard counts use database totals, registry remains paginated, edit workspace state resets on selected vendor changes, and Authentication Hardening v1.0 is green. |
| Admin Auth | Certified | Distributed login protection, governed sessions, password management, shared auth UI, SSR-safe reset rendering, and auth migrations are complete. |
| Production Data | Certified | Production Data v1.0 is closed at 137 active vendors, 435 category mappings, 959 hours rows, and 189 featured dish rows under the approved override model. |
| Documentation | Updated | Production reset, import, onboarding, area, discovery, architecture, override policy, release gate, and operations docs are consolidated. |

## Current Next Steps

1. Commit the hardening closeout and Authentication Hardening v1.0 documentation.
2. Run the master release gate before deployment or any additional production import.
3. Continue future vendor onboarding through the production import standard.
4. Record every batch and approved production override in the permanent docs.
5. Smoke test discovery, map, search, hours, admin, Rider Connect, ratings, and PWA runtime after each import.

## Release Warnings

- Do not execute marketplace reset without a backup.
- Do not import raw XLSX collection files directly.
- Unknown CSV areas warn and require governance review before import.
- Missing images warn but do not block import.
- Audit logs are retained and are not part of marketplace analytics reset.
- If production onboarding depends on manual creation outside the current governance list, update governance before manual entry.
- Keep stale E2E fixtures aligned with production-safe examples so release gates do not fail for removed QA vendors.
- Do not treat production/workbook differences as failures when the value is recorded as an approved production override.
- Do not change authentication UI in a way that alters login protection, session governance, Supabase Auth calls, password policy, audit logging, or operational warning visibility.

## Validation Commands

Recommended validation before release:

```bash
npm run db:migrate
npm run db:check
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke:nearby
npm run test:e2e
git diff --check
```
