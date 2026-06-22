# Release Status

This document summarizes the current release state before marketplace reset and production onboarding.

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
| Import Hardening | Ready | Time, image, phone, slug, and warning policies are aligned with production field collection. |
| Documentation | Updated | Production reset, import, onboarding, area, discovery, and architecture docs are consolidated. |

## Current Next Steps

1. Commit changes.
2. Execute marketplace reset after backup and approval.
3. Validate empty state.
4. Transform production dataset.
5. Review production CSV.
6. Import vendors.
7. Import riders.
8. Smoke test.
9. Launch.

## Release Warnings

- Do not execute marketplace reset without a backup.
- Do not import raw XLSX collection files directly.
- Unknown CSV areas warn but do not block import.
- Missing images warn but do not block import.
- Audit logs are retained and are not part of marketplace analytics reset.
- If production onboarding depends on manual creation outside the current governance list, update governance before manual entry.

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
