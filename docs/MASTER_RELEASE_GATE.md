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

The worktree should be clean for a final deploy gate. If intentional release changes are present, list them explicitly and treat the gate as pre-commit until they are reviewed and staged.

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

Card pagination contract:

- default page size is 25
- maximum page size is 50
- Load More appends without duplicates or skipped vendors
- pagination resets only when radius, area, search, category, price, or open-now filter changes
- pagination never changes map vendors, clustering, search scope, or ranking

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
- cluster bubbles display counts only
- unclustered vendors display storefront markers
- selected vendor overlay remains topmost and visible
- same-location selector works for duplicate coordinate groups
- cluster expansion does not select a vendor
- card click wins over cluster state
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

For vendor onboarding batches, confirm `docs/PRODUCTION_IMPORT_STANDARD.md` v1.0 was completed before import.

Verify:

- source validation report exists
- governance review exists and unknown areas were not silently remapped
- coordinate validation checked area, address, latitude, and longitude together
- duplicate coordinate audit and coordinate review package exist
- description review exists
- excluded vendors report exists
- quality score is prepared
- phone validation and callable storage normalization
- slug preservation when supplied
- slug generation when missing
- category preservation through `category_1` to `category_6`
- duplicate category prevention
- featured dishes through `dish_1_*`, `dish_2_*`, and `dish_3_*`
- image-optional workflow
- area normalization and unknown-area warnings
- CSV escaping and stable column counts

Block on skipped onboarding phases, invalid phone, invalid coordinates, unreviewed coordinate duplicates, no valid category, missing vendor name, missing all featured dishes, or incomplete hours pairs.

## 9. Admin Validation

Verify:

- Admin Shell v2 visual alignment across authentication, dashboard, vendor workspace, create vendor, Rider Connect, analytics, activity, logs, and team access
- desktop, tablet, and mobile admin layouts have no horizontal overflow, clipped controls, overlapping cards, or hidden critical actions
- admin login persistent protection evaluates before Supabase password grant
- login success still sets HttpOnly admin cookies
- invalid login attempts create persisted security events
- repeated failures trigger progressive delay and temporary cooldown
- IP, account, and IP+account login protection scopes remain independent
- governed admin sessions are created on login
- idle timeout and absolute timeout clear cookies and require re-authentication
- session refresh preserves rotated Supabase tokens and updates session inventory
- logout marks the current governed session logged out
- forced logout helpers can revoke current, specific, or all sessions
- forgot password returns generic success and never enumerates admin emails
- reset password uses Supabase recovery tokens only and revokes all governed sessions after success
- change password verifies current password through Supabase Auth and revokes other governed sessions
- password policy remains centralized and enforced by reset/change routes
- password audit events contain no raw passwords, reset tokens, access tokens, or refresh tokens
- cookie-backed admin sessions cannot authenticate after revocation
- login, forgot password, reset password, and change password share the Authentication Experience System
- password visibility toggles and password strength display work without changing backend validation
- reset password valid-link, invalid-link, and expired-link states render without hydration warnings
- authentication pages keep operational warnings, migration warnings, validation errors, rate-limit errors, and password/session errors visible
- authentication UI changes do not alter API routes, Supabase Auth calls, session governance, login protection, audit logging, or password policy
- vendor management
- rider management
- CSV intake and review modal
- analytics
- audit logs
- operational logs
- dashboard cards use database totals rather than loaded-page counts
- vendor registry remains paginated and displays total-count metadata
- edit workspace remounts or resets on selected vendor id change
- image upload targets the current selected vendor id
- save path submits the current selected vendor identity
- Rider Connect manual intake is visible by default and does not require an `Add Rider` pre-step
- Rider Connect duplicate phone/WhatsApp conflicts remain visible and do not create duplicate profiles
- Rider Connect verification, visibility, consent, structured availability, contact counts, and unavailable-report counts remain reviewable
- operational telemetry, audit logging, structured logging, runtime diagnostics, security monitoring, migration warnings, and database consistency warnings remain visible and non-blocking where designed
- visual redesigns must not disable or suppress authentication errors, validation errors, rate-limit errors, session errors, warning banners, status indicators, developer diagnostics, or production-safe error reporting

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
- no unapproved coordinate corrections were applied
- no production import skipped the duplicate-coordinate audit
- no governance value was silently remapped
- no category, phone, coordinate, featured dish, or hours data was silently overwritten

Block on duplicate slugs, invalid phones, invalid coordinates, or missing required fields.

For Production Data v1.0 and later, certification must respect approved production overrides:

```text
Original Workbook
or
Approved Production Override
-> Certified Baseline
```

Do not fail a release gate only because production intentionally differs from a historical workbook. First classify the difference as:

- `SOURCE_MATCH`
- `APPROVED_PRODUCTION_OVERRIDE`
- `UNEXPECTED_CHANGE`

Block on `UNEXPECTED_CHANGE`, missing approval evidence, rejected overrides, pending-review rows used as certification evidence, or unreviewed production-data risk.

## 12. Post-Import Validation

After any import, verify:

- database counts match approved CSV expectations
- vendor profiles load
- discovery works in default Wuse, selected-area, and GPS modes
- search works by name, category, and dish
- map marker selection matches cards
- hours display correctly
- admin pages load imported vendors
- post-import duplicate coordinate audit completed
- approved/review/revisit coordinate packages created when duplicate groups remain
- final quality score assigned

Record the final result in `docs/PRODUCTION_IMPORT_HISTORY.md`.

## 13. Performance Validation

Measure or smoke-test:

- discovery request latency
- search latency
- map render and cluster render
- Load More response time
- selected vendor camera movement

Validate at current production scale and with regression fixtures for 100, 500, and 1000 vendors when available. Block on severe regressions that make the public discovery flow unusable.

## 14. Permanent Regression Locks

Before a deployment or import, verify `docs/PERMANENT_REGRESSION_LOCKS.md` still matches the implemented behavior for:

- discovery dataset ownership
- search before pagination
- map all-vendor clustering
- admin database totals
- admin edit-state reset
- import governance and coordinate review
- duplicate coordinate audit and human approval
- approved production override policy
