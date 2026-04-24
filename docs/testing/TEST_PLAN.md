## Title
The Local Man — Test Plan

## Test Goal
Ensure the foundation, runtime data flow, admin operations, and public discovery surface are coherent before launch hardening.

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

### Public Discovery Logic
Test:
- public nearby API client sends location, radius, search, category, price, and open-now filters
- call links normalize phone numbers
- directions links target Google Maps coordinates
- categories route returns public category summaries
- vendor detail route transforms Supabase nested rows into the documented detail shape
- public UI shows runtime errors when Supabase data is unavailable

Current automated coverage:
- `tests/public-api-client.test.ts`
- `tests/public-routes.test.ts`

### Admin Foundation Logic
Test:
- missing admin bearer token returns `UNAUTHORIZED`
- authenticated non-admin user returns `FORBIDDEN`
- authenticated admin user is accepted
- admin session validation route returns the authenticated admin identity
- vendor listing supports pagination and filters
- vendor create writes audit log
- vendor update writes audit log
- vendor soft-delete writes audit log
- vendor hours replacement writes audit log
- vendor image upload writes audit log
- vendor image list and removal work against the same admin surface
- vendor featured dish insertion writes audit log
- empty image and dish arrays are rejected
- invalid image type and oversize uploads are rejected before storage writes
- malformed Supabase payloads return controlled `UPSTREAM_ERROR` responses

Current automated coverage:
- `tests/admin-auth.test.ts`
- `tests/admin-session-client.test.ts`
- `tests/admin-vendor-routes.test.ts`
- `tests/admin-vendor-subresources.test.ts`
- `tests/admin-api-client.test.ts`

Manual admin UI smoke coverage:
- open `/admin` and confirm redirect to `/admin/login`
- sign in with an email/password account that exists in `admin_users`
- open `/admin/vendors`
- open `/admin/vendors/new`
- open `/admin/vendors/[id]` with a valid vendor id
- load vendors
- create a vendor with Abuja coordinates
- update the selected vendor
- add one set of seven day hours
- upload one image file and verify it appears in the current image list
- remove the uploaded image and confirm the list updates
- add one featured dish
- deactivate the selected vendor with confirmation
- log out and confirm return to `/admin/login`
- verify each action returns a visible status message

### Vendor Display Logic
Test:
- missing image fallback
- no rating fallback
- no hours fallback
- explicit missing-data copy for area, phone, address, and featured dishes

### Admin Data Quality
Test:
- invalid coordinates
- duplicate slugs
- invalid hours
- unsupported image type
