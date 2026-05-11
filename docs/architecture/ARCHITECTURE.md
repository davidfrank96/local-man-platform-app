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
- MapLibre GL JS with a browser-configured MapTiler style URL passed through `NEXT_PUBLIC_MAP_STYLE_URL` for the optional interactive discovery map
- coordinate fallback map when MapLibre or the configured MapTiler style is unavailable or unconfigured
- browser geolocation for precise location
- optional approximate location provider interface
- internal reverse geocoding route for human-readable labels
- Google Maps deep links for directions only
- the interactive discovery map should initialize immediately with the default-city center while location resolution and nearby vendor loading continue asynchronously

### Deployment
- DigitalOcean App Platform
- Supabase managed backend
- local runtime and smoke checks assume `http://localhost:3000`
- `http://127.0.0.1:3000` is also supported locally through `allowedDevOrigins` so HMR and chunk requests still work during operator smoke checks
- release candidates should come from tracked committed repo state because DigitalOcean builds from the repository tree, not local `.next` artifacts or untracked route files

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
- open-now and distance-first discovery ordering with usage signals as close-distance tie-breakers
- selected vendor state through `selectedVendorId`
- single vendor-marker system and selected preview synchronization
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
- audit-log activity dashboard
- operational logs dashboard
- team access management
- vendor registry management
- vendor creation
- vendor editing
- hours management
- featured dish management
- vendor image upload and removal

Admin browser enforcement rules:
- privileged admin and agent reads and mutations go through protected `/api/admin/**` routes only
- the active admin browser flow no longer instantiates a direct Supabase client for privileged operations
- RBAC is enforced on the backend through `requireAdmin()` and `requireAdminPermission()`, with client role checks kept for navigation and UX only
- authenticated users gain admin workspace access only through an explicit `admin_users` assignment; authentication alone is not enough
- hidden navigation, role-based redirects, and denied-state rendering in React are not security boundaries and must not be treated as authorization

### API Routes
Handle:
- public nearby vendor reads
- public vendor detail reads
- public vendor rating writes
- non-blocking public event writes
- reverse geocoding
- authenticated admin writes
- backend analytics and team-access routes
- admin subresource loading
- shared vendor availability computation in `lib/vendors/hours.ts` for `is_open_now` and `today_hours`
- centralized abuse protection for public writes, search-heavy reads, and admin login
- structured server-side runtime logging through `lib/observability.ts`

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
- operational_events

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
5. Discovery ordering prioritizes open-now state, then distance, with usage ranking only for close-distance ties
6. Vendors render in the list, optional MapLibre plus MapTiler map or fallback map, selected preview, and lightweight retention panels
7. User opens vendor detail, rates a vendor, or takes actions such as call and directions

Public rendering rules:
- discovery/list surfaces use compact no-image vendor cards
- vendor images remain detail-page only
- selected vendor preview stays compact so the map retains usable space
- the public map must degrade quietly to the coordinate fallback when style loading, WebGL, or network conditions prevent MapLibre from loading
- the current real map uses one marker system only:
  - oxblood storefront vendor markers
  - green storefront marker state for the selected vendor
  - blue user-location marker
  - no clustering
- vendor detail uses a shorter hero and compact summary blocks to reduce scrolling

## Map Interaction Model

- `selectedVendorId` is the single source of truth for:
  - marker highlight
  - selected vendor preview
  - selected vendor list state
- marker click selects only and must not move the camera
- vendor-card selection may gently focus the map
- filter and radius apply fit the map to the current visible vendor set
- locate-me recenters the map on the resolved user location
- theme changes update overlays and control contrast without recreating the map instance

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
- `/admin` resolves to the role home path
- `/admin/dashboard` for admin overview and quick actions
- `/admin/agent` for the restricted agent home route
- `/admin/analytics` for usage signals
- `/admin/activity` for audit-log review
- `/admin/logs` for operational warnings, failures, degraded responses, and slow requests
- `/admin/team` for team access
- `/admin/vendors` for vendor registry and completeness review
- `/admin/vendors/new` for vendor onboarding
- `/admin/vendors/[id]` for focused edit workflows

1. Admin logs in
2. Admin reviews dashboard counts and incomplete vendor follow-up work
3. Admin creates the base vendor record, optionally with hours, dishes, and image input
4. Missing hours, dishes, or images require explicit acknowledgement during creation
5. Admin edits the selected vendor without changing the slug unless a manual URL change is intended
6. Admin updates hours, dishes, and images against the selected vendor id
7. Admin manages team access through `admin_users` and server-side auth user creation
8. System logs write actions in the audit log

