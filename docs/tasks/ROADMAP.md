## Title
Local Man — Roadmap

## Phase 1 — Foundation
- product docs
- architecture docs
- schema
- API spec
- UI rules
- repo setup
- migration plan
- seed data plan
- distance and nearby search logic
- user location fallback strategy
- foundation tests for location and nearby logic

## Phase 2 — Core Product
- runtime environment activation
- migration and Abuja seed validation
- nearby API smoke testing
- admin auth foundation
- vendor CRUD
- hours management
- categories and dishes
- audit logging
- public discovery
- nearby vendor map surface
- vendor cards
- search and filters
- vendor details
- directions and call buttons

## Phase 3 — Stability & Testing
- race-condition fixes
- API error handling improvements
- accessibility fixes
- mobile layout hardening
- loading, empty, and error states
- browser smoke tests
- layout stress tests

## Phase 4 — Usability & Admin Baseline
- admin form validation UX
- slug generation and validation
- admin login/session flow
- vendor image upload and removal
- content quality improvements
- pilot operations checklist
- master verification before pilot iteration

## Phase 5 — UX Polish & Real-User Iteration
- compact discovery-oriented vendor cards
- `Active hours:` on cards
- selected vendor highlight and selected preview actions
- browser-back and `Back to map` restoration
- `Apply filters` button restoration after navigation
- time-based morning, afternoon, and night discovery theming
- MapLibre interactive map with fallback coordinate map, selected-preview sync, oxblood storefront vendor markers, green selected-marker state, and no clustering
- trust-first precise, approximate, and default-city location messaging
- reverse location display with human-readable area labels
- structured admin workspace routes for dashboard, registry, create, and edit flows
- full vendor onboarding flow during create vendor
- stable vendor-slug editing behavior for admin updates
- admin create acknowledgements for intentionally incomplete vendor records
- simplified 12-hour admin hours entry
- vendor profile image normalization and clearer admin media workflows
- featured dish add/remove workflow completion
- final regression, runtime, and documentation alignment

Status: completed

## Phase 6 — Usage Signals
- usage signals and real behavior tracking
- lightweight first-party event tracking in `user_events`
- admin-only analytics dashboard at `/admin/analytics`
- admin-only activity page at `/admin/activity`
- admin-only logs page at `/admin/logs`
- vendor performance ranking and recent activity review
- drop-off signal visibility for search, selection, and detail-action gaps
- structured request-traced runtime logging for auth, discovery, ratings, admin mutations, and abuse-protection paths
- bounded `operational_events` persistence for warnings, failures, degraded responses, rate-limit blocks, slow requests, and selected admin mutation events
- discovery ordering informed by usage signals:
  - open-now priority
  - distance-first ordering within the same open/closed group
  - ranking score only as a close-distance tie-breaker
  - search and category remain filters, not sponsored ranking signals
- lightweight client-side retention:
  - recently viewed vendors
  - last selected vendor memory
  - popular vendors near you
- simple public vendor ratings with aggregate score display
- stronger pilot observation
- operator-facing signal review workflows
- evidence-based prioritization for the next product changes

Status: completed

## Phase 7 — Trust, Ranking, and Retention
Potential future work only after real usage signals justify it:
- trust-first location hardening with a real approximate-location provider
- ranking-tuning from live usage signals without making ordering opaque
- retention refinement for recently viewed and last-selected vendor return paths
- distributed abuse protection if production scales beyond a single app instance
- stronger release and runtime observability for graceful-degradation paths
- stronger deployment monitoring and analytics operations
- clustering only if pilot vendor density makes the current single-marker map interaction less usable
- broader city rollout only after Abuja pilot quality is stable

Status: planned

## Current Release Lockdown Baseline
The active branch includes:
- mobile Home/Map/About dock navigation
- shared Home/Map search, category, price, open-now, radius, and selected-vendor state
- request-keyed discovery cache hydration with mock/malformed vendor rejection
- invalid analytics vendor-id skipping before `user_events` insert
- admin session refresh stabilization for form and file-picker state
- vendor image upload state isolation by selected vendor id
- explicit Supabase Data API grants and fail-closed future public-schema defaults
- rating signals with positive-only public confidence badges and admin-only internal signal summaries
- Rider Connect structured availability, max-3 currently available shortlist, masked-plate verification, and selected-rider-only WhatsApp handoff
- vendor detail share section with native share and copy-link actions only

These are release-hardening outcomes, not new roadmap scope.
