## Title
The Local Man — Runtime Setup and Nearby Smoke Test

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
NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run smoke:nearby
```

If the local app is running on another port, set `NEXT_PUBLIC_APP_URL` to that actual origin before running the smoke command.

The standard local development port for this repo is `http://localhost:3000`. Older references to `3002` or `3003` should be treated as temporary local overrides rather than the default.

The smoke test verifies precise coordinates, `distance_km`, ranking-aware nearby ordering, radius filtering, invalid coordinate rejection, partial coordinate rejection, compact `today_hours`, and Abuja fallback behavior.

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
DATABASE_URL=<postgres-connection-string>
```

`DATABASE_URL` is only required for the `npm run db:migrate` and `npm run db:seed:abuja` scripts. Those scripts load `.env.local` before invoking `psql`. If using the Supabase Dashboard SQL Editor, `DATABASE_URL` is not required locally.

`SUPABASE_SERVICE_ROLE_KEY` is required for admin vendor image upload and delete operations, public analytics event writes, admin analytics reads, and server-side admin user creation.

`NEXT_PUBLIC_MAP_STYLE_URL` is optional. Set it only if you want the public discovery page to render a real MapLibre map. If it is left empty, the discovery page will continue to use the built-in coordinate fallback map and the rest of the app will behave normally.

Current real-map example:

```text
https://api.maptiler.com/maps/openstreetmap/style.json?key=YOUR_PUBLIC_MAPTILER_KEY
```

Supabase requirements:
- Auth must be enabled for admin login
- Storage bucket `vendor-images` must exist
- `vendor-images` must be public for the current vendor image URL strategy

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
- `supabase/migrations/20260502120000_admin_analytics_snapshot.sql`
- `supabase/migrations/20260503123000_admin_analytics_snapshot_perf.sql`

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
3. Run both migration files in filename order.
4. Confirm the public tables exist: `vendors`, `vendor_hours`, `vendor_categories`, `vendor_category_map`, `vendor_featured_dishes`, `vendor_images`, `ratings`, `admin_users`, `audit_logs`, `user_events`, and `app_schema_migrations`.
5. Confirm `public.vendor_images` includes `storage_object_path`.
6. Confirm `public.user_events` exists for Phase 6 analytics.

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
- ranking-aware discovery ordering
- wide radius filtering
- tight radius filtering
- invalid coordinate rejection
- partial coordinate rejection
- missing coordinate fallback to the Abuja default city view

Client location acquisition behavior:
- browser geolocation waits up to 10 seconds before giving up
- browser geolocation requests high accuracy and keeps the accepted cached position window low to avoid stale results
- if precise location is denied or unavailable, the app tries IP-based approximate location next
- if approximate location is also unavailable, the app falls back to the Abuja default city view
- mobile users should see a short "trying to get precise location" status before fallback is chosen
- precise mode should show a human-readable area label when reverse lookup succeeds, or rounded coordinates otherwise
- approximate mode must stay labeled approximate and must not imply exact nearby accuracy
- approximate location should only be shown in the frontend when the app has both usable approximate coordinates and a usable human-readable label
- if no trustworthy precise or approximate label is available, the frontend should stay neutral with copy such as `Showing nearby vendors`
- the internal Abuja fallback may keep vendor discovery usable, but it must not be presented as the user’s exact location

The smoke test passes only when:
- the API returns HTTP 200
- the response uses the standard success shape
- one or more vendors are returned
- every vendor includes `vendor_id`, `name`, `latitude`, `longitude`, `distance_km`, `is_open_now`, and `today_hours`
- `distance_km` is numeric and non-negative
- the response shape remains valid for the current discovery ranking layer
- invalid and partial coordinate requests return `VALIDATION_ERROR`
- fallback requests return `location.source = default_city`

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

With the Abuja seed data loaded, `vendors` should contain nearby vendor records with valid `distance_km` values and ranking-aware ordering.

## Release Gate
Deployment, pilot validation, or further UX iteration should proceed only after:
- migration succeeds against the target Supabase project
- seed validation queries pass
- `npm run smoke:nearby` passes against the local app and real Supabase env vars
- any runtime failures are documented before implementation continues

## Deployment Notes
- DigitalOcean App Platform is the current deployment target.
- Local development and smoke testing assume `http://localhost:3000` unless `NEXT_PUBLIC_APP_URL` is overridden.
- Production should use the real deployed app URL for `NEXT_PUBLIC_APP_URL`.
- The same Supabase public env vars used locally must be present in the DigitalOcean app configuration.
- Production runtime secrets must include `SUPABASE_SERVICE_ROLE_KEY` for:
  - admin image upload and delete
  - admin user creation and existing-user recovery
  - analytics writes and admin analytics reads
- Set `NEXT_PUBLIC_MAP_STYLE_URL` in DigitalOcean as a Build + Run variable when the production app should use the real MapLibre map. If omitted, production stays on the fallback coordinate map without breaking public discovery.
- The `vendor-images` Storage bucket must exist and stay public for the current frontend image URL strategy.
- After changing DigitalOcean env vars, redeploy the app so new public values are compiled into the Next.js build.

For launch-day operator work and ongoing Abuja pilot checks, use [docs/ops/PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md).

## Operator Checklist
Use this checklist when completing runtime activation manually:

1. Create `.env.local` from `.env.example`.
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Fill `SUPABASE_SERVICE_ROLE_KEY` if validating admin image upload, analytics, server-side event writes, or team access creation.
4. Fill `NEXT_PUBLIC_MAP_STYLE_URL` if validating the real MapLibre map instead of the fallback coordinate map.
5. Fill `DATABASE_URL` if using local `psql` commands.
6. Run `npm run runtime:check-env`.
7. If using local `psql`, run `npm run runtime:check-db-env`.
8. Apply all files in `supabase/migrations` using either `npm run db:migrate` or Supabase SQL Editor in filename order.
9. Apply `supabase/seed/20260422_abuja_pilot_seed.sql` using either `npm run db:seed:abuja` or Supabase SQL Editor.
10. Run the seed validation queries in this document.
11. Run `npm run dev`.
12. In a second terminal, run `npm run smoke:nearby`.
13. Confirm the smoke command prints `"ok": true`.
14. Do not proceed to deployment or further feature expansion until all checks above pass.

## Runtime/Admin Boundary
Runtime activation must stay validated before additional admin or public UX changes are shipped.

Current admin foundation files include:
- `lib/admin/auth.ts`
- `lib/admin/vendor-service.ts`
- `app/api/admin/**/route.ts`

Do not start:
- vendor self-service onboarding
- payments, delivery, chat, loyalty, coupons, or inventory