Admin workflow rules:
- the vendor slug is created from the vendor name on first creation
- the slug stays stable on later name edits unless the admin explicitly edits the slug field
- selected-vendor editing must load current hours, images, and featured dishes from the linked vendor id before new writes happen
- admin hour entry accepts simple 12-hour text such as `9 AM` or `8:30 PM` and converts it to 24-hour database time before save
- featured dish image URLs are dish-scoped metadata and must not be treated as vendor profile images
- team-access reads use `admin_users` as the source of truth
- existing auth users may be recovered and role-assigned without surfacing a false failure
- admin sidebar order currently remains:
  - Dashboard
  - Analytics
  - Manage vendors
  - Create vendor
  - Team access
  - Activity
  - Logs
- high-volume admin surfaces use contained inner-scroll panels so analytics, activity, vendor registry, and logs stay readable without forcing the whole workspace page to grow indefinitely
- the logs surface uses compact expandable rows so operators can scan event summaries first and inspect sanitized metadata only on demand

## Abuse Protection Model

Centralized rate limiting lives in `lib/api/abuse-protection.ts`.

Current protected surfaces:
- `/api/admin/login`
- `/api/events`
- `/api/vendors/[slug]/ratings`
- `/api/vendors/nearby` when a search term is present

Protection rules:
- backend routes are authoritative; the browser does not enforce abuse limits
- rate limiting uses IP-based buckets and may add a non-privileged HTTP-only client correlation cookie for public traffic
- repeated duplicate write submissions are collapsed before they fan out into duplicate upstream writes
- blocked requests return structured `TOO_MANY_REQUESTS` responses or safe degraded `202` responses, depending on the endpoint contract
- limiter logging records hashed identifiers only and never logs raw client IPs
- the current limiter is process-local and in-memory, so it protects a single app instance but is not yet a distributed global throttle

Current thresholds:
- admin login: `5` attempts per `10` minutes, `15` minute block
- public events: `120` requests per `5` minutes, `2` minute block, `2` second duplicate collapse
- public ratings: `8` requests per `10` minutes, `10` minute block, `60` second duplicate collapse
- public nearby search: `45` search requests per `60` seconds, `2` minute block

## Runtime Observability

Structured server logging lives in `lib/observability.ts`.

Current rules:
- server logs use stable event names, levels, and safe metadata objects
- incoming `x-request-id` or `x-correlation-id` values are reused only when they match the request-id safety rules; otherwise the server generates a short internal request id
- touched public/admin routes may echo the safe request id back in the `x-request-id` response header
- current route-level timing and failure instrumentation covers:
  - `/api/admin/login`
  - `/api/admin/session`
  - `/api/admin/logout`
  - `/api/admin/analytics`
  - `/api/admin/audit-logs`
  - admin vendor mutation routes, including image and featured-dish writes
  - `/api/vendors/nearby`
  - `/api/vendors/[slug]/ratings`
  - `/api/events`
- error serialization includes safe `errorName`, `errorMessage`, and optional `errorCode` fields
- logger redaction removes secrets, tokens, cookies, raw request bodies, and database URLs from emitted metadata
- debug logs are env-gated and disabled by default
- `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=true` enables bounded persistence of selected structured operational events into `public.operational_events`
- persisted events are intentionally limited to:
  - errors
  - degraded responses
  - rate-limit blocks
  - selected warn-level failures and slow requests
  - selected important admin mutation events
- persisted operational events are separate from `audit_logs` and are sanitized before insert
- `/admin/logs` reads those persisted operational events through the protected `/api/admin/logs` route
- common operational event names include:
  - `ADMIN_LOGIN_FAILED`
  - `ADMIN_SESSION_VALIDATION_FAILED`
  - `PUBLIC_NEARBY_SLOW`
  - `PUBLIC_NEARBY_ROUTE_FAILED`
  - `PUBLIC_VENDOR_RATING_FAILED`

Current limitation:
- console logging remains the primary output path, and operational-event storage is only a lightweight internal persistence layer rather than a centralized trace store
- retention is managed through an explicit prune step rather than a background log pipeline
- when `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE` stays disabled, `/admin/logs` should still load but remain empty
- public discovery still prefers graceful degraded nearby responses over hard API failures, but the logs now distinguish:
  - true empty search results through `PUBLIC_NEARBY_EMPTY_RESULT`
  - degraded upstream-failure fallbacks through `PUBLIC_NEARBY_ROUTE_FAILED`

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
- the public discovery surface stores selected vendor by id
- selection is visual only and must not mutate vendor data

### Navigation Restoration
- discovery state is restored through a combination of:
  - URL query state
  - short-lived `sessionStorage` snapshot state
  - selected vendor id
  - preserved scroll position
- restored nearby vendor data is reused only while the snapshot remains fresh
- restored nearby vendor data still yields to one live nearby fetch before it becomes authoritative again
- admin vendor mutations invalidate restored discovery vendor data through the shared public invalidation channel

