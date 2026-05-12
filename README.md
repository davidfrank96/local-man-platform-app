## The Local Man

The Local Man is a location-based food discovery product for finding nearby local vendors, starting with Abuja, Nigeria. The public app helps people see nearby vendors, whether they are open, what they sell, and how to call or reach them. The admin app supports vendor onboarding, maintenance, media upload, and content completeness review.

## Product Surface

### Public
- discovery homepage with map-first nearby vendors, floating mobile search, desktop search/filter bar, and an optional MapLibre map plus coordinate fallback
- discovery ordering that prioritizes:
  - open vendors first
  - distance within the same open/closed group
  - usage-signal ranking from real engagement events only as a close-distance tie-breaker
  - capped nearby payloads so the map and list stay bounded
- vendor cards with:
  - name
  - distance
  - open/closed state
  - `Active hours:` on discovery cards
  - featured dish
  - price band
  - area
  - rating or `New`
  - call, directions, and detail actions
  - no vendor card photos or thumbnails
- popular-vendor highlighting when ranking signals exist
- selected vendor preview below the map on mobile and beside the map on web
  - selected vendor name
  - distance
  - open/closed state
  - `Active hours:`
  - featured dish or short description cue when available
  - area
  - call, directions, and detail actions
- MapLibre rendered with a single vendor-marker system:
  - oxblood storefront vendor markers
  - green storefront marker state for the selected vendor
  - blue user-location marker
  - marker tap selects a vendor without moving the map
  - vendor-card selection may gently focus the map
  - no clustering in the current release
- vendor detail pages with compact top summary, weekly hours, featured dishes, vendor images, and `Back to map`
- lightweight vendor rating input with 1-5 stars, no comments, and one rating per vendor per anonymous browser identity
- public abuse protection on write-heavy and search-heavy routes:
  - `/api/events` rate limits repeated event floods and deduplicates immediate retry payloads
  - `/api/vendors/[slug]/ratings` rate limits repeated rating spam, collapses duplicate retry submissions, and rejects repeat ratings for the same vendor/browser identity
  - `/api/vendors/nearby` rate limits search-bearing abuse traffic without throttling normal default-city browsing
- local retention helpers:
  - recently viewed vendors
  - last selected vendor memory
  - popular vendors near you
- trust-first location behavior:
  - precise browser geolocation
  - approximate location only when usable and clearly labeled
  - Abuja default city fallback without claiming it is the user’s exact location
- lightweight location reminder toast on discovery load with auto-dismiss and manual close
- bounded public discovery freshness:
  - nearby vendor reads use a short 5 second server revalidation window
  - session snapshot restore expires after 5 minutes
  - restored discovery data yields to one live nearby fetch before it becomes authoritative again
  - admin vendor mutations invalidate restored public discovery vendor data
- morning, afternoon, and night discovery themes based on browser-local time

### Admin
- Supabase email/password admin login with secure HTTP-only cookie-backed sessions
- explicit privilege assignment through `admin_users`; authenticated users without a team-access row are denied the workspace
- role-aware admin landing and dashboards:
  - `/admin/dashboard` for admins
  - `/admin/agent` for agents
- admin dashboard overview cards and quick actions
- admin analytics dashboard for lightweight usage signals
- dedicated admin activity page for recent team activity
- dedicated admin logs page for recent operational warnings, failures, degraded responses, and slow requests
- admin team access page at `/admin/team`
- vendor registry with completeness badges
- full Create Vendor page for both admins and agents
- CSV vendor intake with the same schema and persistence contract as the full Create Vendor page
- vendor create workflow with:
  - basic details
  - category
  - opening hours
  - featured dishes
  - vendor image selection
  - missing-data acknowledgements
  - review summary before create
- focused vendor edit workspace for:
  - basic details
  - hours
  - featured dishes
  - vendor images
- workspace team management for admins:
  - create admin/agent
  - update admin/agent role and name
  - delete admin/agent
  - recover existing auth users cleanly, mirror role metadata, and refresh the list from the authoritative team-access API
