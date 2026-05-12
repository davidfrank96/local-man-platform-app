## Title
The Local Man — API Specification

## API Principles
- keep endpoints minimal
- separate public read operations from admin write operations
- validate all input
- consistent response structure

## API Foundation
Initial route foundation:
- `lib/api/contracts.ts`
- `lib/api/responses.ts`

The API foundation defines route files, access boundaries, request shapes, response shapes, and validation boundaries. `GET /api/vendors/nearby` includes the Supabase candidate query, dynamic distance calculation, radius filtering, ranking-aware discovery ordering, featured dish summary selection, and compact `today_hours` output. Authenticated admin routes cover vendor create, update, deactivate, sub-resources, and audit-log behavior.

Media model:
- vendor profile images live in `vendor_images`
- `vendor_images.image_url` is the browser-ready public URL used by the public frontend
- `vendor_images.storage_object_path` is the Storage path used for admin upload/delete bookkeeping
- featured dish `image_url` belongs to the individual dish record and is not used as the vendor profile image

## Types and Validation Foundation
Initial shared types and validation schemas:
- `lib/validation/common.ts`
- `lib/validation/schemas.ts`
- `lib/validation/index.ts`
- `types/domain.ts`
- `types/api.ts`

Validation uses Zod schemas for MVP domain records and API boundaries. Types are inferred from those schemas to keep runtime validation and TypeScript contracts aligned.

## Public Endpoints
### GET /api/vendors/nearby
Purpose: fetch nearby vendors based on user coordinates and filters

Route file:
- `app/api/vendors/nearby/route.ts`

Query params:
- lat, optional only when using default city fallback
- lng, optional only when using default city fallback
- location_source: `precise`, `approximate`, or `default_city`
- radius_km
- open_now
- category
- price_band
- search

Returns:
- location metadata used for the search
- vendor_id
- name
- slug
- latitude
- longitude
- distance_km, computed from user coordinates to vendor coordinates
- is_open_now
- one featured dish summary when available: `featured_dish.dish_name` and optional `featured_dish.description`
- `today_hours`, a compact current-day summary such as `9:00 AM - 6:00 PM`, `Closed`, or `Hours not listed`
- summary fields for cards
- `price_band`, `area`, `average_rating`, and `review_count` for compact vendor card display
- `ranking_score` for lightweight usage-signal vendor ranking

Current nearby response does **not** include vendor profile images. Vendor cards do not depend on image payloads from `/api/vendors/nearby`. Vendor images are loaded on the vendor detail route.

Behavior:
- If `lat` and `lng` are provided, both must be valid coordinates.
- If both coordinates are missing, the API falls back to the Abuja default city view.
- If only one coordinate is provided, the API returns `VALIDATION_ERROR`.
- `location_source = precise` means browser/device geolocation.
- `location_source = approximate` means IP-based or other low-accuracy approximation.
- `location_source = default_city` means no user coordinates were available and Abuja was used.
- The frontend discovery flow may call `/api/vendors/nearby` without coordinates first so default-city vendors can render while precise browser geolocation is still resolving, then upgrade to precise or approximate coordinates when they become available.
- Reverse geocoding is a separate best-effort UI concern and does not block or alter the nearby vendor response.
- Candidate vendors are fetched with a latitude/longitude bounding box before precise distance calculation.
- Base candidate filtering for `price_band` is pushed into the Supabase vendor query.
- Base candidate filtering for `category` is pushed into the Supabase vendor query through the `vendor_category_map` join.
- Base candidate filtering for `search` currently matches vendor name, short description, and area in the Supabase vendor query and is rechecked in application logic for safety.
- The Supabase nearby candidate read uses a short `5` second Next revalidation window so discovery can stay bounded without holding vendor edits, deactivations, or hours changes for the older generic `30` second window.
- Client discovery snapshots currently expire after `5` minutes and must yield to a live nearby fetch on restore before they can become authoritative again.
- Admin vendor mutations publish a public discovery invalidation event so restored discovery state is cleared after vendor create, update, deactivate, hours, image, and featured-dish changes.
- Usage-signal ranking is aggregated server-side through the `get_vendor_usage_scores` SQL function instead of fetching raw `user_events` rows into Node.
- If that SQL function is unavailable in a partially migrated environment, the API falls back to a service-role `user_events` read so nearby discovery still responds.
- `distance_km` is calculated dynamically with the Haversine formula.
- Results are filtered by `radius_km` after exact distance calculation.
- Final discovery ordering prioritizes:
  1. vendors that are open now
  2. shorter distance within the same open/closed group
  3. higher `ranking_score` from real usage signals only when vendors are similarly close, currently within about `0.5` km
  4. stable vendor name/id tie-breakers
