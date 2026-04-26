## Title
The Local Man — Architecture Overview

## Architecture Goal
Provide a stable, maintainable architecture for a location-based vendor discovery product with a separate admin operations surface.

## Core Stack

### Frontend
- Next.js App Router
- React
- TypeScript
- global CSS

### Backend Services
- Supabase Postgres
- Supabase Auth for admin-only access
- Supabase Storage for vendor profile images

### Maps and Location
- browser geolocation for precise location
- optional approximate location provider interface
- internal reverse geocoding route for human-readable labels
- Google Maps deep links for directions

### Deployment
- DigitalOcean App Platform
- Supabase managed backend
- local runtime and smoke checks assume `http://localhost:3000`

## Why This Stack
- fast MVP delivery
- easy for AI agents to reason about
- typed and maintainable
- avoids excessive backend boilerplate
- strong ecosystem support

## Separation of Concerns

### Public App
Handles:
- discovery homepage
- nearby vendor loading
- search and filters
- open-now and usage-signal-aware discovery ordering
- selected vendor state
- local retention surfaces for recent and last-selected vendors
- navigation restoration
- vendor detail rendering
- lightweight public vendor rating
- trust-first location display
- time-based theming

### Admin App
Handles:
- admin login and session validation
- dashboard overview
- analytics dashboard
- vendor registry management
- vendor creation
- vendor editing
- hours management
- featured dish management
- vendor image upload and removal

### API Routes
Handle:
- public nearby vendor reads
- public vendor detail reads
- public vendor rating writes
- non-blocking public event writes
- reverse geocoding
- authenticated admin writes
- authenticated admin analytics reads
- admin subresource loading

### Database
Stores:
- vendors
- vendor_hours
- vendor_category_map
- vendor_featured_dishes
- vendor_images
- ratings
- admin_users
- audit_logs
- user_events

## Architecture Principles
1. Keep the public app read-heavy and simple.
2. Keep admin workflows explicit and controlled.
3. Avoid microservices.
4. Prefer server-side validation for writes.
5. Use docs as the source of truth.
6. Build for Abuja pilot before scale.

## Public App Flow
1. User opens the discovery page
2. Browser geolocation is attempted
3. The app resolves precise, approximate, or default-city browse mode
4. `/api/vendors/nearby` returns nearby vendors
5. Discovery ordering prioritizes open-now state, then stronger search matches, then usage ranking, then distance
6. Vendors render in the list, map, selected preview, and lightweight retention panels
7. User opens vendor detail, rates a vendor, or takes actions such as call and directions

## User Location Handling

The public app determines the user location before nearby vendor search.

Primary method:
- browser/device geolocation through the Web Geolocation API
- `location_source = precise`
- high-accuracy request, 10 second timeout, low cached-age allowance
- UI copy such as `Using your current location`
- human-readable area label when reverse lookup succeeds, otherwise rounded coordinates

Approximate method:
- optional approximation provider interface
- `location_source = approximate`
- only shown in the UI when both coordinates and a usable place label are available
- always labeled approximate, never exact

Default city fallback:
- Abuja browse mode when precise and approximate coordinates are unavailable
- `location_source = default_city`
- used internally to keep discovery working
- not presented as the user’s exact location

Location handling rules:
- Distance is calculated from the resolved search location, not persisted.
- Precise and approximate coordinates use the same nearby vendor query path.
- Missing coordinates are handled gracefully by falling back to Abuja.
- Partial coordinates, such as only `lat` or only `lng`, are invalid.
- Denied or unavailable precise location should fall back to IP approximation first, then the Abuja default city view if approximation is unavailable.
- The frontend should show a location label only when the source is trustworthy enough to present clearly.

Implementation ownership:
- `lib/location/acquisition.ts` owns acquisition order and provider interfaces
- `hooks/use-user-location.ts` owns public retry and state updates
- `app/api/location/reverse/route.ts` formats human-readable labels without blocking vendor loading
- approximate location remains provider-driven rather than hard-coded to a live vendor

## Admin Flow
Admin workspace routes:
- `/admin` for overview and quick actions
- `/admin/vendors` for vendor registry and completeness review
- `/admin/vendors/new` for vendor onboarding
- `/admin/vendors/[id]` for focused edit workflows

1. Admin logs in
2. Admin reviews dashboard counts and incomplete vendor follow-up work
3. Admin creates the base vendor record, optionally with hours, dishes, and image input
4. Missing hours, dishes, or images require explicit acknowledgement during creation
5. Admin edits the selected vendor without changing the slug unless a manual URL change is intended
6. Admin updates hours, dishes, and images against the selected vendor id
7. System logs write actions in the audit log

