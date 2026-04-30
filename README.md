## The Local Man

The Local Man is a location-based food discovery product for finding nearby local vendors, starting with Abuja, Nigeria. The public app helps people see nearby vendors, whether they are open, what they sell, and how to call or reach them. The admin app supports vendor onboarding, maintenance, media upload, and content completeness review.

## Product Surface

### Public
- discovery homepage with map-first nearby vendors, floating mobile search, desktop search/filter bar, and map preview
- discovery ordering that prioritizes:
  - open vendors first
  - stronger search matches
  - usage-signal ranking
  - distance as the final tie-breaker
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
- vendor detail pages with compact top summary, weekly hours, featured dishes, vendor images, and `Back to map`
- lightweight vendor rating input with 1-5 stars and no comments
- local retention helpers:
  - recently viewed vendors
  - last selected vendor memory
  - popular vendors near you
- trust-first location behavior:
  - precise browser geolocation
  - approximate location only when usable and clearly labeled
  - Abuja default city fallback without claiming it is the user’s exact location
- lightweight location reminder toast on discovery load with auto-dismiss and manual close
- morning, afternoon, and night discovery themes based on browser-local time

### Admin
- Supabase email/password admin login
- role-aware admin landing and dashboards:
  - `/admin/dashboard` for admins
  - `/admin/agent` for agents
- admin dashboard overview cards and quick actions
- admin analytics dashboard for lightweight usage signals and team activity
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
- centralized UI error boundary and toast notifications

## Tech Stack
- Next.js App Router
- TypeScript
- React
- global CSS styling
- Supabase Postgres
- Supabase Auth
- Supabase Storage
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
3. Set required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Apply database migrations before local development:
   - `npm run db:migrate`
5. Verify local schema, functions, and policies:
   - `npm run db:check`
6. Start the app:
   - `npm run dev`
7. Run the standard verification set:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run test:e2e`
   - `npm run build`

## Required Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

`SUPABASE_SERVICE_ROLE_KEY` is required for:

- admin user creation
- public analytics event writes at `/api/events`
- backend analytics and audit-log fallback routes
- server-side vendor image storage operations

Additional runtime and database-script variables are documented in [docs/ops/RUNTIME_SETUP.md](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/docs/ops/RUNTIME_SETUP.md).

## Deployment Notes
- production deployment target: DigitalOcean App Platform
- backend services: Supabase Postgres, Auth, and Storage
- vendor image bucket: `vendor-images`
- local development and smoke testing use `http://localhost:3000`

## Runtime Validation
Before deployment or major continuation work, keep the runtime gate green:

1. apply migrations
2. seed the Abuja pilot dataset
3. start the app with real Supabase env vars
4. run:
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
- discovery refinement from real usage signals:
  - open-now priority
  - improved relevance ordering
  - clearer filter state
  - lower-friction vendor return paths
- lightweight client-side retention:
  - recently viewed vendors
  - last selected vendor memory
  - popular vendors near you
- simple public vendor ratings with aggregate score display
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
- summary cards, vendor performance, drop-off signals, and recent activity
- non-blocking tracking writes that must never interfere with public discovery
- direct Supabase analytics reads in production, with backend fallback routes retained for development and operational debugging

## Admin and Agent Summary

Current admin workspace behavior:

- `admin`
  - full dashboard
  - analytics
  - team management
  - audit-log visibility
  - vendor create/edit/delete
- `agent`
  - redirected to `/admin/agent`
  - full Create Vendor page
  - vendor list
  - vendor edit workspace
  - CSV vendor intake
  - no analytics, no team management, no audit-log access

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
- trust-first location display and retry behavior
- admin dashboard restructuring
- fuller vendor onboarding flow
- vendor image upload pipeline fixes
- featured dish add/remove management
- simplified 12-hour admin hours input

## Working Rules
- update docs when behavior changes
- keep runtime and smoke checks aligned with Supabase-backed behavior
- keep vendor slugs stable after creation unless explicitly edited
- keep vendor cards text-first and image-free on discovery/list surfaces
