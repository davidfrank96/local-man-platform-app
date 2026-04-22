## Title
The Local Man — Runtime Setup and Nearby Smoke Test

## Goal
Validate the real Supabase-backed runtime data flow before broader Phase 2 feature implementation begins.

This gate verifies:
- the Phase 1 migration can be applied to a real Supabase project
- Abuja pilot seed data exists
- `GET /api/vendors/nearby` can read seeded vendors through Supabase RLS
- the API returns computed `distance_km` values sorted nearest first

Do not begin broader public UI or admin UI work until this runtime data flow passes.

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
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
DATABASE_URL=<postgres-connection-string>
```

`DATABASE_URL` is only required for the `npm run db:migrate` and `npm run db:seed:abuja` scripts. Those scripts load `.env.local` before invoking `psql`. If using the Supabase Dashboard SQL Editor, `DATABASE_URL` is not required locally.

Validate app runtime env:

```bash
npm run runtime:check-env
```

Validate database-script env:

```bash
npm run runtime:check-db-env
```

## Migration
Migration file:
- `supabase/migrations/20260422180000_initial_schema.sql`

Preferred command when `psql` is available:

```bash
npm run runtime:check-db-env
npm run db:migrate
```

Dashboard fallback:
1. Open the Supabase project.
2. Go to SQL Editor.
3. Paste the full contents of `supabase/migrations/20260422180000_initial_schema.sql`.
4. Run the SQL once.
5. Confirm the public tables exist: `vendors`, `vendor_hours`, `vendor_categories`, `vendor_category_map`, `vendor_featured_dishes`, `vendor_images`, `ratings`, `admin_users`, and `audit_logs`.

## Abuja Seed Data
Seed file:
- `supabase/seed/20260422_abuja_pilot_seed.sql`

The seed creates:
- 10 public categories
- 20 Abuja pilot vendor records across Wuse, Garki, Jabi, Maitama, Guzape, Utako, and Lugbe
- category mappings
- weekly hours for every vendor
- one featured dish per vendor
- one image placeholder per vendor

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
- nearest-first sorting
- wide radius filtering
- tight radius filtering
- invalid coordinate rejection
- partial coordinate rejection
- missing coordinate fallback to the Abuja default city view

The smoke test passes only when:
- the API returns HTTP 200
- the response uses the standard success shape
- one or more vendors are returned
- every vendor includes `vendor_id`, `name`, `latitude`, `longitude`, `distance_km`, and `is_open_now`
- `distance_km` is numeric and non-negative
- vendors are sorted nearest first
- invalid and partial coordinate requests return `VALIDATION_ERROR`
- fallback requests return `location.source = default_city`

## Manual API Check
Manual URL:

```text
http://localhost:3000/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=30
```

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

With the Abuja seed data loaded, `vendors` should contain nearby vendor records sorted by `distance_km`.

## Release Gate
Phase 2 feature work may proceed only after:
- migration succeeds against the target Supabase project
- seed validation queries pass
- `npm run smoke:nearby` passes against the local app and real Supabase env vars
- any runtime failures are documented before implementation continues

## Operator Checklist
Use this checklist when completing runtime activation manually:

1. Create `.env.local` from `.env.example`.
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Fill `DATABASE_URL` if using local `psql` commands.
4. Run `npm run runtime:check-env`.
5. If using local `psql`, run `npm run runtime:check-db-env`.
6. Apply `supabase/migrations/20260422180000_initial_schema.sql` using either `npm run db:migrate` or Supabase SQL Editor.
7. Apply `supabase/seed/20260422_abuja_pilot_seed.sql` using either `npm run db:seed:abuja` or Supabase SQL Editor.
8. Run the seed validation queries in this document.
9. Run `npm run dev`.
10. In a second terminal, run `npm run smoke:nearby`.
11. Confirm the smoke command prints `"ok": true`.
12. Do not proceed to broader Phase 2 UI work until all checks above pass.

## Phase 2A Admin Foundation Boundary
After runtime validation is complete or fully prepared, Phase 2A may establish only:
- admin auth boundary
- admin route protection
- vendor CRUD route/service structure
- request validation boundaries

Current admin foundation files:
- `lib/admin/auth.ts`
- `lib/admin/vendor-service.ts`
- `app/api/admin/**/route.ts`

Do not start:
- public map UI
- public vendor card UI
- public search/filter UI
- visual polish
- vendor self-service onboarding
- payments, delivery, chat, loyalty, coupons, or inventory
