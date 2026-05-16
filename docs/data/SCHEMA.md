## Title
Local Man — Database Schema

## Design Principles
- simple and production-usable
- normalized where useful
- supports location-based vendor discovery
- supports admin-managed content
- supports future extension without polluting MVP

## Migration Draft
Initial schema migration:
- `supabase/migrations/20260422180000_initial_schema.sql`

The migration creates the Phase 1 MVP tables, basic constraints, lookup indexes, `updated_at` triggers, and Supabase row-level security policies for public-read/admin-write access.

Current migration security posture:
- explicit Supabase Data API grants are defined in the `20260513*` hardening migrations
- legacy broad Data API role grants are revoked and replaced with least-privilege table/function grants
- `public.app_schema_migrations` has RLS enabled with a deny-all client policy
- future tables, functions, and sequences in `public` fail closed until their migration grants access intentionally
- RLS remains the row-level authorization boundary; grants only expose the object to the Data API role surface

## Seed Strategy
Initial seed strategy:
- `supabase/seed/SEED_STRATEGY.md`
- `supabase/seed/20260422_abuja_pilot_seed.sql`

The seed strategy defines the Abuja pilot data quality bar, target vendor counts, categories, operating hours patterns, featured dish expectations, image placeholder rules, rating placeholders, and validation checklist.

The Abuja pilot seed SQL creates 20 non-production test vendors across the documented pilot areas for runtime validation of nearby vendor queries.

## Types and Validation
Initial shared validation foundation:
- `lib/validation/common.ts`
- `lib/validation/schemas.ts`
- `types/domain.ts`

The validation schemas mirror the Phase 1 database shape and API boundaries, including the vendor/category join table. TypeScript domain types are inferred from these schemas.

## Table: vendors
- id: uuid, primary key
- name: text, required
- slug: text, unique, required
- short_description: text
- phone_number: text
- address_text: text
- city: text
- area: text
- state: text
- country: text
- latitude: numeric, required
- longitude: numeric, required
- price_band: text
- average_rating: numeric default 0
- review_count: integer default 0
- is_active: boolean default true
- is_open_override: boolean nullable
- created_at: timestamp
- updated_at: timestamp

Notes:
- `slug` must be lowercase alphanumeric words separated by hyphens.
- `latitude` and `longitude` are constrained to valid coordinate ranges.
- `average_rating` is constrained from 0 to 5.
- `review_count` cannot be negative.
- `price_band` must be `budget`, `standard`, or `premium` when present.

## Location Notes
- `latitude` and `longitude` are required for all vendors.
- Coordinates must be accurate for map rendering and distance calculation.
- Distance is not stored in the database.
- Distance is calculated at query time based on user location.

## Vendor Image Notes
- `storage_object_path` is used for uploaded vendor images and may be null for seed or legacy URLs.
- Uploaded images should point to the `vendor-images` Supabase Storage bucket.
- The public app reads `image_url`; the admin app uses `storage_object_path` for removal.

## Table: vendor_hours
- id: uuid, primary key
- vendor_id: uuid, foreign key to vendors
- day_of_week: integer
- open_time: time
- close_time: time
- is_closed: boolean default false
- created_at: timestamp
- updated_at: timestamp

Notes:
- `day_of_week` uses integers 0 through 6.
- Each vendor can have one hours row per day.
- Closed days may omit `open_time` and `close_time`.
- Overnight ranges are supported because `close_time` is not required to be later than `open_time`.
- API input may use `HH:MM`; Supabase responses may include seconds as `HH:MM:SS`.

## Table: vendor_categories
- id: uuid, primary key
- name: text, unique
- slug: text, unique
- created_at: timestamp

## Table: vendor_category_map
- id: uuid, primary key
- vendor_id: uuid, foreign key to vendors
- category_id: uuid, foreign key to vendor_categories
- created_at: timestamp

Notes:
- Each vendor/category pair must be unique.

## Table: vendor_featured_dishes
- id: uuid, primary key
- vendor_id: uuid, foreign key to vendors
- dish_name: text, required
- description: text
- image_url: text
- is_featured: boolean default true
- created_at: timestamp
- updated_at: timestamp

## Table: vendor_images
- id: uuid, primary key
- vendor_id: uuid, foreign key to vendors
- image_url: text, required
- storage_object_path: text nullable
- sort_order: integer default 0
- created_at: timestamp

Runtime rules:
- uploaded vendor profile images should have both `image_url` and `storage_object_path`
- seed or legacy image rows may have no `storage_object_path`, but upload/delete bookkeeping depends on it
- admin upload success is valid only when the insert returns the expected `vendor_images` row
- admin and public render paths should always scope image rows by `vendor_id`

## Table: ratings
- id: uuid, primary key
- vendor_id: uuid, foreign key to vendors
- score: integer
- comment: text
- source_type: text
- anonymous_client_hash: text nullable
- created_at: timestamp

