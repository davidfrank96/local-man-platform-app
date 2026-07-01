# Localman Codex Operating Guidelines

These rules apply to future Codex work on Localman production data, onboarding, admin tooling, discovery, search, and map behavior.

## Production Data Rules

1. Never treat production differences as automatic errors.
2. Always investigate before correcting.
3. Never overwrite phone, coordinates, governance, vendor identity, or hours without verification.
4. If production differs from a workbook, classify the difference as `SOURCE_ERROR`, `APPROVED_OVERRIDE`, or `UNEXPECTED_CHANGE`.
5. Never guess vendor identity, phone values, coordinates, hours, local food names, categories, or descriptions.

## Source Model

- Production is the operational source of truth after Production Data v1.0 closeout.
- Original onboarding workbooks remain historical source documents.
- Approved production overrides are recorded in `docs/PRODUCTION_CHANGELOG.md`.
- Certification passes when production matches the source workbook or an approved production override.
- Certification fails on `UNEXPECTED_CHANGE`.

## Safe Work Boundaries

Before modifying production-adjacent code or data artifacts:

- read `docs/ARCHITECTURE.md`
- read `docs/PERMANENT_REGRESSION_LOCKS.md`
- read `docs/PRODUCTION_OVERRIDE_POLICY.md`
- read the relevant import, discovery, map, admin, or release-gate document

Never execute SQL, import data, reset marketplace data, or update production records unless the user explicitly approves that production operation.

## Import And Onboarding Rules

- Do not import raw workbooks directly.
- Do not silently remap governance areas.
- Do not silently correct coordinates.
- Do not drop categories, featured dishes, phones, addresses, or local food terms.
- Create review packages before applying corrections.
- Record completed batches in `docs/PRODUCTION_IMPORT_HISTORY.md`.
- Record approved production overrides in `docs/PRODUCTION_CHANGELOG.md`.

## Public Runtime Locks

Do not change these without an explicit architecture task and release gate:

- discovery origin priority: GPS, selected area, default Wuse
- radius determines the complete matching dataset
- search runs before pagination
- ranking runs before pagination
- map receives all matching vendors
- cards are paginated
- clustering is rendering-only
- card click wins over cluster state
- selected vendor id is the single source of truth

## Admin Locks

- Dashboard metrics use database totals, not loaded-page counts.
- Vendor registry remains paginated.
- Edit workspace state resets when selected vendor id changes.
- Image uploads and save actions must target the current selected vendor id.

## Local Food Protection

Use `docs/LOCALMAN_FOOD_DICTIONARY.md` before editing food names. Protected local food terms must not be rewritten unless a human reviewer explicitly approves the correction.
