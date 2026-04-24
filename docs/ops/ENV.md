## Title
The Local Man — Environment Variables

## Frontend / App
- `NEXT_PUBLIC_APP_URL`: public application origin used by smoke scripts and client-side API helpers.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: browser Google Maps key for a future real map provider integration.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL. Required by public read routes and admin route verification.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key for RLS-protected public reads and admin-user authenticated writes.

## Server / Secure
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key reserved for controlled setup tasks if needed later.
- `DATABASE_URL`: direct database connection string for migrations or server-only maintenance tasks.
- `GOOGLE_MAPS_SERVER_API_KEY`: server-only Google API key for future geocoding or admin address workflows.
- `ADMIN_SEED_EMAIL`: initial admin account email for seed/setup workflows.
- `ADMIN_SEED_PASSWORD`: initial admin account password for seed/setup workflows.

## Runtime Requirements
- Local static checks and unit tests do not require environment variables.
- Public Supabase-backed routes require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Admin login uses the public Supabase env vars for browser email/password sign-in.
- Admin routes still require an `Authorization: Bearer <supabase-access-token>` request header for an authenticated `admin_users` member.
- Vendor image uploads use the admin bearer session plus the `vendor-images` Supabase Storage bucket created by the migration.
- Current public map rendering uses the local MVP coordinate grid; Google Maps keys are documented but not required for current tests.

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
