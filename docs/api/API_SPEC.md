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

The API foundation defines route files, access boundaries, request shapes, response shapes, and validation boundaries. `GET /api/vendors/nearby` includes the Phase 1 Supabase candidate query, dynamic distance calculation, radius filtering, and nearest-first sorting. Phase 2B adds authenticated admin vendor create, update, and soft-delete route logic. Public detail/category routes and remaining admin sub-resource routes still return `501 NOT_IMPLEMENTED` until their business logic is added.

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
- summary fields for cards

Behavior:
- If `lat` and `lng` are provided, both must be valid coordinates.
- If both coordinates are missing, the API falls back to the Abuja default city view.
- If only one coordinate is provided, the API returns `VALIDATION_ERROR`.
- `location_source = precise` means browser/device geolocation.
- `location_source = approximate` means IP-based or other low-accuracy approximation.
- `location_source = default_city` means no user coordinates were available and Abuja was used.
- The frontend location hook should call `/api/vendors/nearby` with precise coordinates first, approximate coordinates second, or no coordinates when default city fallback is needed.
- Candidate vendors are fetched with a latitude/longitude bounding box before precise distance calculation.
- `distance_km` is calculated dynamically with the Haversine formula.
- Results are filtered by `radius_km` after exact distance calculation.
- Results are sorted nearest first.
- Distance is not stored in the database.

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

### GET /api/categories
Purpose: fetch filter categories

Route file:
- `app/api/categories/route.ts`

## Admin Endpoints
Admin endpoint rules:
- Requests must include `Authorization: Bearer <supabase-access-token>`.
- The bearer token is verified against Supabase Auth.
- The authenticated user id must exist in `admin_users`.
- Authentication and admin membership are checked before Phase 2 business logic runs.
- Request params and request bodies are still validated at the route boundary.
- Vendor list, create, update, and delete routes call typed admin vendor service methods.
- Vendor create, update, and delete routes write audit logs.
- Unexpected Supabase response shapes return `UPSTREAM_ERROR` without leaking raw parser failures.

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
- accepts JSON image metadata
- inserts `vendor_images` records
- writes `vendor.images_created` audit log

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
