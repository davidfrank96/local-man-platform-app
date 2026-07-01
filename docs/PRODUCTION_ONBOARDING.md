# Production Onboarding

This document describes the production onboarding sequence for Localman vendor and rider data. The initial marketplace reset and early vendor onboarding are complete. All future vendor batches must follow the permanent production onboarding workflow in `docs/PRODUCTION_IMPORT_STANDARD.md`.

Vendor onboarding workflow version: `v1.0`

This replaces prior ad-hoc onboarding. No production vendor import may skip any required phase.

## Pre-Onboarding Checklist

Before onboarding a production batch:

1. Commit and review current code changes.
2. Run database backup when the batch or deployment risk warrants it.
3. Archive the raw workbook unchanged.
4. Complete source validation.
5. Complete data normalization.
6. Complete governance review.
7. Complete coordinate validation.
8. Complete duplicate coordinate audit.
9. Complete description review.
10. Generate the import package.
11. Run the release gate.
12. Confirm the import operator, approved CSV, and expected counts.

## Vendor Onboarding

Recommended vendor onboarding path:

1. Collect raw vendor data.
2. Validate source workbook integrity.
3. Normalize only approved fields: phones, governance areas, category fields, hours formatting, and slugs.
4. Run governance review for unknown or ambiguous areas.
5. Validate area, address, and coordinates together.
6. Run the mandatory duplicate coordinate audit.
7. Review vendor and dish descriptions.
8. Convert to the Localman CSV template only after blockers are resolved.
9. Generate CSV, audit report, validation report, excluded vendors report, coordinate review package, release gate, and quality score.
10. Import approved rows only.
11. Run post-import validation.
12. Run post-import duplicate coordinate audit and produce approved/review/revisit packages if needed.
13. Record the batch in `docs/PRODUCTION_IMPORT_HISTORY.md`.
14. Update the production baseline and approved override register when verified production changes become baseline.

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
- coordinates present, parseable, inside Abuja/FCT, plausible for area, and not duplicate placeholders
- at least one operating day
- featured dishes present
- category valid
- image warnings understood
- generated slugs reviewed
- duplicate coordinate groups classified
- descriptions reviewed
- quality score assigned

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
13. Run duplicate coordinate audit against production.
14. Confirm map clusters and selected vendor behavior remain valid.
15. Update import history.
16. Update the production baseline and override register when the batch is certified.

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
- production baseline and approved override documentation is current
