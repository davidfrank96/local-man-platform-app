# Master Release Gate

This checklist is the required validation process before production deployment, production data import, major feature release, or architecture change.

The gate is read-only unless a separate fix task is explicitly approved. Do not import data, execute migrations, reset the marketplace, or modify production records while running this gate.

## Verdicts

- `GREEN`: safe to release or import.
- `YELLOW`: release or import is possible with documented non-blocking warnings.
- `RED`: do not release or import until blockers are fixed and the gate is rerun.

## 1. Repository Health

Check:

- current branch
- staged changes
- unstaged changes
- untracked files
- merge conflicts
- whitespace or broken patch issues

Commands:

```bash
git status --short
git diff --check
```

Block on merge conflicts or broken diffs.

## 2. Static Validation

Commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

Block on lint, typecheck, test, build, or database check failures.

## 3. Database Health

Verify marketplace tables:

- `vendors`
- `vendor_hours`
- `vendor_images`
- `vendor_featured_dishes`
- `vendor_category_map`
- `ratings`
- `rating_signal_selections`
- `riders`
- `rider_contact_intents`
- `rider_unavailable_reports`
- `user_events`
- `operational_events`

Verify retained infrastructure tables:

- `admin_users`
- `vendor_categories`
- `rating_signal_options`
- `app_schema_migrations`

Block on migration drift, orphaned records, missing infrastructure rows, or foreign-key integrity failures.

## 4. Discovery Validation

Verify:

- GPS discovery
- selected-area discovery
- default Wuse discovery
- nearby API parameters
- radius behavior for 1 km, 5 km, 10 km, and 30 km
- selected-area and default-Wuse map origins
- complete matching dataset is built before card pagination
- map vendor count equals the complete matching dataset
- card list is paginated without limiting map vendors

Discovery priority must remain:

1. GPS
2. Selected area
3. Default Wuse

Discovery scaling contract must remain:

```text
Radius
↓
All Matching Vendors
↓
Map = All
Cards = Paginated
```

Normal ranking must remain:

1. Open
2. Distance
3. Popularity
4. Stable tie-breakers

## 5. Search And Category Validation

Verify:

- vendor-name search
- featured-dish search
- category search
- category filters
- clear-search restoration
- search runs against the complete matching dataset before pagination
- category filters run against the complete matching dataset before pagination
- search and category result maps include all matching vendors, not only the current card page

Search ranking must remain:

1. Open
2. Distance
3. Relevance
4. Popularity
5. Stable tie-breakers

Multi-category vendors must appear under every valid assigned category.

## 6. Map Validation

Verify on desktop and mobile:

- MapLibre loads
- fallback map state works when needed
- markers render
- selected marker matches selected card
- selected vendor camera movement targets the selected vendor coordinates
- camera and marker coordinates use `[longitude, latitude]`
- dense markers remain tappable
- selected markers do not get intercepted by neighboring marker hitboxes
- cluster source receives all matching vendors
- loading more card vendors does not remove or add map vendors except through a true discovery filter change

Block if card selection, marker selection, or camera target references the wrong vendor.

## 7. Hours Validation

Canonical day mapping is:

- `0 = Sunday`
- `1 = Monday`
- `2 = Tuesday`
- `3 = Wednesday`
- `4 = Thursday`
- `5 = Friday`
- `6 = Saturday`

Verify:

- open vendors
- closed vendors
- closed days
- overnight or suspicious ranges
- active-hours display
- open-now badge
- ranking open-status inputs

Blank open and blank close means a closed day in the current importer.

## 8. Import Pipeline Validation

Verify:

- phone validation and callable storage normalization
- slug preservation when supplied
- slug generation when missing
- category preservation through `category_1` to `category_6`
- duplicate category prevention
- featured dishes through `dish_1_*`, `dish_2_*`, and `dish_3_*`
- image-optional workflow
- area normalization and unknown-area warnings
- CSV escaping and stable column counts

Block on invalid phone, invalid coordinates, no valid category, missing vendor name, missing all featured dishes, or incomplete hours pairs.

## 9. Admin Validation

Verify:

- vendor management
- rider management
- CSV intake and review modal
- analytics
- audit logs
- operational logs

Block on runtime errors or broken admin navigation.

## 10. PWA Validation

Verify:

- service worker registration
- stale chunk recovery
- offline fallback
- static shell caching only
- dynamic marketplace, rider, rating, search, and admin APIs are not cached

Block on refresh loops, stale shell loops, or cached dynamic marketplace data.

## 11. Production Data Validation

For imports, verify:

- vendor count
- category mapping count
- phone count
- unique slugs
- coordinates
- governed or warning areas
- hours rows
- featured dish rows

Block on duplicate slugs, invalid phones, invalid coordinates, or missing required fields.

## 12. Post-Import Validation

After any import, verify:

- database counts match approved CSV expectations
- vendor profiles load
- discovery works in default Wuse, selected-area, and GPS modes
- search works by name, category, and dish
- map marker selection matches cards
- hours display correctly
- admin pages load imported vendors

Record the final result in `docs/PRODUCTION_IMPORT_HISTORY.md`.
