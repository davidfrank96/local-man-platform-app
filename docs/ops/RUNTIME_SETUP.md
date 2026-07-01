## Title
Local Man — Runtime Setup and Nearby Smoke Test

## Goal
Validate the real Supabase-backed runtime data flow before deployment or further feature expansion.

This gate verifies:
- the current migration set can be applied to a real Supabase project
- Abuja pilot seed data exists
- `GET /api/vendors/nearby` can read seeded vendors through Supabase RLS
- the API returns computed `distance_km` values with stable discovery ordering
- the nearby response still exposes compact vendor-card fields such as `today_hours`

Keep this runtime gate green before deployment or further feature expansion.

## Current Gate Status
The current runtime gate has executable checks for environment validation and nearby API smoke testing. The standard local verification path is:

```bash
npm run runtime:check-env
npm run runtime:check-db-env
npm run db:migrate
npm run db:check
NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run smoke:nearby
```

If the local app is running on another port, set `NEXT_PUBLIC_APP_URL` to that actual origin before running the smoke command.

The standard local development port for this repo is `http://localhost:3000`. Older references to `3002` or `3003` should be treated as temporary local overrides rather than the default.
`http://127.0.0.1:3000` is also safe for local operator smoke checks because `next.config.ts` explicitly allows that development origin for HMR and chunk requests.

The smoke test verifies precise coordinates, `distance_km`, open-first and distance-first nearby ordering, radius filtering, invalid coordinate rejection, partial coordinate rejection, compact `today_hours`, and the backend Abuja fallback behavior used by direct API/operator checks. The public frontend release gate separately verifies that no-location/no-area users get default Wuse discovery instead of silently loading backend default-city vendors.

## Required Tools
- Node.js and npm
- access to a real Supabase project
- either `psql` with `DATABASE_URL` or the Supabase Dashboard SQL Editor

The local environment currently does not require Supabase CLI. The checked-in SQL files are the source of truth for this runtime validation.

When using the local npm database scripts, `psql` must be installed and available on `PATH`.

