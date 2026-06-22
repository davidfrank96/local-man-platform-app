# Production Onboarding

This document describes the recommended production onboarding sequence after marketplace reset.

## Pre-Onboarding Checklist

Before onboarding production data:

1. Commit and review current code changes.
2. Run database backup.
3. Run marketplace reset dry run.
4. Review disposable table counts and storage candidates.
5. Execute reset only after explicit approval.
6. Validate empty marketplace state.
7. Transform production vendor data into Localman CSV.
8. Validate the CSV.

## Vendor Onboarding

Recommended vendor onboarding path:

1. Collect raw vendor data.
2. Normalize business name, area, address, phone, coordinates, hours, category, dishes, and images.
3. Convert to Localman CSV template.
4. Run preview validation.
5. Resolve blockers.
6. Review warnings.
7. Import valid rows.
8. Upload missing media where needed.
9. Smoke test public vendor cards and profiles.

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
