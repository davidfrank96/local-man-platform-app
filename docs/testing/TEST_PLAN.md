## Title
The Local Man — Test Plan

## Phase 1 Test Goal
Ensure the foundation is coherent before feature implementation begins.

## Documentation Validation
Check:
- PRD and architecture do not conflict
- schema supports user stories
- API spec matches schema intent
- UI rules match product scope
- roadmap sequence makes sense

## Critical Logic
### Open Now Logic
Test:
- same-day schedules
- overnight schedules
- closed days
- manual overrides

### Location Logic
Test:
- location allowed
- location denied
- no nearby vendors
- incorrect coordinates
- distance calculation accuracy
- nearby radius filtering
- nearest-first vendor ordering
- browser geolocation success
- IP approximation fallback
- Abuja default city fallback

Current automated coverage:
- `tests/distance.test.ts`
- `tests/location-acquisition.test.ts`

Runtime smoke coverage:
- `npm run smoke:nearby`
- Requires real Supabase env vars and seeded Abuja data.
- Validates the `/api/vendors/nearby` response shape, non-empty vendor results, computed `distance_km`, nearest-first ordering, radius filtering, invalid coordinate rejection, partial coordinate rejection, and Abuja fallback behavior.

### Admin Foundation Logic
Test:
- missing admin bearer token returns `UNAUTHORIZED`
- authenticated non-admin user returns `FORBIDDEN`
- authenticated admin user is accepted
- vendor listing supports pagination and filters
- vendor create writes audit log
- vendor update writes audit log
- vendor soft-delete writes audit log
- vendor hours replacement writes audit log
- vendor image metadata insertion writes audit log
- vendor featured dish insertion writes audit log
- empty image and dish arrays are rejected
- malformed Supabase payloads return controlled `UPSTREAM_ERROR` responses

Current automated coverage:
- `tests/admin-auth.test.ts`
- `tests/admin-vendor-routes.test.ts`
- `tests/admin-vendor-subresources.test.ts`

### Vendor Display Logic
Test:
- missing image fallback
- no rating fallback
- no hours fallback

### Admin Data Quality
Test:
- invalid coordinates
- duplicate slugs
- invalid hours
- unsupported image type
