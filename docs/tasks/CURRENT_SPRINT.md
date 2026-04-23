## Title
The Local Man — Current Sprint

## Sprint Goal
Complete the Phase 2 release gate across runtime activation, admin data operations, and public discovery without expanding beyond the MVP.

## In Scope
- validate runtime environment variables
- apply and smoke-test the Supabase-backed Abuja seed flow
- keep admin operations behind Supabase admin auth
- support vendor CRUD, hours, image metadata, featured dishes, and audit log writes
- provide minimal functional admin screens
- provide public map/list discovery, search, filters, vendor detail, call, and directions actions
- keep tests, docs, and API contracts aligned

## Out of Scope
- production deployment
- full visual polish
- concrete IP location provider selection
- real Google Maps JavaScript rendering
- delivery, payments, chat, loyalty, coupons, inventory, or vendor self-signup

## Done Criteria
Phase 2 is done when:
- runtime env checks pass
- nearby smoke test passes against real Supabase env vars and seeded Abuja data
- admin route tests pass for auth, vendor CRUD, sub-resources, and audit logs
- public route/client tests pass for categories, vendor detail, nearby queries, call links, and directions links
- typecheck, lint, and production build pass
- docs reflect the implemented Phase 2A, Phase 2B, and Phase 2C surfaces

## Current Phase 2 Status
- Product, architecture, schema, API, UI, roadmap, sprint, testing, ops, agent, and README docs exist.
- Next.js App Router scaffold exists.
- Supabase initial schema migration and Abuja pilot seed SQL exist.
- Runtime setup, env checks, migration, seed, and nearby smoke scripts exist.
- Nearby vendor distance logic uses dynamic Haversine calculation with bounding-box candidate filtering.
- Browser geolocation, IP approximation interface, and Abuja fallback handling exist.
- Admin auth boundary exists for admin route protection.
- Admin vendor list, create, update, and soft-delete routes call typed service methods.
- Admin vendor create, update, and soft-delete routes write audit logs.
- Admin vendor hours, image metadata, and featured dish routes call typed service methods and write audit logs.
- Minimal admin UI exists for token-based vendor list, create, update, deactivate, hours, image metadata, and featured dish operations.
- Admin UI routes exist at `/admin`, `/admin/vendors`, `/admin/vendors/new`, and `/admin/vendors/[id]`.
- Public discovery UI exists for map/list search, location fallback handling, vendor cards, filters, call actions, and directions actions.
- Public vendor detail and category routes now call Supabase REST.
- Unit tests cover distance, location acquisition, nearby filtering, public API/client behavior, admin auth, admin vendor CRUD, and admin sub-resources.

## Remaining Phase 2 Warnings
- IP approximation provider is an interface only; no concrete provider is selected.
- Public map rendering uses the MVP coordinate grid, not the final Google Maps JavaScript API integration.
- Admin UI uses pasted Supabase access tokens until a fuller admin login flow is implemented.
- Browser-level accessibility and responsive screenshot tests are not automated yet.

## Runtime Validation Gate
Before deployment or further feature expansion:
- apply `supabase/migrations/20260422180000_initial_schema.sql` to the target Supabase project
- apply `supabase/seed/20260422_abuja_pilot_seed.sql`
- run the seed validation SQL in `docs/ops/RUNTIME_SETUP.md`
- run `npm run smoke:nearby` against the local app with real Supabase env vars
- document any failures before continuing

## Phase 2 Boundaries
Completed surfaces:
- Phase 2A runtime activation checks and nearby smoke test path
- Phase 2B admin auth, data operations, audit logging, and minimal admin forms
- Phase 2C public discovery, search/filter controls, vendor cards, vendor detail, call, and directions actions

Still not allowed:
- visual polish
- delivery, payments, chat, loyalty, coupons, inventory, or vendor self-signup