- centralized UI error boundary and toast notifications

## Tech Stack
- Next.js App Router
- TypeScript
- React
- global CSS styling
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- MapLibre GL JS
- MapTiler browser style URL for the real map
- Google Maps deep links for directions

## Project Structure
- `app/` - App Router pages and route handlers
- `components/` - admin and public UI
- `hooks/` - shared React hooks
- `lib/` - shared helpers, services, validation, and clients
- `types/` - shared TypeScript domain and API types
- `tests/` - unit and browser tests
- `docs/` - architecture, API, UI, ops, testing, and task docs
- `supabase/` - migrations, seeds, and ops SQL

## UI Documentation
- [docs/ui.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/ui.md) - current UI overview and behavior
- [docs/layout.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/layout.md) - mobile/web layout structure and ordering
- [docs/navigation.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/navigation.md) - search, filters, section navigation, and route-return behavior
- [docs/vendor-cards.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/vendor-cards.md) - discovery-card and selected-vendor rules
- [docs/location.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/location.md) - popup, retry UI, and location trust behavior
- [docs/performance.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/performance.md) - low-bandwidth and UI-stability constraints
- [docs/qa-checklist.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/qa-checklist.md) - release and regression checklist
- [docs/rbac.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/rbac.md) - admin and agent role rules
- [docs/audit-logs.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/audit-logs.md) - workspace audit logging behavior
- [docs/analytics.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/analytics.md) - public event tracking and admin analytics reads
- [docs/error-handling.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/error-handling.md) - shared error contract, toast system, and error boundary

## Local Setup
1. Install dependencies:
   - `npm install`
2. Create `.env.local`
3. Set core environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Set `NEXT_PUBLIC_MAP_STYLE_URL` if you want the real MapLibre map locally:
   - example: `https://api.maptiler.com/maps/openstreetmap/style.json?key=...`
   - if omitted, the app uses the built-in coordinate fallback map
5. Optional bootstrap values:
   - `ADMIN_SEED_EMAIL`
   - `ADMIN_SEED_PASSWORD`
6. Apply database migrations before local development:
   - `npm run db:migrate`
7. Verify local schema, functions, and policies:
   - `npm run db:check`
8. Start the app:
   - `npm run dev`
9. Run the standard verification set:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run test:e2e`
   - `npm run build`

Runtime safety note:
- `npm run build` now refuses to run while `npm run dev` is active in the same workspace, so the build step cannot wipe or corrupt the live Turbopack dev cache.

## Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
NEXT_PUBLIC_MAP_STYLE_URL=<browser-safe-maptiler-style-json-url>
```

Optional bootstrap and ops variables:

```text
ADMIN_SEED_EMAIL=<initial-admin-email>
ADMIN_SEED_PASSWORD=<initial-admin-password>
DATABASE_URL=<postgres-connection-string-for-migrations-and-seeds>
LOCALMAN_LOG_LEVEL=<debug|info|warn|error>
LOCALMAN_ENABLE_DEBUG_LOGS=<true|false>
LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=<true|false>
LOCALMAN_RUNTIME_ENVIRONMENT=<local|staging|production>
LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS=<days>
```

`NEXT_PUBLIC_MAP_STYLE_URL` is optional for overall app startup, but required if you want the real tiled MapLibre map instead of the fallback coordinate map.

Use a browser-safe MapLibre-compatible style URL such as a MapTiler hosted `style.json` endpoint. Do not place server secrets in this value. If your provider requires authentication, use a public token or a style URL that is safe to expose in the browser.

`SUPABASE_SERVICE_ROLE_KEY` is required for:

- admin user creation
- public analytics event writes at `/api/events`
- public vendor rating writes at `/api/vendors/[slug]/ratings`
- backend analytics and audit-log routes
- server-side vendor image storage operations

Privileged admin and agent sessions are now stored in same-origin HTTP-only cookies rather than browser-visible `localStorage` or `sessionStorage`. The browser admin app signs in through `/api/admin/login`, restores identity through `/api/admin/session`, and signs out through `/api/admin/logout`.
Authentication alone is not enough for workspace access: the authenticated user must already exist in `admin_users`.

