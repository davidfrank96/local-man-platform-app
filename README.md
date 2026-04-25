## Title
The Local Man

## Summary
The Local Man is a location-based local food discovery platform designed to help users find nearby underrepresented food vendors, starting with Abuja, Nigeria.

## MVP Goal
Let users discover nearby food vendors, see what they sell, know whether they are open, and either call them or get directions.

## Core Stack
- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Google Maps deep links for directions

## Project Structure
- `app/` - Next.js App Router pages, layouts, and route entry points.
- `components/` - Admin and public UI components.
- `hooks/` - Shared React hooks.
- `lib/` - Shared constants, helpers, clients, and services.
- `types/` - Shared TypeScript types.
- `docs/` - Source-of-truth product, architecture, API, UI, task, testing, and ops docs.
- `supabase/` - Database migrations and seed files.
- `tests/` - Automated tests.

## Local Setup
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in local values when services are available.
3. Start the dev server with `npm run dev`.
4. Run `npm test`, `npm run lint`, and `npm run typecheck` before shipping changes.

## Runtime Validation
Before shipping or continuing broad feature work, validate the Supabase-backed nearby vendor flow:

1. Apply `supabase/migrations/20260422180000_initial_schema.sql`.
2. Apply `supabase/seed/20260422_abuja_pilot_seed.sql`.
3. Start the app with real Supabase env vars.
4. Run `npm run smoke:nearby`.

Exact steps are in `docs/ops/RUNTIME_SETUP.md`.

## Current Phase 5 Surface
Phase 5 is `UX Polish & Real-User Feedback Iteration`.

The current implementation includes:
- public discovery with vendor cards, map preview, selected vendor preview, search, filters, and back-navigation state restoration
- vendor cards with distance, open/closed state, `Today:` hours, featured dish, price label, area, rating or `New`, call, directions, and visible details link
- vendor detail pages with weekly hours, featured dishes, image fallback, and a safe `Back to map` flow
- browser/device geolocation with retry, human-readable reverse location labels when available, approximate/default-city fallback, and explicit accuracy messaging
- client-local morning, afternoon, and night discovery theming
- admin login with Supabase email/password session validation
- admin vendor create, edit, deactivate, hours, featured dishes, and image upload/removal flows
- runtime validation and nearby smoke testing against seeded Abuja pilot data

## How to Work in This Repo
1. Read the docs.
2. Check current sprint.
3. Make small changes.
4. Keep implementation aligned with PRD.
5. Update docs when needed.
