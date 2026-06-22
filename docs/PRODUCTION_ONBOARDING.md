# Production Onboarding

This document describes the production onboarding sequence for Localman vendor and rider data. The initial marketplace reset and Batch 1-3 vendor onboarding are complete, but the same workflow applies to future batches.

## Pre-Onboarding Checklist

Before onboarding a production batch:

1. Commit and review current code changes.
2. Run database backup when the batch or deployment risk warrants it.
3. Archive the raw workbook unchanged.
4. Transform production vendor data into the Localman CSV contract.
5. Generate the validation and audit reports.
6. Resolve every FAIL row.
7. Manually approve WARNING rows.
8. Confirm the import operator, approved CSV, and expected counts.

## Vendor Onboarding

Recommended vendor onboarding path:

1. Collect raw vendor data.
2. Normalize business name, area, address, phone, coordinates, hours, categories, dishes, and images according to the production import standard.
3. Convert to Localman CSV template.
4. Run preview validation.
5. Resolve blockers.
6. Review warnings.
7. Import approved rows.
8. Upload missing media where needed.
9. Run post-import validation.
10. Record the batch in `docs/PRODUCTION_IMPORT_HISTORY.md`.

## Rider Onboarding

Rider onboarding can happen through:

- admin rider management
- rider application review

Production rider records must preserve privacy boundaries:

- verified riders can become visible
- unverified riders should remain hidden
- phone and WhatsApp values stay server-side/private
- public suggestion cards expose only safe rider fields
- full plate values are not public

## Validation Workflow

For vendor data, validate:

- vendor count
- unique phones
- canonical or warning areas
- coordinates present and parseable
- at least one operating day
- featured dishes present
- category valid
- image warnings understood
- generated slugs reviewed

For riders, validate:

- names
- phone and WhatsApp values
- vehicle type
- plate and masked plate
- operating days/windows
- verification status
- visibility status

## Smoke Test Workflow

After import:

1. Open public app in default Wuse mode.
2. Test selected areas: Wuse, Jabi, Garki, Maitama, Lugbe.
3. Test GPS mode.
4. Test radius filters: 1 km, 5 km, 10 km, 30 km.
5. Search common terms such as rice, beans, grill, and suya.
6. Open vendor details.
7. Check map markers and selected vendor card.
8. Check call and directions actions.
9. Submit a test rating only if test data is acceptable for that environment.
10. Test Rider Connect handoff with approved production riders.
11. Review admin analytics and logs.
12. Verify PWA launch and offline fallback.

## Launch Readiness

Launch only after:

- reset verification passes
- production vendors import cleanly
- production riders are reviewed
- public discovery works across GPS, selected-area, and default-Wuse modes
- map renders
- Rider Connect works
- ratings work
- admin analytics and logs load
- no console or hydration errors are observed in smoke testing