- Search and category parameters filter the candidate set; they do not add a separate relevance sort that can override open status, distance, or close-distance usage ranking.
- Sponsored/promoted ranking is not implemented.
- Nearby results are capped to the top `50` vendors after filtering and ordering so the map/list payload remains bounded.
- The public map currently renders those vendor results as individual markers when MapLibre is enabled.
- Clustering is disabled in the current release, so the API response does not carry any cluster-specific contract.
- Distance is not stored in the database.
- Search-bearing requests are abuse-protected with a centralized limiter:
  - threshold: `45` requests per `60` seconds per client/IP
  - block window: `2` minutes after exceeding the threshold
  - non-search nearby browsing is not throttled by this route-level limiter
- If the Supabase schema has not been migrated, the API returns `UPSTREAM_ERROR` from the failed Supabase query.

Location response shape:
```json
{
  "location": {
    "source": "precise",
    "label": "Current location",
    "coordinates": {
      "lat": 9.0765,
      "lng": 7.3986
    },
    "isApproximate": false
  }
}
```

Vendor card fields in the nearby response:
```json
{
  "vendor_id": "20000000-0000-4000-8000-000000000008",
  "name": "Jabi Office Lunch Bowl",
  "slug": "jabi-office-lunch-bowl",
  "short_description": "Test lunch bowl vendor with white rice, stew, and native rice.",
  "phone_number": "+2340000000000",
  "area": "Jabi",
  "latitude": 9.0606,
  "longitude": 7.4219,
  "price_band": "standard",
  "average_rating": 0,
  "review_count": 0,
  "ranking_score": 0,
  "distance_km": 3.11,
  "is_open_now": true,
  "featured_dish": {
    "dish_name": "White rice and stew",
    "description": "Lunch bowl with stew."
  },
  "today_hours": "11:00 AM - 3:00 PM"
}
```

### GET /api/vendors/:slug
Purpose: fetch full vendor detail

Route file:
- `app/api/vendors/[slug]/route.ts`

Returns:
- vendor info
- server-computed `is_open_now`
- server-computed `today_hours`
- hours
- categories
- featured dishes
- images with browser-ready public `image_url` values
- rating summary

Behavior:
- Returns `NOT_FOUND` when no active vendor matches the slug.
- Returns `CONFIGURATION_ERROR` when public Supabase env vars are missing.
- Returns `UPSTREAM_ERROR` when the Supabase detail query fails.
- `is_open_now` and `today_hours` are computed on the server from the shared availability helper in `lib/vendors/hours.ts`.
- Public discovery cards, the selected vendor panel, and the detail page also resolve their status labels through that same helper, so a cached boolean cannot contradict the visible `today_hours` window.
- When a `vendor_images` row has `storage_object_path` but no usable `image_url`, the server normalizes it into a public bucket URL before returning the vendor detail payload.
- Missing hours, featured dishes, or images must not cause the detail route to fail.

Detail image shape:
- `images` contains vendor profile image records for that vendor
- public rendering should use the returned browser-ready `image_url`
- storage-backed rows are normalized from `storage_object_path` when needed

### POST /api/vendors/:slug/ratings
Purpose: store a lightweight public vendor rating

Route file:
- `app/api/vendors/[slug]/ratings/route.ts`