### Admin Session State
- admin login uses Supabase email/password auth
- privileged admin and agent sessions are stored in HTTP-only same-origin cookies
- `/api/admin/session` validates and refreshes the cookie-backed session against `admin_users`
- authenticated users missing from `admin_users` are denied and any cookie-backed privileged session is cleared
- protected routes resolve through the admin route guard

### Usage Signal State
- public tracking is fire-and-forget and must never block UI
- public event writes go through `/api/events`
- analytics reads stay admin-only and go through `/api/admin/analytics`, which prefers the aggregated SQL snapshot and falls back safely when needed
- `user_events` is append-only for lightweight interaction capture
- session-level drop-off analysis depends on `session_id` coverage; the admin analytics page must tolerate historical rows without that field
- discovery ranking can read aggregated `user_events` signals server-side, but public browsing must still work when no usage signal data exists

## Usage Signal Pipeline

Public usage signals use this path:

1. public UI records a lightweight interaction
2. client sends a small payload to `/api/events`
3. server validates the payload
4. server writes to `public.user_events`
5. nearby discovery can derive a simple vendor `ranking_score` from those rows through a small SQL aggregation function keyed by candidate vendor ids
6. `/api/admin/analytics` reads those rows and snapshots server-side, preferring the aggregated SQL snapshot RPC and falling back safely when needed
7. `/admin/analytics` renders summary metrics, vendor performance, drop-off signals, and recent user events
8. `/admin/activity` renders recent team activity from the protected audit-log route
9. `/admin/logs` renders recent persisted operational warnings, failures, degraded responses, and slow requests from `public.operational_events`

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
3. server calls a database-side `submit_public_vendor_rating` RPC with the resolved vendor id
4. Postgres inserts the `ratings` row and refreshes `vendors.average_rating` / `vendors.review_count`
5. the route returns the authoritative post-write summary from the database
6. public discovery and detail render `★ <rating>` when ratings exist or `New` when they do not

Rules:
- rollout requires the ratings RPC migration to be applied before the route is released
- no login is required for the current lightweight rating flow
- no comments or full review system exist yet
- rating writes stay separate from `user_events`
- summary ownership stays in Postgres so concurrent inserts do not depend on Node-side full-table recalculation

## Discovery Retention State

The public app keeps a small amount of client-only memory:

- `localStorage` stores recently viewed vendors
- `localStorage` stores the last selected vendor
- `sessionStorage` stores a short-lived discovery snapshot for back-navigation recovery
- vendor detail visits update recently viewed memory
- list selection updates last-selected memory
- discovery snapshots currently expire after 5 minutes and are only restored when the nearby vendor payload is still fresh enough to trust
- admin vendor mutations invalidate discovery snapshots through the shared public invalidation channel so restored discovery state cannot outlive a vendor edit, deactivate, hours change, image change, or featured-dish change
- these helpers improve return navigation without requiring login or backend persistence

## Operational Caveats

- structured logs exist for auth, abuse protection, analytics, audit-log flows, and the admin logs surface, but the repo does not yet provide distributed tracing or a centralized observability backend
- public discovery prefers graceful degraded responses over hard crashes, so some upstream nearby failures may surface as unexpectedly empty vendor results until logs or smoke checks are reviewed
- the current real map intentionally ships without clustering; revisit clustering only if pilot density makes marker usability worse than the current single-marker interaction model

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
- Supabase candidate query pushes `price_band`, `category`, and base `search` matching into the vendor read before app-side ranking.
- Application ranking reads aggregated usage scores through a SQL RPC rather than fetching raw `user_events` rows into application memory.
- Nearby discovery falls back to a service-role `user_events` read when that RPC is unavailable in a partially migrated environment so the endpoint stays live during rollout.
- Application logic calculates exact Haversine distance for each candidate.
- Application logic applies radius filtering and returns `distance_km` for each candidate.
- Final discovery ordering is handled as:
  1. open-now priority
  2. distance within the same open/closed group
  3. usage-signal `ranking_score` only when vendors are similarly close, currently within about `0.5` km
  4. vendor name/id as stable tie-breakers
- Search, category, price, radius, and open-now filters constrain the candidate set before ranking; search relevance does not override the open/distance/close-popularity contract.
- Sponsored/promoted ranking is not implemented.
- Nearby discovery returns at most `50` vendors per request after filtering and ordering so the map/list payload stays bounded.
- Default nearby radius is 10 km when `radius_km` is not provided.
- Missing user coordinates resolve to the Abuja default city view before the nearby query runs.

### Directions
Use Google Maps deep links using vendor coordinates. Google Maps is not the embedded discovery renderer.

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
