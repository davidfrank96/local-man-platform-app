## Title
The Local Man — Roadmap

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
- `Today:` hours on cards
- selected vendor highlight and selected preview actions
- browser-back and `Back to map` restoration
- Apply button restoration after navigation
- time-based morning, afternoon, and night discovery theming
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
- vendor performance ranking and recent activity review
- drop-off signal visibility for search, selection, and detail-action gaps
- stronger pilot observation
- operator-facing signal review workflows
- evidence-based prioritization for the next product changes

## After Phase 6
Potential future work only after real usage signals justify it:
- real Google Maps JavaScript integration
- live IP approximation provider selection
- stronger deployment monitoring and analytics
- broader city rollout
