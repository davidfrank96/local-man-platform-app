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
- `components/` - Shared UI components.
- `features/admin/` - Admin-only vendor management workflows.
- `features/maps/` - Map, location, and directions behavior.
- `features/search/` - Search and filter behavior.
- `features/vendors/` - Vendor profile and listing behavior.
- `hooks/` - Shared React hooks.
- `lib/` - Shared constants, helpers, clients, and services.
- `public/` - Static assets.
- `styles/` - Design tokens and global style support.
- `types/` - Shared TypeScript types.
- `docs/` - Source-of-truth product, architecture, API, UI, task, testing, and ops docs.
- `supabase/` - Database migrations and seed files.
- `tests/` - Automated tests.

## Local Setup
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in local values when services are available.
3. Start the dev server with `npm run dev`.
4. Run `npm test`, `npm run lint`, and `npm run typecheck` before shipping changes.

## How to Work in This Repo
1. Read the docs.
2. Check current sprint.
3. Make small changes.
4. Keep implementation aligned with PRD.
5. Update docs when needed.
