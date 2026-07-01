# Permanent Regression Locks

This document records Localman behavior that must not regress without an explicit architecture decision, implementation review, and release gate.

## Discovery

- Radius determines the complete matching dataset.
- Discovery origin priority remains GPS, then selected area, then default Wuse.
- Search runs before pagination.
- Ranking runs before pagination.
- Map receives all matching vendors through `map_vendors`.
- Cards receive only the paginated `vendors` subset.
- Pagination never changes discovery, search, ranking, clustering, marker availability, or selected vendor identity.
- Default card page size is 25. Maximum card page size is 50.
- Load More appends without duplicate vendors or skipped vendors.

## Search

- Public search runs against the active full discovery dataset, not the current card page.
- Public search does not query the entire vendor database outside the active discovery radius.
- Vendor name, category assignments, descriptions, and featured dishes remain searchable where supported by the current search implementation.
- Multi-category vendors must remain visible under every valid `vendor_category_map` assignment.
- Search ranking remains open, distance, relevance, popularity, then stable tie-breakers.

## Map

- MapLibre native clustering is the production density strategy when the configured map style loads.
- Clusters display vendor counts only.
- Unclustered vendors display storefront markers.
- The selected vendor overlay is independent of the clustered source.
- Card click always wins over cluster state.
- Cluster taps expand the cluster and do not select a vendor.
- Same-location selector remains available for vendors sharing exact coordinates.
- Mobile camera offsets must keep selected markers visible above card or sheet UI.
- Card pagination must never remove vendors from the map source.

## Import Pipeline

- Production imports must follow `docs/IMPORT_PIPELINE.md` and `docs/PRODUCTION_IMPORT_STANDARD.md`.
- `category_1` through `category_6` must be preserved and mapped without category loss.
- `dish_1` through `dish_3` data must be preserved when supplied.
- Phone validation must preserve source values in review artifacts and store accepted values in canonical callable format.
- Governance validation must not silently remap unknown areas.
- Coordinate validation must compare area, address, latitude, and longitude together.
- Duplicate coordinate audit is mandatory before import and immediately after import.
- Suspicious hours and overnight ranges require review.
- CSV safety checks must reject malformed rows, embedded newline risk, duplicate unresolved slugs, coordinate loss, and category loss.

## Admin

- Admin login protection is persistent and distributed through `admin_login_security_events`.
- Admin login protection must evaluate IP, account, and IP+account scopes before the Supabase password grant.
- Admin login must not fall back to process-local memory rate limiting.
- Cookie-backed admin sessions must use `admin_sessions` for inventory, idle timeout, absolute timeout, activity tracking, and revocation.
- Admin session activity updates must remain throttled and must not write to the database on every request.
- Admin logout must clear cookies and mark the current governed session logged out when a session id is present.
- Forgot password must use Supabase Auth recovery and return generic success without account enumeration.
- Reset password must consume Supabase recovery sessions only; Localman must not create or store reset tokens.
- Successful password reset must revoke all governed sessions for the auth user.
- Change password must require an authenticated admin, verify current password through Supabase Auth, and revoke other governed sessions.
- Password policy must stay centralized in `lib/admin/password-policy.ts`.
- Password audit events must not log raw passwords, recovery tokens, access tokens, refresh tokens, or service-role keys.
- Login, forgot password, reset password, and change password must use the shared Authentication Experience System unless an explicit architecture decision replaces it.
- Authentication UI changes must not modify login protection, session governance, Supabase Auth calls, API routes, password policy, audit logging, or database consistency monitoring.
- Reset-password pages must keep server and first client render identical; browser recovery-link hash parsing must remain post-hydration.
- Authentication pages must not read `window`, `document`, `location`, `localStorage`, `sessionStorage`, or `navigator` during initial render.
- Authentication error states, rate-limit states, migration warnings, operational warnings, and development diagnostics must remain visible.
- Dashboard cards use database aggregate totals, not loaded-page counts.
- Vendor registry remains paginated and displays total-count metadata.
- Admin analytics use aggregate queries or RPCs rather than fetching all vendors for counts.
- Edit workspace remounts or fully resets when selected vendor id changes.
- Image uploads use the current selected vendor id.
- Save paths use the current selected vendor identity and must not submit stale vendor data.

## Coordinates

- Coordinates are production trust data.
- Duplicate coordinate audits are required for every vendor batch.
- Geocoding candidates are review artifacts, not automatic updates.
- Coordinate updates require human approval.
- Approved update scripts must target vendor id or slug and include old latitude and longitude guards.
- Production discovery, search, map, or import code must not silently correct coordinates.

## Production Overrides

- Production Data v1.0 is the operational source of truth after hardening closeout.
- Original onboarding workbooks remain historical source documents.
- Approved production overrides must be recorded in `docs/PRODUCTION_CHANGELOG.md`.
- Future certifications classify checked fields as `SOURCE_MATCH`, `APPROVED_PRODUCTION_OVERRIDE`, or `UNEXPECTED_CHANGE`.
- Approved overrides must never be treated as failures.
- Pending, rejected, or undocumented changes must not be used to pass certification.

## Codex And Operator Rules

- Never treat production differences as automatic errors.
- Always investigate before correcting.
- Never overwrite phone, coordinates, governance, vendor identity, or hours without verification.
- If production differs from workbook, determine whether it is `SOURCE_ERROR`, `APPROVED_OVERRIDE`, or `UNEXPECTED_CHANGE`.
- Never guess vendor identity, local food names, coordinates, phones, or hours.

## Release Gate Enforcement

Every master release gate must run:

- repository health checks
- lint
- typecheck
- test suite
- build
- database migration check
- diff whitespace check
- discovery, search, map, admin, import, performance, and mobile smoke validation

A `GREEN` verdict requires all blockers resolved, no migration mismatch, no unreviewed production-data risk, and no `UNEXPECTED_CHANGE` in certified production data. `YELLOW` is allowed only for documented non-blocking warnings. `RED` blocks deployment.
