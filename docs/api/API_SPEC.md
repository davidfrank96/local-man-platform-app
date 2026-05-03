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
- The frontend location hook should call `/api/vendors/nearby` with precise coordinates first, approximate coordinates second, or no coordinates when default city fallback is needed.
- Reverse geocoding is a separate best-effort UI concern and does not block or alter the nearby vendor response.
- Candidate vendors are fetched with a latitude/longitude bounding box before precise distance calculation.
- Base candidate filtering for `price_band` is pushed into the Supabase vendor query.
- Base candidate filtering for `category` is pushed into the Supabase vendor query through the `vendor_category_map` join.
- Base candidate filtering for `search` currently matches vendor name, short description, and area in the Supabase vendor query and is rechecked in application logic for safety.
- Usage-signal ranking is aggregated server-side through the `get_vendor_usage_scores` SQL function instead of fetching raw `user_events` rows into Node.
- If that SQL function is unavailable in a partially migrated environment, the API falls back to a service-role `user_events` read so nearby discovery still responds.
- `distance_km` is calculated dynamically with the Haversine formula.
- Results are filtered by `radius_km` after exact distance calculation.
- Final discovery ordering prioritizes:
  1. vendors that are open now
  2. stronger client-side search relevance
  3. higher `ranking_score`
  4. shorter distance
- Nearby results are capped to the top `50` vendors after filtering and ordering so the map/list payload remains bounded.
- The public map currently renders those vendor results as individual markers when MapLibre is enabled.
- Clustering is disabled in the current release, so the API response does not carry any cluster-specific contract.
- Distance is not stored in the database.
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
- `is_open_now` and `today_hours` are computed on the server from the shared availability helper that also powers `GET /api/vendors/nearby`, so discovery cards, selected vendor panels, and the detail page use the same source of truth.
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
- no login required for the initial lightweight flow
- validates the vendor slug and rating score
- inserts a row into `ratings`
- updates vendor aggregate rating fields after insert
- does not support review comments
- returns `NOT_FOUND` when the vendor slug does not resolve to an active vendor
- returns `UPSTREAM_ERROR` when the rating write or aggregate update fails

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

## Admin Endpoints
Admin endpoint rules:
- Requests must include `Authorization: Bearer <supabase-access-token>`.
- The bearer token is verified against Supabase Auth.
- The authenticated user id must exist in `admin_users`.
- Authentication and admin membership are checked before route business logic runs.
- The admin login UI obtains the bearer token from a Supabase email/password session instead of manual token paste.
- Request params and request bodies are still validated at the route boundary.
- Vendor list, create, update, and delete routes call typed admin vendor service methods.
- Vendor create, update, and delete routes write audit logs.
- Unexpected Supabase response shapes return `UPSTREAM_ERROR` without leaking raw parser failures.

### GET /api/admin/session
Validate the current admin session

Route file:
- `app/api/admin/session/route.ts`

Behavior:
- requires `Authorization: Bearer <supabase-access-token>`
- verifies the Supabase user
- verifies that the authenticated user exists in `admin_users`
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
- upserts the matching `admin_users` row
- returns `outcome = created` for a new auth user
- returns `outcome = existing` when the auth user already exists and only the role assignment/update was needed

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

### DELETE /api/admin/admin-users/:id
Remove team access

Route file:
- `app/api/admin/admin-users/[id]/route.ts`

Behavior:
- requires admin auth
- removes the selected `admin_users` row
- removes the matching auth user when allowed by the current admin flow

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
- uploads the file to the `vendor-images` Supabase Storage bucket
- inserts `vendor_images` records with `image_url` and `storage_object_path`
- returns vendor image rows for the selected vendor id
- writes `vendor.image_uploaded` audit log

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
