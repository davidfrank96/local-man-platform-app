## Title
Local Man — Environment Variables

## Frontend / App
- `NEXT_PUBLIC_APP_URL`: public application origin used by smoke scripts and client-side API helpers.
- `NEXT_PUBLIC_LOCALMAN_WEBSITE_URL`: optional mobile About tab website link. Defaults to `https://localman.app`.
- `NEXT_PUBLIC_LOCALMAN_SUPPORT_EMAIL`: optional mobile About tab support email. Defaults to `support@localman.app`.
- `NEXT_PUBLIC_MAP_STYLE_URL`: optional MapLibre-compatible browser style URL for the public discovery map. The current production target uses a browser-safe MapTiler `style.json` URL. If omitted, the app uses the built-in coordinate fallback map instead of a real tile map.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL. Required by public read routes and admin route verification.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key for RLS-protected public reads and the server-side admin login/session exchange against Supabase Auth.

## Server / Secure
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key required for privileged vendor image upload/delete, public analytics event writes, public vendor rating writes, Rider Connect server routes, admin analytics reads, and server-side admin user creation/recovery.
- `RIDER_CONNECT_HASH_SECRET`: server-only HMAC secret for hashing Rider Connect customer/reporter phone values. Set this in staging and production. If omitted, the MVP falls back to `SUPABASE_SERVICE_ROLE_KEY`; rotating the fallback key changes future hashes and can reduce comparability with earlier contact/report rows.
- `DATABASE_URL`: direct database connection string for migrations or server-only maintenance tasks.
- `ADMIN_SEED_EMAIL`: optional initial admin account email for seed/setup workflows.
- `ADMIN_SEED_PASSWORD`: optional initial admin account password for seed/setup workflows.
- `LOCALMAN_LOG_LEVEL`: optional minimum structured server log level. Supported values: `debug`, `info`, `warn`, `error`. Defaults to `info`.
- `LOCALMAN_ENABLE_DEBUG_LOGS`: optional explicit debug toggle for structured server logs. Leave unset or `false` for normal production behavior.
- `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE`: optional explicit toggle for safe internal persistence of selected structured operational events. Defaults to `false`.
- `LOCALMAN_RUNTIME_ENVIRONMENT`: optional label stored with persisted operational events, such as `local`, `staging`, or `production`.
- `LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS`: optional retention window used by `npm run db:prune:operational-events`. Defaults to `30`.

## Runtime Requirements
- Local static checks and unit tests do not require environment variables.
- Public Supabase-backed routes require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Admin login uses the public Supabase env vars for the server-side `/api/admin/login` password exchange against Supabase Auth.
- Browser admin and agent sessions are persisted in same-origin HTTP-only cookies, not `localStorage` or `sessionStorage`.
- Browser admin API calls now authenticate through those cookies and `/api/admin/session`; callers no longer need to attach a bearer token manually.
- Vendor image uploads and deletes use the server-only service role key against the `vendor-images` Supabase Storage bucket created by the migration.
- Rider Connect application, suggestion, contact handoff, unavailable-report, and admin rider routes use server-side access. Public suggestion responses must never include rider phone, WhatsApp values, full legal names, full plate numbers, internal notes, or internal status fields.
- `RIDER_CONNECT_HASH_SECRET` must never be exposed as `NEXT_PUBLIC_*`; it is used only on the server when storing Rider Connect phone hashes.
- Team access creation and existing-user recovery use the server-only service role key and must not be called directly from the browser.
- Server-side admin route authorization still supports bearer tokens for compatibility and targeted tests, but the primary browser flow is cookie-backed.
- Current public map rendering uses MapLibre only when `NEXT_PUBLIC_MAP_STYLE_URL` is configured. Otherwise it falls back to the local coordinate map.
- Google Maps remains a deep-link target for directions only. No Google Maps API key is required for the current embedded map or the current server runtime.
- Structured server logging uses `lib/observability.ts`, includes safe request ids where available, and redacts secrets, cookies, tokens, raw request bodies, and database URLs before emission.
- `LOCALMAN_LOG_LEVEL` and `LOCALMAN_ENABLE_DEBUG_LOGS` affect server-side route timing, failure, degraded-state, and abuse-protection logs only. They do not enable browser-side logging.
- Touched high-value routes may echo a safe `x-request-id` response header so operators can correlate client-visible failures with server logs.
- When `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=true`, selected warn/error/degraded/rate-limited/slow events and selected admin mutation events are also persisted into `public.operational_events`.
- Persisted operational events remain separate from `audit_logs` and never store secrets, cookies, auth headers, passwords, raw request bodies, service-role keys, or raw stack traces.
- Admins can review recent persisted operational events through `/admin/logs`. Operators can still inspect the same data directly in Supabase when needed.
- When operational-event storage stays disabled, `/admin/logs` should still load but remain empty.
- After changing `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE`, `LOCALMAN_RUNTIME_ENVIRONMENT`, or `LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS`, restart the local server or trigger a new deploy before validating `/admin/logs`.

## Runtime Smoke Test
- `SMOKE_NEARBY_LAT`: optional latitude override for `npm run smoke:nearby`.
- `SMOKE_NEARBY_LNG`: optional longitude override for `npm run smoke:nearby`.
- `SMOKE_NEARBY_RADIUS_KM`: optional radius override for `npm run smoke:nearby`.
- `SMOKE_NEARBY_TIGHT_RADIUS_KM`: optional tight-radius override for radius filtering checks.

Exact migration, seed, and nearby smoke test steps are documented in `docs/ops/RUNTIME_SETUP.md`.

## Runtime Environment Checks
- `npm run runtime:check-env` verifies `.env.local`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm run runtime:check-db-env` also verifies `DATABASE_URL` for local `psql` migration and seed commands.
- `npm run db:migrate` applies every SQL file in `supabase/migrations` in filename order.
- `npm run db:seed:abuja` loads `.env.local` before invoking `psql`.
- `npm run db:prune:operational-events` deletes persisted operational events older than the configured retention window.

## Rules
- Never expose server secrets to client code.
- Treat `NEXT_PUBLIC_MAP_STYLE_URL` as public browser configuration only. Do not embed server-only keys in that URL.
- Document where each variable is used.
- Keep separate values for local, staging, and production.
- Set a stable `RIDER_CONNECT_HASH_SECRET` for each staging/production environment before live Rider Connect usage.
