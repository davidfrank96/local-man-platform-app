## Title
The Local Man — Current Sprint

## Sprint Goal
Validate the Phase 1 runtime foundation against real Supabase data before broader Phase 2 feature work begins.

## In Scope
- finalize product definition
- finalize architecture
- finalize schema
- finalize API boundaries
- finalize UI rules
- create repo skeleton
- create first migration draft
- create first seed strategy
- define distance and nearby vendor logic
- define user location fallback handling
- add foundation tests for critical location logic

## Out of Scope
- public feature implementation
- admin feature implementation
- production deployment
- full visual polish
- full map UI
- full vendor UI
- full admin CRUD implementation
- concrete IP location provider selection

## Done Criteria
Phase 1 is done when:
- all core docs exist
- docs are internally consistent
- schema supports MVP
- initial migration draft exists
- seed strategy exists
- API route foundation exists
- types and validation foundation exists
- distance calculation and nearby filtering logic exists
- user location acquisition interface exists
- critical location and nearby tests pass
- roadmap is clear
- agent rules are clear
- repo structure exists
- Codex can begin repo setup safely

## Current Foundation Status
- Product, architecture, schema, API, UI, roadmap, sprint, testing, ops, agent, and README docs exist.
- Next.js App Router scaffold exists.
- Supabase initial schema migration exists.
- Abuja seed strategy exists.
- API route foundation exists.
- Type and validation foundation exists.
- Nearby vendor distance logic exists.
- Browser geolocation, IP approximation interface, and Abuja fallback handling exist.
- Unit tests cover distance, nearby filtering, invalid location, fallback location, category filtering, open-now override, and overnight hours.
- Runtime setup documentation exists for migration, Abuja seed data, and nearby API smoke testing.
- Abuja pilot seed SQL exists for 20 non-production test vendors.
- Admin auth boundary exists for admin route protection.
- Admin vendor list, create, update, and soft-delete routes call typed service methods.
- Admin vendor create, update, and soft-delete routes write audit logs.
- Admin vendor hours, image metadata, and featured dish routes call typed service methods and write audit logs.
- Minimal admin UI exists for token-based vendor list, create, update, deactivate, hours, image metadata, and featured dish operations.
- Admin UI routes exist at `/admin`, `/admin/vendors`, `/admin/vendors/new`, and `/admin/vendors/[id]`.
- Public discovery UI exists for map/list search, location fallback handling, vendor cards, filters, call actions, and directions actions.
- Public vendor detail and category routes now call Supabase REST.

## Remaining Phase 1 Gaps
- IP approximation provider is an interface only; no concrete provider is selected.
- Migration and seed execution still require a real Supabase project.
- Nearby API still needs end-to-end smoke validation with real Supabase environment variables and seeded data.
- Public discovery UI still needs live validation after migration and seed succeed.

## Runtime Validation Gate
Before broader Phase 2 implementation:
- apply `supabase/migrations/20260422180000_initial_schema.sql` to the target Supabase project
- apply `supabase/seed/20260422_abuja_pilot_seed.sql`
- run the seed validation SQL in `docs/ops/RUNTIME_SETUP.md`
- run `npm run smoke:nearby` against the local app with real Supabase env vars
- document any failures before continuing

## Phase 2A Admin Foundation Scope
Allowed after runtime validation is complete or fully prepared:
- admin auth structure
- vendor CRUD route structure
- form/request validation boundaries
- minimal functional admin forms for existing backend routes

Not allowed yet:
- visual polish
- admin product polish beyond basic operational forms