Request body:
- `score`: integer from `1` to `5`

Returns:
- resolved `vendor_id`
- updated `rating_summary` with:
  - `average_rating`
  - `review_count`

Behavior:
- no login required for the lightweight public rating flow
- one anonymous browser identity may rate a specific vendor once
- anonymous rating identity is stored in the existing public client cookie and written to the database only as a server-side SHA-256 hash
- validates the vendor slug and rating score
- resolves the active vendor id first, then submits the write through the server-only `submit_public_vendor_rating` RPC
- database-side aggregation owns `vendors.average_rating` and `vendors.review_count`
- the response returns the authoritative post-write summary from the database instead of recalculating scores in Node
- release requires both `supabase/migrations/20260507193000_public_rating_submission_rpc.sql` and `supabase/migrations/20260512003000_public_rating_anonymous_identity.sql` to be applied so the ratings RPC, summary refresh function, anonymous hash column, and vendor/hash unique index exist
- does not support review comments
- abuse protection:
  - threshold: `8` accepted submissions per `10` minutes per client/IP
  - block window: `10` minutes after exceeding the threshold
  - sequential or concurrent duplicate retry submissions for the same vendor/score are collapsed into one upstream write for `60` seconds
- returns `VALIDATION_ERROR` with HTTP `409` when the same anonymous browser identity rates the same vendor again; the response includes the current authoritative `rating_summary` and `duplicate: true`
- returns `NOT_FOUND` when the vendor slug does not resolve to an active vendor
- returns `UPSTREAM_ERROR` when the rating RPC or summary refresh fails

### GET /api/categories
Purpose: fetch filter categories

Route file:
- `app/api/categories/route.ts`

Returns:
- category id
- category name
- category slug

Behavior:
- Returns `CONFIGURATION_ERROR` when public Supabase env vars are missing.
- Returns `UPSTREAM_ERROR` when the Supabase category query fails.

### POST /api/events
Purpose: store lightweight public usage signals

Route file:
- `app/api/events/route.ts`

Tracked events:
- `session_started`
- `first_interaction`
- `last_interaction`
- `vendor_selected`
- `vendor_detail_opened`
- `call_clicked`
- `directions_clicked`
- `search_used`
- `filter_applied`

Behavior:
- accepts lightweight JSON only
- validates event type and optional metadata
- writes to `public.user_events`
- uses server-side credentials only
- returns `202` instead of surfacing public UX failures when tracking is unavailable
- must not block or degrade public interactions
- abuse protection:
  - threshold: `120` accepted requests per `5` minutes per client/IP
  - block window: `2` minutes after exceeding the threshold
  - identical immediate retry payloads are collapsed into one upstream write for `2` seconds so mobile retries and beacon races do not spam `user_events`

## Admin Endpoints
Admin endpoint rules:
- Browser admin requests authenticate through secure same-origin HTTP-only cookies issued by `/api/admin/login`.
- `/api/admin/session` is the central server-side validation and refresh route for that cookie-backed session.
- The underlying auth helper still accepts `Authorization: Bearer <supabase-access-token>` for compatibility and targeted tests.
- Active admin and agent browser flows call protected `/api/admin/**` routes rather than talking to privileged Supabase REST or Storage endpoints directly.
- The authenticated user id must exist in `admin_users`.
- Authentication and admin membership are checked before route business logic runs.
- The admin login UI never reads or persists privileged Supabase access or refresh tokens in browser-visible storage.
- Request params and request bodies are still validated at the route boundary.
- Vendor list, create, update, and delete routes call typed admin vendor service methods.
- Vendor create, update, and delete routes write audit logs.
- Unexpected Supabase response shapes return `UPSTREAM_ERROR` without leaking raw parser failures.

### POST /api/admin/login
Create a cookie-backed admin session

Route file:
- `app/api/admin/login/route.ts`

Behavior:
- validates email/password request shape before auth
- rate limits repeated invalid attempts per IP/email:
  - threshold: `5` attempts per `10` minutes
  - block window: `15` minutes after exceeding the threshold