Server-side runtime logging is standardized through `lib/observability.ts`:
- logs are structured and include stable event names plus request ids where available
- logger metadata is redacted for secrets, tokens, cookies, raw request bodies, and database URLs
- `LOCALMAN_LOG_LEVEL` defaults to `info`
- debug output stays off unless `LOCALMAN_ENABLE_DEBUG_LOGS=true` or `LOCALMAN_LOG_LEVEL=debug`
- `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=true` enables bounded storage of selected warn/error/slow/rate-limited events and selected admin mutation events in `public.operational_events`
- operational event storage is separate from `audit_logs` and does not store secrets, cookies, auth headers, passwords, raw request bodies, or stack traces
- admins can review recent persisted operational events at `/admin/logs` when storage is enabled
- when storage stays disabled, the `/admin/logs` page should load but remain empty; that is expected behavior rather than a runtime failure
- recent operational events are retained through DB cleanup discipline rather than a full external monitoring platform in this phase
- changing `LOCALMAN_*` observability env vars requires a dev-server restart locally or a fresh DigitalOcean rebuild/redeploy in production

Public abuse protection is centralized server-side in the API layer:
- `/api/admin/login`: `5` attempts per `10` minutes per IP/email with a `15` minute block window
- `/api/events`: `120` accepted requests per `5` minutes per client/IP with a short duplicate-submission collapse window
- `/api/vendors/[slug]/ratings`: one accepted submission per vendor per anonymous browser identity, plus `8` accepted submissions per `10` minutes per client/IP with duplicate rating retry collapse
- `/api/vendors/nearby` search requests only: `45` requests per minute per client/IP with a `2` minute block window
- public limiter correlation may issue a non-privileged HTTP-only cookie so repeated browser abuse cannot avoid the per-IP bucket simply by retrying
- the current limiter is in-memory and process-local, so it is best-effort for a single app instance rather than a distributed global throttle

Additional runtime and database-script variables are documented in [docs/ops/RUNTIME_SETUP.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/ops/RUNTIME_SETUP.md).

## Deployment Notes
- production deployment target: DigitalOcean App Platform
- backend services: Supabase Postgres, Auth, and Storage
- real map provider: MapLibre using a MapTiler style URL exposed through `NEXT_PUBLIC_MAP_STYLE_URL`
- vendor image bucket: `vendor-images`; uploaded vendor photos keep the `5 MB` input cap and are optimized server-side with `sharp` before Storage upload when compression is beneficial
- local development and smoke testing use `http://localhost:3000`
- local dev smoke and operator checks may also use `http://127.0.0.1:3000`; `next.config.ts` explicitly allows that origin so HMR and chunk requests are not blocked
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only in DigitalOcean runtime secrets
- the MapTiler key embedded in `NEXT_PUBLIC_MAP_STYLE_URL` must be browser-safe because the value is public
- after changing Supabase or map env vars in DigitalOcean, trigger a redeploy so Next.js rebuilds with the updated public env
- after changing `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE`, `LOCALMAN_RUNTIME_ENVIRONMENT`, or `LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS`, restart the local server or trigger a new DigitalOcean deploy before validating `/admin/logs`
- release candidates should come from a clean committed worktree; DigitalOcean builds from the tracked repository state, not local untracked route files or local `.next` output
- schema-changing releases must apply migrations before the new app build is promoted
- current migrations are additive; rollback should restore the previous app deploy first rather than manually removing applied schema objects unless a migration defect is confirmed

## Runtime Validation
Before deployment or major continuation work, keep the runtime gate green:

1. apply migrations
2. run `npm run db:check`
3. seed the Abuja pilot dataset
4. start the app with real Supabase env vars
5. run:
   - `npm run smoke:nearby`

Exact runtime steps are documented in [docs/ops/RUNTIME_SETUP.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/ops/RUNTIME_SETUP.md).

