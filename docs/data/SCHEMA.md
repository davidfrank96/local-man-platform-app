## Title
The Local Man — Database Schema

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
- sort_order: integer default 0
- created_at: timestamp

## Table: ratings
- id: uuid, primary key
- vendor_id: uuid, foreign key to vendors
- score: integer
- comment: text
- source_type: text
- created_at: timestamp

Notes:
- `score` is constrained from 1 to 5.

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

## Suggested Indexes
- vendors.slug
- vendors.city
- vendors.area
- vendors.is_active
- vendors.latitude and vendors.longitude for active vendor lookup
- vendors text search across name, description, area, and city
- vendor_hours.vendor_id
- vendor_category_map.vendor_id
- vendor_category_map.category_id
- vendor_featured_dishes.vendor_id
- vendor_images.vendor_id and sort_order
- ratings.vendor_id
- audit_logs.admin_user_id
- audit_logs.entity_type and entity_id

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

## Future Extension Notes
Potential future additions:
- bookings table
- anonymous feedback source tracking
- vendor verification state
- operating status events

These are not Phase 1 deliverables.
