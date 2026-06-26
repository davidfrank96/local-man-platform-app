# Operations Runbook

This runbook describes Localman production operations for marketplace reset, production onboarding, vendor imports, post-import validation, and release gates.

## Marketplace Reset

Marketplace reset exists to clear disposable marketplace records while retaining infrastructure.

Disposable data includes:

- vendors
- vendor hours
- vendor images metadata
- featured dishes
- vendor category mappings
- ratings and rating signal selections
- riders
- rider contact intents
- rider unavailable reports
- user events
- operational events
- disposable vendor image storage objects

Retained infrastructure includes:

- schema
- migrations
- RLS and policies
- functions
- storage bucket configuration
- environment configuration
- `admin_users`
- `vendor_categories`
- `rating_signal_options`
- `app_schema_migrations`

Dry run:

```bash
npm run marketplace:reset -- --dry-run
```

Execute mode requires explicit confirmation and should only run after backup and operator approval:

```bash
npm run marketplace:reset -- --execute --confirm-marketplace-reset
```

Do not run execute mode as part of normal documentation, validation, or release-gate tasks.

## Production Onboarding

Production vendor onboarding must follow this workflow:

Workflow version: `v1.0`

```text
Raw workbook
-> source validation
-> data normalization
-> governance review
-> coordinate validation
-> duplicate coordinate audit
-> description review
-> import package
-> release gate
-> import
-> post-import validation
-> post-import quality audit
-> quality score
-> import history update
```

Never import a raw field-collection workbook directly. Never skip a phase in `docs/PRODUCTION_IMPORT_STANDARD.md`.

## Vendor Imports

Before import:

1. Archive the raw workbook unchanged.
2. Complete source validation.
3. Normalize only approved fields: phones, governance areas, categories, hours formatting, and slugs.
4. Complete governance review without silent remaps.
5. Complete coordinate validation against area, address, and Abuja/FCT bounds.
6. Complete duplicate coordinate audit and coordinate review packaging.
7. Complete description review.
8. Generate CSV, audit report, validation report, excluded vendors report, release gate, and quality score.
9. Resolve every FAIL row.
10. Manually approve WARNING and REVIEW rows.
11. Confirm expected vendor, category, hours, and featured-dish counts.

Import rules are defined in `docs/PRODUCTION_IMPORT_STANDARD.md` and `docs/IMPORT_PIPELINE.md`.

After import:

1. Confirm database counts.
2. Confirm slugs are unique.
3. Confirm categories are preserved through `vendor_category_map`.
4. Confirm hours and closed days display correctly.
5. Confirm discovery, search, map, vendor profiles, and admin pages work.
6. Run the post-import duplicate coordinate audit.
7. Create approved/review/revisit coordinate packages when duplicate groups remain.
8. Record quality score and release verdict.
9. Record the batch in `docs/PRODUCTION_IMPORT_HISTORY.md`.

## Rider Imports

Rider onboarding must preserve Rider Connect privacy boundaries:

- only verified, visible, currently available riders can be suggested
- public cards must not expose full phone, WhatsApp values, internal notes, or full plate values
- WhatsApp handoff must happen after the contact intent flow

## Post-Import Validation

Validate:

- default Wuse discovery
- selected-area discovery
- GPS discovery
- search by vendor name, category, and featured dish
- radius filters
- category filters
- map marker/card/camera sync
- vendor profile routes
- call and directions actions
- active hours and open/closed status
- admin vendor management and analytics

## Release Gates

Run the master release gate before:

- production deployment
- production data import
- marketplace reset execution
- major feature release
- architecture change

Use `docs/MASTER_RELEASE_GATE.md` as the canonical release-gate checklist.

## Documentation Updates

Update documentation when:

- import rules change
- governance areas change
- discovery behavior changes
- reset scope changes
- release-gate checks change
- a production batch is imported