- returns `TOO_MANY_REQUESTS` with `Retry-After` when the limiter blocks the request

Behavior:
- validates email and password
- exchanges credentials against Supabase Auth server-side
- verifies the authenticated user against `admin_users`
- denies authenticated users who are not explicitly assigned in `admin_users`
- returns the authenticated Supabase user plus the matching `admin_users` record
- sets secure same-origin HTTP-only access and refresh cookies

### POST /api/admin/logout
Clear the current admin session

Route file:
- `app/api/admin/logout/route.ts`

Behavior:
- best-effort logs out the Supabase session upstream when an access cookie exists
- clears the admin access and refresh cookies even if the upstream logout call fails

### GET /api/admin/session
Validate the current admin session

Route file:
- `app/api/admin/session/route.ts`

Behavior:
- validates the current secure cookie-backed session
- refreshes the access cookie server-side when the refresh cookie remains valid
- verifies the Supabase user
- verifies that the authenticated user exists in `admin_users`
- clears the privileged cookies when the authenticated user no longer has an `admin_users` row
- returns the authenticated user and matching admin user record

### GET /api/admin/analytics
Read lightweight internal usage analytics

Route file:
- `app/api/admin/analytics/route.ts`

Query params:
- `range`: `24h`, `7d`, `30d`, or `all`
  - defaults to `7d` when omitted

Returns:
- summary counts
- vendor performance rankings
- drop-off metrics when session-level data is available
- recent events with vendor, device, location source, and timestamp

Behavior:
- requires admin auth
- reads only from `user_events`
- stays read-only
- aggregates server-side through the `get_admin_analytics_snapshot` SQL function
- caches each range in-process for 30 seconds
- limits recent activity to the latest 25 events
- falls back to bounded direct `user_events` reads only when the SQL snapshot path is unavailable
- tolerates empty data
- tolerates historical event rows without `session_id` by returning safe empty session-dropoff metrics

### GET /api/admin/vendors
List vendors

Route file:
- `app/api/admin/vendors/route.ts`

Query params:
- `limit`
- `offset`
- `search`
- `area`
- `is_active`
- `price_band`

Returns:
- vendor summaries
- pagination metadata

Vendor summary fields used by the admin workspace include:
- base vendor identity fields
- `hours_count`
- `images_count`
- `featured_dishes_count`

Those counts drive dashboard overview cards, incomplete-vendor status, and registry badges in the admin UI.

### GET /api/admin/admin-users
List team access accounts

Route file:
- `app/api/admin/admin-users/route.ts`

Behavior:
- requires admin auth
- reads from `admin_users` as the source of truth
- serves the team-access list through the app API so the admin UI does not read `admin_users` directly from the browser
- returns `id`, `email`, `full_name`, `role`, and `created_at`
- orders by `created_at desc`
- uses a bounded list read sized for the current admin workspace

### POST /api/admin/admin-users
Legacy team-access create route

Route file:
- `app/api/admin/admin-users/route.ts`

Behavior:
- requires admin auth
- creates a Supabase Auth user through a server-side service-role path
- mirrors the selected role into Supabase Auth `user_metadata.role`
- upserts the matching `admin_users` row
- returns `outcome = created` for a new auth user
- returns `outcome = existing` when the auth user already exists and only the role assignment/update was needed
- keeps `admin_users.role` authoritative while synchronizing the mirrored auth metadata role before the request succeeds

### POST /api/admin/create-user
Preferred team-access create route

Route file:
- `app/api/admin/create-user/route.ts`

Behavior:
- requires admin auth
- validates `email`, `password`, `role`, and optional `full_name`
- uses server-side service-role auth user creation only
- sets `email_confirm = true`
- recovers existing auth users by email lookup when Supabase returns a duplicate-user create error
- mirrors the selected role into Supabase Auth `user_metadata.role`
- upserts `admin_users` so team access stays aligned with the database
- returns the same `adminUser` payload shape as the legacy route plus `outcome = created | existing`

