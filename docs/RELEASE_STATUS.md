# Release Status

This document summarizes the current release state after marketplace reset, production onboarding framework setup, import hardening, and Batch 1-3 vendor onboarding.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Discovery | Stable | GPS -> selected area -> default Wuse priority is documented and validated. |
| Search | Stable | Search operates against the active discovery dataset. |
| Map | Stable | Map follows active discovery origin and shares the vendor dataset with list views. |
| Ratings | Stable | Anonymous hash exposure has been hardened; public badges are conservative. |
| Rider Connect | Stable | Max 3 verified, visible, available riders; WhatsApp handoff privacy boundaries are documented. |
| PWA | Stable | Static shell caching only; dynamic APIs remain network-owned. |
| Governance | Stable | Area governance exists for manual creation and CSV normalization. |
| Reset Script | Ready | Dry-run mode passed previously; execute mode requires explicit confirmation. |
| Import Hardening | Ready | Time, image, phone, slug, category, featured dish, day mapping, and warning policies are aligned with production field collection. |
| Production Data | Active | Batch 1-3 onboarding has populated the production marketplace. Current expected production totals are 56 vendors, 190 category mappings, 392 hours rows, and 168 featured dishes. |
| Documentation | Updated | Production reset, import, onboarding, area, discovery, architecture, release gate, and operations docs are consolidated. |

## Current Next Steps

1. Commit changes.
2. Run the master release gate before deployment or any additional production import.
3. Resolve release-gate blockers before launch.
4. Continue future vendor onboarding through the production import standard.
5. Record every batch in `docs/PRODUCTION_IMPORT_HISTORY.md`.
6. Smoke test discovery, map, search, hours, admin, Rider Connect, ratings, and PWA runtime after each import.

## Release Warnings

- Do not execute marketplace reset without a backup.
- Do not import raw XLSX collection files directly.
- Unknown CSV areas warn but do not block import.
- Missing images warn but do not block import.
- Audit logs are retained and are not part of marketplace analytics reset.
- If production onboarding depends on manual creation outside the current governance list, update governance before manual entry.
- Keep stale E2E fixtures aligned with production-safe examples so release gates do not fail for removed QA vendors.

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
