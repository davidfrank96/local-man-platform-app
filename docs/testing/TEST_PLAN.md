## Title
The Local Man — Test Plan

## Test Goal
Ensure the runtime, admin operations, public discovery surface, and Phase 5 UX polish remain coherent before commit, deployment, or pilot use.

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
- location retry after denied or unavailable
- resolved precise location trust messaging
- human-readable reverse location display when available
- coordinate fallback when reverse lookup fails
- no nearby vendors
- incorrect coordinates
- distance calculation accuracy
- nearby radius filtering
- nearest-first vendor ordering
- browser geolocation success
- IP approximation fallback
- Abuja default city fallback
- approximate location messaging stays approximate and never implies exact nearby accuracy
- default-city fallback does not claim to be the user’s exact location
- denied and unavailable states do not print raw fallback chains to users

Current automated coverage:
- `tests/distance.test.ts`
- `tests/location-acquisition.test.ts`
- `tests/location-display.test.ts`
- `tests/reverse-geocode.test.ts`

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
- vendor cards always render required fields
- `Today:` hours stay visible before and after card selection
- distance and open/closed state stay visible before and after card selection
- selected vendor highlight remains readable
- selected vendor preview exposes `View details`, `Call`, and `Directions`
- browser back restores discovery state
- `Back to map` restores discovery state
- restored discovery state keeps search and filter controls usable without manual reload
- small-phone and tablet layouts remain stable
- time-based morning, afternoon, and night themes do not compromise card readability
- public shell applies the correct browser-local theme attribute for morning, afternoon, and night
- uploaded vendor images appear on vendor detail pages

Current automated coverage:
- `tests/public-api-client.test.ts`
- `tests/public-routes.test.ts`
- `tests/e2e/app-smoke.spec.ts`
- `tests/e2e/layout-stress.spec.ts`

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
- vendor image list normalizes storage-path-only rows into browser-loadable public URLs
- vendor hours can be loaded into the admin edit form before replacement
- vendor featured dishes can be loaded for the selected vendor before adding more
- vendor featured dish insertion writes audit log
- vendor featured dish removal writes audit log and updates the selected-vendor edit surface
- name updates do not silently change the vendor slug
- base vendor creation requires explicit acknowledgement when hours, featured dishes, or images are still missing
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
- open `/admin/vendors` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/vendors/new` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/vendors/[id]` and confirm the protected route still resolves to the admin login gate when signed out
- sign in with an email/password account that exists in `admin_users`
- open `/admin/vendors`
- open `/admin/vendors/new`
- open `/admin/vendors/[id]` with a valid vendor id
- load vendors
- confirm the dashboard overview cards show vendor totals and missing-data counts
- confirm the registry shows completeness badges for missing hours, images, and featured dishes
- confirm the create vendor page shows:
  - basic details
  - opening hours
  - featured dishes
  - vendor images
  - review and create
- create a vendor with Abuja coordinates
- confirm the incomplete-data acknowledgements must be checked before base vendor creation
- confirm hours, dishes, and image can be provided during create flow
- confirm partial failures identify the failed create sub-step
- update the selected vendor
- add one set of seven day hours
- confirm the current hours render in the edit form before saving changes
- save edited hours and confirm a visible success message appears
- upload one image file and verify it appears in the current image list
- confirm a local preview appears before upload
- confirm a visible success message appears after image upload
- remove the uploaded image and confirm the list updates
- add one featured dish
- confirm the featured dish list updates for the same selected vendor without a manual reload
- remove the featured dish and confirm the list updates without a manual reload
- deactivate the selected vendor with confirmation
- log out and confirm return to `/admin/login`
- verify each action returns a visible status message

Public detail follow-up after admin edits:
- open the public vendor detail page for the edited vendor
- confirm updated hours appear without waiting for a manual cache refresh
- confirm a real uploaded image is preferred over a seed placeholder when one exists

### Vendor Display Logic
Test:
- missing image fallback
- no rating fallback
- no hours fallback
- explicit missing-data copy for area, phone, address, and featured dishes
- compact price-band labels
- `New` fallback for unrated vendors
- selected-card readability in all time themes
- selected state does not change open/closed data

### Admin Data Quality
Test:
- invalid coordinates
- duplicate slugs
- invalid hours
- unsupported image type