### PUT /api/admin/admin-users/:id
Update team access metadata

Route file:
- `app/api/admin/admin-users/[id]/route.ts`

Behavior:
- requires admin auth
- updates `role` and/or `full_name`
- persists the update to `admin_users`
- mirrors role changes back into Supabase Auth metadata so dashboard/session role reads stay synchronized

### DELETE /api/admin/admin-users/:id
Remove team access

Route file:
- `app/api/admin/admin-users/[id]/route.ts`

Behavior:
- requires admin auth
- removes the matching Supabase Auth user
- removes the selected `admin_users` row
- succeeds only after both deletion steps complete

### POST /api/admin/vendors
Create vendor

Route file:
- `app/api/admin/vendors/route.ts`

Behavior:
- creates the base vendor record
- the admin UI may then attach hours, featured dishes, and image upload as follow-up create-flow steps
- the backend route itself still creates the base vendor record only
- the admin UI must require explicit acknowledgement when linked records are intentionally missing at creation time

### PUT /api/admin/vendors/:id
Update vendor

Route file:
- `app/api/admin/vendors/[id]/route.ts`

Behavior:
- updates editable vendor profile fields
- keeps the existing slug stable unless the admin explicitly sends a new slug
- slug still controls the public vendor detail URL and must remain unique

### DELETE /api/admin/vendors/:id
Delete vendor or soft-disable vendor

Route file:
- `app/api/admin/vendors/[id]/route.ts`

### POST /api/admin/vendors/:id/images
Upload vendor images

Route file:
- `app/api/admin/vendors/[id]/images/route.ts`

Behavior:
- requires admin auth
- validates vendor id
- accepts multipart form uploads with `image` and `sort_order`
- accepts JSON image metadata as a compatibility fallback
- validates file type, file size, and sort order
- rejects files over `5 MB`
- validates real image bytes before storage
- optimizes valid JPEG, PNG, and WebP uploads server-side with `sharp`
- resizes oversized images inside a `1200px` maximum dimension and uses moderate quality compression
- stores optimized WebP output when smaller; otherwise stores the original safe image
- falls back to the original safe file if transformation fails after validation
- uploads the stored file to the `vendor-images` Supabase Storage bucket with matching extension and content type
- inserts `vendor_images` records with `image_url` and `storage_object_path`
- treats a missing or empty returned metadata row as an upstream failure instead of a successful upload
- returns vendor image rows for the selected vendor id
- returns only rows scoped to the selected vendor id
- writes `vendor.image_uploaded` audit log
- emits operational upload metadata that should match the current selected file and vendor id

Returns:
- `images`

### GET /api/admin/vendors/:id/images
List vendor images

Route file:
- `app/api/admin/vendors/[id]/images/route.ts`

Behavior:
- requires admin auth
- validates vendor id
- returns vendor image records ordered by `sort_order`
- normalizes any storage-path-only rows into browser-loadable public URLs before responding
- responses are consumed by a vendor-scoped admin image cache; callers must not merge images from another vendor into the current edit state

Returns:
- `images`

### DELETE /api/admin/vendors/:id/images/:imageId
Remove vendor image

Route file:
- `app/api/admin/vendors/[id]/images/[imageId]/route.ts`

Behavior:
- requires admin auth
- validates vendor id and image id
- deletes the Supabase Storage object when `storage_object_path` exists
- deletes the `vendor_images` row
- writes `vendor.image_deleted` audit log

### DELETE /api/admin/vendors/:id/dishes/:dishId
Remove featured dish

Route file:
- `app/api/admin/vendors/[id]/dishes/[dishId]/route.ts`

Behavior:
- requires admin auth
- validates vendor id and dish id
- deletes only the selected dish row for the selected vendor id
- writes `vendor.dish_deleted` audit log

Returns:
- `dish`

### POST /api/admin/vendors/:id/hours
Create or replace vendor hours

Route file:
- `app/api/admin/vendors/[id]/hours/route.ts`