Admin workflow rules:
- the vendor slug is created from the vendor name on first creation
- the slug stays stable on later name edits unless the admin explicitly edits the slug field
- selected-vendor editing must load current hours, images, and featured dishes from the linked vendor id before new writes happen
- admin hour entry accepts simple 12-hour text such as `9 AM` or `8:30 PM` and converts it to 24-hour database time before save
- featured dish image URLs are dish-scoped metadata and must not be treated as vendor profile images

## Vendor Image Pipeline

Vendor profile images use this path:

1. admin upload route receives the file
2. file is validated
3. file is uploaded to Supabase Storage bucket `vendor-images`
4. `vendor_images.storage_object_path` stores the canonical Storage path
5. `vendor_images.image_url` stores the public URL when created
6. admin and public APIs normalize storage-backed rows into browser-loadable URLs
7. public vendor detail renders the returned image URL

Rules:
- vendor profile images belong to `vendor_images`
- featured dish image URLs are dish-scoped and separate
- upload and delete are server-side only
- `storage_object_path` is the Storage source of truth
- frontend rendering uses the returned public URL

## State Model

### Vendor Selection
- the public list stores selected vendor by slug
- selection is visual only and must not mutate vendor data

### Navigation Restoration
- discovery state is restored through a combination of:
  - URL query state
  - `sessionStorage` snapshot state
  - selected vendor slug
  - preserved scroll position

### Admin Session State
- admin login uses Supabase email/password auth
- browser-stored session is validated against `admin_users`
- protected routes resolve through the admin route guard

### Usage Signal State
- public tracking is fire-and-forget and must never block UI
- public event writes go through `/api/events`
- analytics reads stay admin-only through `/api/admin/analytics`
- `user_events` is append-only for lightweight interaction capture
- session-level drop-off analysis depends on `session_id` coverage; the admin analytics page must tolerate historical rows without that field
- discovery ranking can read aggregated `user_events` signals server-side, but public browsing must still work when no usage signal data exists

## Usage Signal Pipeline

Public usage signals use this path:

1. public UI records a lightweight interaction
2. client sends a small payload to `/api/events`
3. server validates the payload
4. server writes to `public.user_events`
5. nearby discovery can derive a simple vendor `ranking_score` from those rows
6. admin analytics reads and aggregates those rows server-side
7. `/admin/analytics` renders summary metrics, vendor performance, drop-off signals, and recent activity

Tracked event types:
- `session_started`
- `first_interaction`
- `last_interaction`
- `vendor_selected`
- `vendor_detail_opened`
- `call_clicked`
- `directions_clicked`
- `search_used`
- `filter_applied`

## Vendor Rating Pipeline

Public vendor ratings use this path:

1. user submits a 1-5 star score on vendor detail
2. `/api/vendors/[slug]/ratings` validates the score and resolves the vendor by slug
3. server inserts a lightweight `ratings` row
4. vendor aggregate fields update:
   - `average_rating`
   - `review_count`
5. public discovery and detail render `★ <rating>` when ratings exist or `New` when they do not

Rules:
- no login is required for the current lightweight rating flow
- no comments or full review system exist yet
- rating writes stay separate from `user_events`

## Discovery Retention State

The public app keeps a small amount of client-only memory:

- `localStorage` stores recently viewed vendors
- `localStorage` stores the last selected vendor
- vendor detail visits update recently viewed memory
- list selection updates last-selected memory
- these helpers improve return navigation without requiring login or backend persistence

## Core Product Logic

### Open Now
Supports:
- same-day schedules
- overnight schedules
- manual override

### Distance
Calculated from the resolved search location and vendor coordinates.

## Distance Calculation

Distance between user and vendor is calculated dynamically using coordinates.

Preferred method:
- Haversine formula or database-level geospatial query

Distance is returned in kilometers and rounded for display.

Distance is never stored in the database.

Current implementation:
- API validates user `lat` and `lng`.
- Supabase candidate query uses a latitude/longitude bounding box to reduce scanned rows.
- Application logic calculates exact Haversine distance for each candidate.
- Application logic applies radius filtering and returns `distance_km` for each candidate.
- Final discovery ordering is handled as:
  1. open-now priority
  2. stronger search relevance
  3. usage-signal `ranking_score`
  4. distance as the final tie-breaker
- Default nearby radius is 10 km when `radius_km` is not provided.
- Missing user coordinates resolve to the Abuja default city view before the nearby query runs.

### Directions
Use Google Maps deep links using vendor coordinates.

### Call
Use clickable phone links.

## Security Principles
- admin-only auth
- role-based access for admin operations
- strict input validation
- upload restrictions
- safe environment variable handling
- audit logging for changes

## Non-Functional Requirements
- mobile-first responsiveness
- fast page loads
- graceful location fallback
- clear error handling
- no vendor data mutation from UI selection
- time-based theming without readability loss
