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

The API foundation defines route files, access boundaries, request shapes, response shapes, and validation boundaries. `GET /api/vendors/nearby` includes the Supabase candidate query, dynamic distance calculation, radius filtering, nearest-first sorting, featured dish summary selection, and compact `today_hours` output. Authenticated admin routes cover vendor create, update, deactivate, sub-resources, and audit-log behavior.

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
- latitude
- longitude
- distance_km, computed from user coordinates to vendor coordinates
- is_open_now
- one featured dish summary when available: `featured_dish.dish_name` and optional `featured_dish.description`
- `today_hours`, a compact current-day summary such as `9:00 AM - 6:00 PM`, `Closed`, or `Hours not listed`
- summary fields for cards
- `price_band`, `area`, `average_rating`, and `review_count` for compact vendor card display

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
- `distance_km` is calculated dynamically with the Haversine formula.
- Results are filtered by `radius_km` after exact distance calculation.
- Results are sorted nearest first.
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
- hours
- categories
- featured dishes
- images
- rating summary

Behavior:
- Returns `NOT_FOUND` when no active vendor matches the slug.
- Returns `CONFIGURATION_ERROR` when public Supabase env vars are missing.
- Returns `UPSTREAM_ERROR` when the Supabase detail query fails.

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

### POST /api/admin/vendors
Create vendor

Route file:
- `app/api/admin/vendors/route.ts`

### PUT /api/admin/vendors/:id
Update vendor

Route file:
- `app/api/admin/vendors/[id]/route.ts`

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

Returns:
- `image`

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