Behavior:
- requires admin auth
- validates vendor id
- requires exactly seven day records
- upserts `vendor_hours` by `vendor_id` and `day_of_week`
- supports closed days and overnight hours
- writes `vendor.hours_replaced` audit log

Returns:
- `hours`

### GET /api/admin/vendors/:id/hours
Load vendor hours

Route file:
- `app/api/admin/vendors/[id]/hours/route.ts`

Behavior:
- requires admin auth
- validates vendor id
- returns current `vendor_hours` rows ordered by `day_of_week`

Returns:
- `hours`

### GET /api/admin/vendors/:id/dishes
Load featured dishes

Route file:
- `app/api/admin/vendors/[id]/dishes/route.ts`

Behavior:
- requires admin auth
- validates vendor id
- returns current `vendor_featured_dishes` rows for the selected vendor

Returns:
- `dishes`

### POST /api/admin/vendors/:id/dishes
Create featured dishes

Route file:
- `app/api/admin/vendors/[id]/dishes/route.ts`

Behavior:
- requires admin auth
- validates vendor id
- accepts one or more featured dish records
- inserts `vendor_featured_dishes` records
- writes `vendor.dishes_created` audit log

### Current Admin Create Workflow
The current admin onboarding flow uses the existing routes in sequence:
1. create base vendor
2. attach hours when provided
3. attach featured dishes when provided
4. upload vendor image when provided

If a later step fails, the UI must report which step failed instead of hiding the partial success.

### GET /api/admin/audit-logs
Fetch audit log entries

Route file:
- `app/api/admin/audit-logs/route.ts`

Behavior:
- requires `audit_logs:read`
- returns canonical audit-log actions after backend normalization
- returns paginated recent-team-activity data for the admin analytics dashboard

Success payload:
```json
{
  "success": true,
  "data": {
    "auditLogs": [],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "has_more": false,
      "next_cursor": null
    }
  },
  "error": null
}
```

Notes:
- `next_cursor` is a stringified next-offset token for the current dashboard pagination flow
- empty `auditLogs` is a valid success case, not a backend failure

### GET /api/admin/logs
Fetch recent operational events

Route file:
- `app/api/admin/logs/route.ts`

Behavior:
- requires `platform_logs:read`
- remains admin-only; agents must not access this route
- reads sanitized operational events from `public.operational_events`
- supports bounded pagination plus:
  - `level`
  - `area`
  - `event`
  - `route`
  - `since`
  - `time_window`
- returns recent warnings, failures, degraded responses, slow requests, and selected admin mutation events without mixing them with team activity
- never returns secrets, cookies, auth headers, passwords, service-role keys, raw request bodies, or raw stack traces

Success payload:
```json
{
  "success": true,
  "data": {
    "operationalEvents": [],
    "pagination": {
      "limit": 25,
      "offset": 0,
      "has_more": false,
      "next_cursor": null
    }
  },
  "error": null
}
```

Notes:
- `event` and `route` filters use sanitized text matching, not raw metadata queries
- empty `operationalEvents` is a valid success case
- an empty result is expected when storage is disabled, no persistable events have occurred yet, or the current filters match nothing
- `/admin/logs` is for platform health signals only
- `/admin/activity` remains the separate who-did-what audit trail surface

## Response Shape
```json
{
  "success": true,
  "data": {},
  "error": null
}
```

## Error Shape
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request"
  }
}
```

## Validation Rules
- coordinates must be valid numbers
- phone numbers must be sanitized
- slug must be unique
- image uploads must be restricted by type and size
- hours must support overnight ranges
- request params and request bodies should be parsed through `lib/validation/` schemas before business logic runs

## Boundary Rules
- Public endpoints are read-only.
- Admin endpoints require Supabase admin authentication before business logic runs.
- Route handlers should parse input at the edge, pass validated values to service code, and return the standard response shape.
- Supabase query logic should not be embedded directly in route files once business logic is implemented.
- Admin service errors should be translated through the shared admin error handler so route behavior stays consistent.