## Required Environment Values
Create `.env.local` from `.env.example` and fill:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAP_STYLE_URL=<optional-browser-safe-maptiler-style-json-url>
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
RIDER_CONNECT_HASH_SECRET=<server-only-rider-connect-phone-hash-secret>
DATABASE_URL=<postgres-connection-string>
LOCALMAN_LOG_LEVEL=info
LOCALMAN_ENABLE_DEBUG_LOGS=false
LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=false
LOCALMAN_RUNTIME_ENVIRONMENT=local
LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS=30
```

`DATABASE_URL` is only required for the `npm run db:migrate` and `npm run db:seed:abuja` scripts. Those scripts load `.env.local` before invoking `psql`. If using the Supabase Dashboard SQL Editor, `DATABASE_URL` is not required locally.

`SUPABASE_SERVICE_ROLE_KEY` is required for admin vendor image upload and delete operations, public analytics event writes, public vendor rating writes, Rider Connect server routes, admin analytics reads, and server-side admin user creation.

`RIDER_CONNECT_HASH_SECRET` is required for production-grade Rider Connect phone hashing. It must be server-only. If omitted, the MVP falls back to `SUPABASE_SERVICE_ROLE_KEY`, but rotating the fallback key changes future hashes and can reduce comparability with earlier Rider Connect contact/report rows.

Rider Connect customer phone input must pass the Nigerian phone validation used by the backend. Valid examples are `08012345678`, `+2348012345678`, and `2348012345678`. Manual-address requests require `deliveryAddress`; current-location requests require `deliveryArea`.

`NEXT_PUBLIC_MAP_STYLE_URL` is optional. Set it only if you want the public discovery page to render a real MapLibre map. If it is left empty, the discovery page will continue to use the built-in coordinate fallback map and the rest of the app will behave normally.

`LOCALMAN_LOG_LEVEL` and `LOCALMAN_ENABLE_DEBUG_LOGS` are optional. They control the structured server logger only:
- normal local and production behavior can leave both unset
- use `LOCALMAN_LOG_LEVEL=debug` or `LOCALMAN_ENABLE_DEBUG_LOGS=true` only for deliberate troubleshooting
- emitted server logs include stable event names and safe request ids
- high-value route logs now include duration-aware completion and failure events for auth, admin analytics/activity, vendor mutations, nearby discovery, public ratings, and public event writes
- nearby discovery degraded fallbacks are intentionally still user-safe `200` responses, but logs distinguish true empty results from upstream-failure degraded empties

`LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE` is optional. When set to `true`, selected structured operational events are also written to `public.operational_events` through the server-side logger. The persistence path is best-effort only:
- it is sanitized before insert
- it never stores secrets, cookies, auth headers, passwords, raw request bodies, or raw stack traces
- persistence failures must never break the user request
- when enabled, admins can review recent persisted events in the workspace at `/admin/logs`

`LOCALMAN_RUNTIME_ENVIRONMENT` is optional and tags persisted operational events with a stable environment label.

`LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS` is optional and controls the prune command retention window. The default is `30`.

Operational-event storage expectation:
- when `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=false`, `/admin/logs` should still render but may show `No logs stored yet`
- even with storage enabled, a healthy environment may keep `/admin/logs` fairly sparse because normal successful requests are intentionally not persisted
- after changing any `LOCALMAN_*` observability value locally, restart `npm run dev` or `npm run start`; after changing those values in DigitalOcean, trigger a fresh deploy before validating `/admin/logs`

Current real-map example:

```text
https://api.maptiler.com/maps/openstreetmap/style.json?key=YOUR_PUBLIC_MAPTILER_KEY
```

Supabase requirements:
- Auth must be enabled for admin login
- Storage bucket `vendor-images` must exist
- `vendor-images` must be public for the current vendor image URL strategy
- vendor image uploads use the server-only `sharp` native package to validate and optimize images before Storage upload; the upload route runs on the Node.js runtime and must not be deployed as an Edge route
- vendor image upload success requires both a Storage object and a returned `vendor_images` metadata row; storage-only success is treated as a failed upload
- Rider Connect tables must not be directly anon-readable; public suggestions and handoffs should flow through server routes that shape safe responses and hash customer/reporter phone values
- explicit Data API grants must be applied from the `20260513*` migrations; future public-schema objects should not become reachable until their own migration grants access intentionally

Validate app runtime env:

```bash
npm run runtime:check-env
```

Validate database-script env:

```bash
npm run runtime:check-db-env
```

## Migration
Migration files:
- `supabase/migrations/20260422180000_initial_schema.sql`
- `supabase/migrations/20260423120000_vendor_image_storage.sql`
- `supabase/migrations/20260426190000_user_action_events.sql`
- `supabase/migrations/20260426203000_user_events_alignment.sql`
- `supabase/migrations/20260426213000_user_events_session_flow.sql`
- `supabase/migrations/20260426233000_vendor_rating_summary_sync.sql`
- `supabase/migrations/20260428120000_admin_rbac.sql`
- `supabase/migrations/20260428153000_audit_log_roles.sql`
- `supabase/migrations/20260429110000_user_events_admin_read.sql`
- `supabase/migrations/20260502120000_admin_analytics_snapshot.sql`
- `supabase/migrations/20260503011000_vendor_usage_scores_rpc.sql`
- `supabase/migrations/20260503023000_phase11_query_indexes.sql`
- `supabase/migrations/20260503123000_admin_analytics_snapshot_perf.sql`
- `supabase/migrations/20260507193000_public_rating_submission_rpc.sql`
- `supabase/migrations/20260508143000_operational_events.sql`
- `supabase/migrations/20260512003000_public_rating_anonymous_identity.sql`
- `supabase/migrations/20260513030000_explicit_data_api_grants.sql`
- `supabase/migrations/20260513031000_revoke_legacy_data_api_role_grants.sql`
- `supabase/migrations/20260513032000_enable_schema_migration_rls.sql`
- `supabase/migrations/20260513033000_harden_public_function_grants.sql`
- `supabase/migrations/20260513034000_schema_migrations_deny_policy.sql`
- `supabase/migrations/20260513035000_revoke_public_default_privileges.sql`
- `supabase/migrations/20260513036000_revoke_additional_default_privileges.sql`
- `supabase/migrations/20260517090000_rider_connect_schema.sql`
- `supabase/migrations/20260520090000_rating_signals_schema.sql`
- `supabase/migrations/20260520091000_rating_signals_rpc_persistence.sql`
- `supabase/migrations/20260520092000_rating_signal_public_badges.sql`
- `supabase/migrations/20260520093000_admin_rating_signal_summary.sql`
- `supabase/migrations/20260525120000_rider_structured_availability.sql`
- `supabase/migrations/20260530090000_restrict_rating_anonymous_hash_select.sql`
- `supabase/migrations/20260624140000_admin_vendor_dashboard_counts.sql`
- `supabase/migrations/20260701120000_admin_login_security_events.sql`
- `supabase/migrations/20260701130000_admin_sessions.sql`

Preferred command when `psql` is available:

```bash
npm run runtime:check-db-env
npm run db:migrate
```

Migration runner behavior:
- `npm run db:migrate` applies all SQL files in `supabase/migrations` in filename order
- applied migrations are tracked in `public.app_schema_migrations`
- fresh or partially provisioned environments should use the migration runner instead of applying only the initial schema file

Dashboard fallback:
1. Open the Supabase project.
2. Go to SQL Editor.
3. Run every file in `supabase/migrations` in filename order.
4. Confirm the public tables exist: `vendors`, `vendor_hours`, `vendor_categories`, `vendor_category_map`, `vendor_featured_dishes`, `vendor_images`, `ratings`, `rating_signal_options`, `rating_signal_selections`, `admin_users`, `audit_logs`, `user_events`, `riders`, `rider_contact_intents`, `rider_unavailable_reports`, and `app_schema_migrations`.
5. Confirm `public.vendor_images` includes `storage_object_path`.
6. Confirm `public.user_events` exists for Phase 6 analytics.
7. Confirm `public.submit_public_vendor_rating(uuid, integer, text, text, text[])` and `public.refresh_vendor_rating_summary(uuid)` exist before releasing the public ratings route.
8. Confirm `public.operational_events` exists with the admin read policy before enabling operational-event persistence.
9. Confirm Data API grants are explicit and least privilege: public read tables remain selectable by anon/authenticated where intended, admin/internal tables are not anon-readable, and `app_schema_migrations` is inaccessible to client roles.
10. Confirm future default privileges are revoked for public-schema tables, functions, and sequences so new migrations fail closed until grants are added.
11. Confirm Rider Connect tables have RLS enabled, no anon grants, authenticated admin access through RLS, and service-role access for server routes.
12. Confirm `public.admin_login_security_events` exists with RLS enabled and service-role-only table access.
13. Confirm `public.admin_sessions` exists with RLS enabled and service-role-only table access.
14. Confirm `npm run db:check` reports zero pending migrations before testing admin login.

Rollback note:
- current migrations are additive and tracked in `public.app_schema_migrations`
- if a release must be rolled back, restore the previous app deploy first
- do not manually remove applied schema objects unless a verified migration defect requires a targeted SQL fix

Operational-event retention:
- persisted operational events are intentionally bounded and are not meant to grow forever
- use `npm run db:prune:operational-events` on an operator cadence after migrations are in place
- the command deletes rows older than `LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS` days, defaulting to `30`

Data API security gate:
- run `npm run db:check` after migrations
- inspect grants for `anon`, `authenticated`, and `service_role`
- verify RLS remains enabled on public tables
- verify public flows still work: categories, nearby vendors, vendor detail, ratings, and events
- verify admin flows still work through protected routes: login/session, vendor create/edit, image upload, analytics, activity, logs, and team access
- any new public-schema migration must include explicit grants for the objects it creates; do not rely on Supabase default exposure

PWA runtime gate:
- build and start a production runtime before validating service-worker behavior
- confirm `/sw.js` registers only in production-safe origins
- confirm the runtime marker reports `2026-05-pwa-runtime-v4`
- inspect `CacheStorage` and confirm `/api/**`, `/vendors/**`, `/search`, Rider Connect, ratings, nearby discovery, and admin/session payloads are absent
- confirm offline navigation shows `/offline.html` rather than stale marketplace data
- simulate a repeated stale chunk/runtime failure and confirm the branded reload fallback appears instead of a blank screen or reload loop

## Abuja Seed Data
Seed file:
- `supabase/seed/20260422_abuja_pilot_seed.sql`

The seed creates:
- 10 public categories
- 20 Abuja pilot vendor records across Wuse, Garki, Jabi, Maitama, Guzape, Utako, and Lugbe
- category mappings
- weekly hours for every vendor
- one featured dish per vendor
- development placeholder image rows for vendors

Seed image note:
- placeholder `vendor_images.image_url` rows that point to `/seed-images/...` are development-only
- public vendor detail rendering now prefers storage-backed vendor images with `storage_object_path`
- production image testing should use real uploads into the `vendor-images` bucket

Preferred command when `psql` is available:

```bash
npm run runtime:check-db-env
npm run db:seed:abuja
```

Dashboard fallback:
1. Open the Supabase project.
2. Go to SQL Editor.
3. Paste the full contents of `supabase/seed/20260422_abuja_pilot_seed.sql`.
4. Run the SQL after the migration has completed.

## Seed Validation Queries
Run these checks in Supabase SQL Editor after seeding:

```sql
select count(*) as active_vendor_count
from public.vendors
where is_active = true;
```

Expected result: `20`.

```sql
select area, count(*) as vendor_count
from public.vendors
where is_active = true
group by area
order by area;
```

Expected result: all pilot areas have at least two vendors.

```sql
select v.slug
from public.vendors v
left join public.vendor_hours h on h.vendor_id = v.id
left join public.vendor_category_map cm on cm.vendor_id = v.id
left join public.vendor_featured_dishes d on d.vendor_id = v.id
left join public.vendor_images i on i.vendor_id = v.id
where v.is_active = true
group by v.id, v.slug
having count(distinct h.day_of_week) <> 7
  or count(distinct cm.category_id) = 0
  or count(distinct d.id) = 0
  or count(distinct i.id) = 0;
```

Expected result: no rows.

## Nearby API Smoke Test
Start the local app with real Supabase env vars:

```bash
npm run runtime:check-env
npm run dev
```

Build safety rule:
- `npm run build` must not run against the same live workspace while `npm run dev` is active.
- The current npm wrapper enforces that rule and exits early with a clear error instead of deleting or corrupting the live `.next` Turbopack dev cache.

In a second terminal, run:

```bash
npm run smoke:nearby
```

Default smoke query:
- `lat = 9.0765`
- `lng = 7.3986`
- `radius_km = 30`
- `tight_radius_km = 1`

Override values when needed:

```bash
SMOKE_NEARBY_LAT=9.0813 SMOKE_NEARBY_LNG=7.4694 SMOKE_NEARBY_RADIUS_KM=10 npm run smoke:nearby
```

Optional tight-radius override:

```bash
SMOKE_NEARBY_TIGHT_RADIUS_KM=2 npm run smoke:nearby
```

The smoke test validates:
- `lat` and `lng` precise coordinate input
- computed `distance_km` output
- open-first and distance-first discovery ordering
- wide radius filtering
- tight radius filtering
- invalid coordinate rejection
- partial coordinate rejection
- direct API missing-coordinate fallback to the Abuja default city view for operator checks

Client location acquisition behavior:
- browser geolocation waits up to 10 seconds before giving up
- browser geolocation requests high accuracy and keeps the accepted cached position window low to avoid stale results
- if precise location is denied or unavailable, the app tries IP-based approximate location next
- if approximate location is also unavailable, a user-selected discovery area drives discovery when present
- if no area has been selected, the public frontend uses Wuse as the curated default discovery area
- default Wuse is the same area-discovery system used by Browse By Area; it is not Abuja-wide discovery, all-vendors mode, or backend `default_city`
- supported discovery areas are Wuse, Gwarinpa, Jabi, Utako, Maitama, Asokoro, Garki, Kubwa, and Lugbe
- GPS always overrides restored, selected, and default areas
- selected areas override default Wuse
- selected-area restoration survives vendor-detail back navigation through the discovery snapshot, but does not survive a plain reload or future session
- mobile users should see a short "trying to get precise location" status before fallback is chosen
- precise mode should show a human-readable area label when reverse lookup succeeds, or rounded coordinates otherwise
- approximate mode must stay labeled approximate and must not imply exact nearby accuracy
- approximate location should only be shown in the frontend when the app has both usable approximate coordinates and a usable human-readable label
- if no trustworthy precise or approximate label is available, the frontend should show compact area status such as `Browsing: Wuse` or the selected area
- the backend Abuja fallback is only for direct API/operator checks and must not be presented as the public frontend fallback

The smoke test passes only when:
- the API returns HTTP 200
- the response uses the standard success shape
- one or more vendors are returned
- every vendor includes `vendor_id`, `name`, `latitude`, `longitude`, `distance_km`, `is_open_now`, and `today_hours`
- `distance_km` is numeric and non-negative
- the response shape remains valid for the current open-first and distance-first discovery ranking layer
- invalid and partial coordinate requests return `VALIDATION_ERROR`
- direct backend fallback requests return `location.source = default_city`
- public frontend no-location/no-area release checks use default Wuse coordinates instead of calling nearby without coordinates

## Manual API Check
Manual URL:

```text
http://localhost:3000/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=30
```

If the local app is not using port `3000`, replace the origin with the active local port.

Expected response shape:

```json
{
  "success": true,
  "data": {
    "location": {
      "source": "precise",
      "label": "Current location",
      "coordinates": {
        "lat": 9.0765,
        "lng": 7.3986
      },
      "isApproximate": false
    },
    "vendors": []
  },
  "error": null
}
```

With the Abuja seed data loaded, `vendors` should contain nearby vendor records with valid `distance_km` values and open-first, distance-first ordering.

## Release Gate
Deployment, pilot validation, or further UX iteration should proceed only after:
- migration succeeds against the target Supabase project
- seed validation queries pass
- `npm run smoke:nearby` passes against the local app and real Supabase env vars
- the release branch/worktree is clean and the intended route files are tracked in git before promotion
- any runtime failures are documented before implementation continues

## Deployment Notes
- DigitalOcean App Platform is the current deployment target.
- Local development and smoke testing assume `http://localhost:3000` unless `NEXT_PUBLIC_APP_URL` is overridden.
- `http://127.0.0.1:3000` is supported for local smoke checks, but production should still use the real deployed origin for `NEXT_PUBLIC_APP_URL`.
- Production should use the real deployed app URL for `NEXT_PUBLIC_APP_URL`.
- The same Supabase public env vars used locally must be present in the DigitalOcean app configuration.
- Production runtime secrets must include `SUPABASE_SERVICE_ROLE_KEY` for:
  - admin image upload and delete
  - admin user creation and existing-user recovery
  - analytics writes and admin analytics reads
- Set `NEXT_PUBLIC_MAP_STYLE_URL` in DigitalOcean as a Build + Run variable when the production app should use the real MapLibre map. If omitted, production stays on the fallback coordinate map without breaking public discovery.
- The `vendor-images` Storage bucket must exist and stay public for the current frontend image URL strategy.
- After changing DigitalOcean env vars, redeploy the app so new public values are compiled into the Next.js build.
- App Router route files such as `app/admin/**/page.tsx` and `app/api/admin/**/route.ts` must be committed and pushed before deployment; DigitalOcean cannot build local-only or ignored files.
- Run production promotion from a clean committed worktree so the deployed source tree, route manifests, and local verification state match.
- Run `npm audit` before deployment and do not promote while high-severity advisories remain unresolved.
- After image-upload changes, verify both local dev and local production runtime with real cross-vendor uploads so hot-reload state cannot mask a production-state bug.

For launch-day operator work and ongoing Abuja pilot checks, use [docs/ops/PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md).

## Operator Checklist
Use this checklist when completing runtime activation manually:

1. Create `.env.local` from `.env.example`.
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Fill `SUPABASE_SERVICE_ROLE_KEY` if validating admin image upload, analytics, server-side event writes, or team access creation.
4. If validating the admin Logs page, enable `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=true` and use an admin account.
5. Fill `NEXT_PUBLIC_MAP_STYLE_URL` if validating the real MapLibre map instead of the fallback coordinate map.
6. Fill `DATABASE_URL` if using local `psql` commands.
7. Run `npm run runtime:check-env`.
8. If using local `psql`, run `npm run runtime:check-db-env`.
9. Apply all files in `supabase/migrations` using either `npm run db:migrate` or Supabase SQL Editor in filename order.
10. Apply `supabase/seed/20260422_abuja_pilot_seed.sql` using either `npm run db:seed:abuja` or Supabase SQL Editor.
11. Run the seed validation queries in this document.
12. Run `npm run dev`.
13. In a second terminal, run `npm run smoke:nearby`.
14. Confirm the smoke command prints `"ok": true`.
15. If validating admin analytics/activity/logs flows, sign in as an admin and confirm `/admin/analytics`, `/admin/activity`, `/admin/logs`, and `/admin/vendors` load without auth regression.
16. Do not proceed to deployment or further feature expansion until all checks above pass.

## Runtime/Admin Boundary
Runtime activation must stay validated before additional admin or public UX changes are shipped.

Current admin foundation files include:
- `lib/admin/auth.ts`
- `lib/admin/vendor-service.ts`
- `app/api/admin/**/route.ts`

Do not start:
- vendor self-service onboarding
- payments, delivery, chat, loyalty, coupons, or inventory
