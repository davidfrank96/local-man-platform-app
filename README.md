## The Local Man

The Local Man is a location-based food discovery product for finding nearby local vendors, starting with Abuja, Nigeria. The public app helps people see nearby vendors, whether they are open, what they sell, and how to call or reach them. The admin app supports vendor onboarding, maintenance, media upload, and content completeness review.

## Product Surface

### Public
- discovery homepage with nearby vendors, search, filters, and map preview
- discovery ordering that prioritizes:
  - open vendors first
  - stronger search matches
  - usage-signal ranking
  - distance as the final tie-breaker
- vendor cards with:
  - name
  - distance
  - open/closed state
  - `Today:` hours
  - featured dish
  - price band
  - area
  - rating or `New`
  - call, directions, and detail actions
- popular-vendor highlighting when ranking signals exist
- selected vendor preview
- vendor detail pages with weekly hours, featured dishes, vendor images, and `Back to map`
- lightweight vendor rating input with 1-5 stars and no comments
- local retention helpers:
  - recently viewed vendors
  - last selected vendor memory
  - popular vendors near you
- trust-first location behavior:
  - precise browser geolocation
  - approximate location only when usable and clearly labeled
  - Abuja default city fallback without claiming it is the user’s exact location
- morning, afternoon, and night discovery themes based on browser-local time

### Admin
- Supabase email/password admin login
- admin dashboard overview cards and quick actions
- admin analytics dashboard for lightweight usage signals
- vendor registry with completeness badges
- vendor create workflow with:
  - basic details
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

## Local Setup
1. Install dependencies:
   - `npm install`
2. Create `.env.local`
3. Set required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Start the app:
   - `npm run dev`
5. Run the standard verification set:
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

## Phase 5 Summary
Phase 5 delivered:
- vendor card redesign
- `Today:` hours on cards
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
