## Title
The Local Man — Environment Variables

## Frontend / App
- `NEXT_PUBLIC_APP_URL`: public application origin for links and callbacks. Not required by current Phase 1 route logic.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: browser Google Maps key for the future public map UI.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL. Required by `GET /api/vendors/nearby`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key for public read queries protected by RLS. Required by `GET /api/vendors/nearby`.

## Server / Secure
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for future admin write workflows and controlled seed/admin tasks.
- `DATABASE_URL`: direct database connection string for migrations or server-only maintenance tasks.
- `GOOGLE_MAPS_SERVER_API_KEY`: server-only Google API key for future geocoding or admin address workflows.
- `ADMIN_SEED_EMAIL`: initial admin account email for seed/setup workflows.
- `ADMIN_SEED_PASSWORD`: initial admin account password for seed/setup workflows.

## Phase 1 Runtime Requirements
- Local static checks and unit tests do not require environment variables.
- `GET /api/vendors/nearby` requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Map rendering is not implemented in Phase 1, so Google Maps keys are documented but not required for current tests.
- Admin write routes are contract stubs in Phase 1, so secure admin variables are documented but not consumed by route logic yet.

## Runtime Smoke Test
- `SMOKE_NEARBY_LAT`: optional latitude override for `npm run smoke:nearby`.
- `SMOKE_NEARBY_LNG`: optional longitude override for `npm run smoke:nearby`.
- `SMOKE_NEARBY_RADIUS_KM`: optional radius override for `npm run smoke:nearby`.
- `SMOKE_NEARBY_TIGHT_RADIUS_KM`: optional tight-radius override for radius filtering checks.

Exact migration, seed, and nearby smoke test steps are documented in `docs/ops/RUNTIME_SETUP.md`.

## Runtime Environment Checks
- `npm run runtime:check-env` verifies `.env.local`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm run runtime:check-db-env` also verifies `DATABASE_URL` for local `psql` migration and seed commands.
- `npm run db:migrate` and `npm run db:seed:abuja` load `.env.local` before invoking `psql`.

## Rules
- Never expose server secrets to client code.
- Document where each variable is used.
- Keep separate values for local, staging, and production.
