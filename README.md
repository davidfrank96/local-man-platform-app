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
- Google Maps

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

## Current Phase 2 Surface
- Runtime activation scripts and nearby smoke testing are available.
- Admin vendor CRUD, hours, image metadata, featured dish routes, and minimal token-based admin UI are implemented.
- Public discovery, vendor cards, search/filter controls, vendor detail pages, call actions, and directions actions are implemented.

## How to Work in This Repo
1. Read the docs.
2. Check current sprint.
3. Make small changes.
4. Keep implementation aligned with PRD.
5. Update docs when needed.
