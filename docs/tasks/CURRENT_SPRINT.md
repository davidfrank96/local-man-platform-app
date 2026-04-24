## Title
The Local Man — Current Sprint

## Sprint Goal
Complete Phase 4 usability and pilot-readiness work without expanding beyond the MVP.

## In Scope
- improve admin vendor creation and editing usability
- remove manual slug mistakes with auto-generation and validation feedback
- replace manual admin token paste with a usable login and session flow
- support vendor image upload and removal through Supabase Storage
- improve vendor detail content quality for partial data
- improve public location fallback messaging
- document launch-day and pilot operations clearly
- keep tests, docs, and API contracts aligned

## Out of Scope
- delivery
- payments
- chat
- loyalty
- vendor self-signup
- complex role management
- concrete IP approximation provider selection
- real Google Maps JavaScript integration
- broad visual redesign

## Done Criteria
Phase 4 is done when:
- admins can create and edit vendors without manual slug errors
- admin login no longer depends on manually pasted JWTs
- vendor images can be uploaded, listed, and removed reliably
- public vendor detail pages degrade cleanly with partial data
- location fallback messaging is clear on mobile and desktop
- pilot operations steps are documented in a practical checklist
- typecheck, lint, unit tests, build, and browser smoke tests pass

## Current Phase 4 Status
- Admin vendor forms auto-generate valid slugs and reject invalid slug edits.
- Admin create and edit forms show clearer inline validation feedback.
- Admin routes use Supabase email/password login and session validation instead of manual token paste.
- Admin vendor images use the `vendor-images` Supabase Storage bucket for upload and removal.
- Public vendor detail pages show stronger summary content and explicit fallback copy for missing fields.
- Public location handling keeps the 10-second precise-location timeout and clearer Abuja fallback messaging.
- Pilot operator documentation now exists in `docs/ops/PILOT_CHECKLIST.md`.
- Unit tests, build, and browser smoke tests cover the highest-risk Phase 4 paths.

## Current Phase 4 Warnings
- IP approximation is still an interface only; there is no concrete provider yet.
- Public map rendering is still the MVP coordinate grid rather than a real map SDK.
- Admin auth uses browser-stored session state and bearer-backed API requests rather than an HTTP-only cookie SSR model.
- Seed and legacy image rows may still have null `storage_object_path`; newly uploaded images are storage-backed.
- Pilot quality still depends on operators entering complete vendor data.

## Pilot Readiness Gate
Before pilot launch:
- confirm `docs/ops/RUNTIME_SETUP.md` passes end to end on the target Supabase project
- confirm `docs/ops/PILOT_CHECKLIST.md` is followed for vendor data, admin onboarding, and smoke checks
- confirm admin login works for a real `admin_users` account
- confirm image upload works against the real Supabase bucket
- confirm `npm run smoke:nearby` passes against the real environment
- confirm browser smoke tests still pass against the current build

## Phase 4 Boundaries
Completed surfaces:
- Phase 4A admin data-entry usability
- Phase 4B admin authentication usability
- Phase 4C vendor image management
- Phase 4D location and discovery refinement
- Phase 4E pilot operations documentation

Still not allowed:
- delivery, payments, chat, loyalty, coupons, inventory, or vendor self-signup
- broad visual polish unrelated to real usability or pilot operation
