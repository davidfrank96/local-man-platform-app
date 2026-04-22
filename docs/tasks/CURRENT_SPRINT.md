## Title
The Local Man — Current Sprint

## Sprint Goal
Complete Phase 1 foundation so implementation can begin without architectural drift.

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

## Remaining Phase 1 Gaps
- Supabase migration has not been executed locally because Supabase CLI and `psql` are unavailable.
- IP approximation provider is an interface only; no concrete provider is selected.
- Nearby API depends on Supabase environment variables and seeded vendor data for end-to-end runtime verification.