Notes:
- `score` is constrained from 1 to 5.
- new public rating writes include a SHA-256 anonymous browser identity hash.
- `ratings_vendor_anonymous_client_hash_idx` enforces one rating per vendor per anonymous hash when the hash is present.
- legacy rows may have `anonymous_client_hash = null` and remain part of aggregate rating history.

## Table: user_events
- id: uuid, primary key
- event_type: text
- vendor_id: uuid nullable, foreign key to vendors
- vendor_slug: text nullable
- session_id: text nullable
- page_path: text nullable
- location_source: text nullable
- device_type: text nullable
- metadata: jsonb
- created_at: timestamp

Runtime rules:
- public event tracking is fire-and-forget and must not break public discovery
- events with nonexistent `vendor_id` values are skipped before insert so `user_events` foreign-key integrity is preserved
- invalid vendor references should emit sanitized operational warnings, not noisy database constraint failures
- valid vendor events remain available to usage-score ranking and admin analytics

## Table: admin_users
- id: uuid, primary key
- email: text, unique
- full_name: text
- role: text
- created_at: timestamp

Notes:
- `id` references `auth.users(id)` because Supabase Auth is used for admin users only.

## Table: audit_logs
- id: uuid, primary key
- admin_user_id: uuid, foreign key to admin_users
- entity_type: text
- entity_id: uuid
- action: text
- metadata: jsonb
- created_at: timestamp

## Table: operational_events
- id: uuid, primary key
- created_at: timestamp
- level: text
- area: text
- event: text
- message: text nullable
- route: text nullable
- method: text nullable
- status: integer nullable
- duration_ms: integer nullable
- request_id: text nullable
- actor_role: text nullable
- actor_id: text nullable
- vendor_id: text nullable
- vendor_slug: text nullable
- environment: text nullable
- metadata: jsonb

Notes:
- `operational_events` stores bounded sanitized operational logs, not security audit trails.
- It is separate from `audit_logs`.
- Metadata must not contain secrets, tokens, cookies, raw request bodies, or raw stack traces.
- Current read access is admin-only through row-level security.
- The admin workspace reads these rows through `/api/admin/logs` and `/admin/logs` when `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=true`.
- Retention is intentionally bounded through `npm run db:prune:operational-events`, which defaults to a 30 day window unless overridden by `LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS`.

## Suggested Indexes
- vendors.slug
- vendors.city
- vendors.area
- vendors.is_active
- vendors.latitude and vendors.longitude for active vendor lookup
- vendors.price_band
- vendors text search across name, description, area, and city
- vendor_hours.vendor_id
- vendor_category_map.vendor_id
- vendor_category_map.category_id
- vendor_featured_dishes.vendor_id
- vendor_images.vendor_id and sort_order
- ratings.vendor_id
- user_events.event_type and timestamp
- user_events.vendor_id and timestamp
- user_events.session_id and timestamp
- user_events.vendor_id plus event_type for ranking aggregation
- admin_users.email
- admin_users.id
- audit_logs.admin_user_id
- audit_logs.entity_type and entity_id
- operational_events.created_at
- operational_events.level
- operational_events.area
- operational_events.event
- operational_events.route

Current notes:
- `vendors.is_open_now` is not a persisted column in this schema; open status is derived from `vendor_hours` and `is_open_override`, so there is no direct database index for `is_open_now`.
- `admin_users.id` is the auth user id primary key, so it already has an index through the primary key constraint.
- `admin_users.email` is unique, so it already has an index through the unique constraint.

## Row-Level Security
All MVP tables enable row-level security.

Public read access is allowed for:
- active vendors
- hours, category mappings, featured dishes, images, and ratings belonging to active vendors
- vendor categories

Admin write access is controlled through `public.is_admin()`, which checks whether `auth.uid()` exists in `admin_users`.

Admin users can:
- manage vendors
- manage vendor hours
- manage categories
- manage category mappings
- manage featured dishes
- manage vendor images
- manage ratings
- read admin users
- read and create audit logs
- read operational events

## Data API Grant Rules
The public schema is intentionally explicit-grant only.

Public read grants exist for:
- `vendors`
- `vendor_hours`
- `vendor_categories`
- `vendor_category_map`
- `vendor_featured_dishes`
- `vendor_images`
- `ratings`

Authenticated workspace grants exist for vendor-management mutations where RLS allows the current admin/agent role.

Service-role grants exist for:
- admin/server route writes
- analytics/event/rating writes
- image upload/delete bookkeeping
- migration bookkeeping through `app_schema_migrations`

Anon must not receive access to:
- `admin_users`
- `audit_logs`
- `operational_events`
- `app_schema_migrations`

Function execution is also explicit. RLS helper functions remain executable because policies call them during row checks; trigger/admin/RPC functions remain service_role-only unless a migration documents a narrower public need.

## Future Extension Notes
Potential future additions:
- bookings table
- account-backed rating identity
- vendor verification state
- operating status events

These are not Phase 1 deliverables.