## Phase Summary
- Phase 1 — Foundation
- Phase 2 — Core product
- Phase 3 — Stability & testing
- Phase 4 — Usability & admin baseline
- Phase 5 — UX polish & real-user iteration
- Phase 6 — Usage signals

## Phase 6 Summary
Phase 6 currently covers:
- lightweight first-party public event tracking
- usage-signal vendor ranking from tracked public behavior
- nearby ranking aggregation executed in SQL for candidate vendor ids only
- discovery refinement from real usage signals:
  - open-now priority
  - distance-first ordering within each open/closed group
  - usage-signal ranking only as a close-distance tie-breaker
  - clearer filter state
  - lower-friction vendor return paths
- lightweight client-side retention:
  - recently viewed vendors
  - last selected vendor memory
  - popular vendors near you
- simple public vendor ratings with aggregate score display and one anonymous browser rating per vendor
- tracked events:
  - `session_started`
  - `first_interaction`
  - `last_interaction`
  - `vendor_selected`
  - `vendor_detail_opened`
  - `call_clicked`
  - `directions_clicked`
  - `search_used`
- `filter_applied`
- admin-only analytics route at `/admin/analytics`
- admin-only activity route at `/admin/activity`
- admin-only logs route at `/admin/logs`
- summary cards, vendor performance, drop-off signals, recent user events, and dedicated recent team activity review
- operational warning and failure review from persisted structured logs
- non-blocking tracking writes that must never interfere with public discovery
- backend-only analytics reads in production, with the admin analytics route handling RPC and query fallback server-side

## Admin and Agent Summary

Current admin workspace behavior:

- `admin`
  - full dashboard
  - analytics
  - team management
  - audit-log visibility
  - operational-log visibility
  - vendor create/edit/delete
  - sidebar order:
    - Dashboard
    - Analytics
    - Manage vendors
    - Create vendor
    - Team access
    - Activity
    - Logs
- `agent`
  - redirected to `/admin/agent`
  - full Create Vendor page
  - vendor list
  - vendor edit workspace
  - CSV vendor intake
  - no analytics, no team management, no audit-log access, and no operational-log access

Current CSV intake behavior:

- preview validates every row before insert
- valid rows can upload even when other rows fail
- duplicate detection runs:
  - within the CSV
  - against existing vendors
- coordinates are currently required for CSV intake because the vendor schema and create-vendor pipeline require them

## Phase 5 Summary
Phase 5 delivered:
- vendor card redesign
- `Active hours:` on discovery cards
- selected vendor highlight behavior
- browser-back and `Back to map` restoration
- Apply button restoration after navigation
- morning, afternoon, and night discovery theming
- stable MapLibre marker/card synchronization without marker-tap camera drift
- oxblood storefront vendor markers, green selected-marker state, and blue user-location marker
- no clustering in the current shipped map interaction model
- trust-first location display and retry behavior
- admin dashboard restructuring
- fuller vendor onboarding flow
- vendor image upload pipeline fixes
- vendor image upload state isolation across vendor switches
- vendor image metadata-row verification before upload success responses
- featured dish add/remove management
- simplified 12-hour admin hours input

## Current Release-Gate Notes
The latest full-platform gate verified the upload, cache, admin, public discovery, map, ratings, DB, and production build paths together. The highest-risk upload checks now include real cross-vendor uploads in both dev and local production runtime:
- selecting an image must not reload or reset the page
- switching vendors must clear pending file refs and local previews
- upload requests must use the current native file input value
- uploaded image rows must belong to the selected vendor id
- operational upload logs must show the current filename, size, MIME type, request id, and vendor id
- a successful upload response must require the `vendor_images` metadata row to be returned

Production promotion still requires a clean committed worktree and a green dependency audit. A high-severity `npm audit` result is treated as a deployment blocker even when functional tests pass.

## Working Rules
- update docs when behavior changes
- keep runtime and smoke checks aligned with Supabase-backed behavior
- keep vendor slugs stable after creation unless explicitly edited
- keep vendor cards text-first and image-free on discovery/list surfaces
