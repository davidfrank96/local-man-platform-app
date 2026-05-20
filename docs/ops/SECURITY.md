# Local Man Security Notes

This document records the current application security posture for release review.

## Admin Auth and RBAC

- Admin login uses Supabase email/password auth.
- Browser workspace sessions are stored in same-origin HTTP-only cookies.
- Privileged access requires an explicit `admin_users` row; Supabase authentication alone is not enough.
- Backend `/api/admin/**` routes enforce session and permission checks before privileged reads or writes.
- Client-side navigation hiding and route guards are UX controls only, not authorization boundaries.
- Background focus/visibility session refresh keeps authenticated pages mounted so create/edit forms and file-picker state are preserved.

## Public Writes

- Public ratings do not require login, but one anonymous browser identity can rate a given vendor once.
- Optional rating signals inherit the same rating write path, rate limits, duplicate protections, and database duplicate semantics.
- Signal selections must be predefined, score-compatible, unique per rating, and limited to two.
- Raw signal selections are internal. Public responses must not expose negative signals, neutral signals, raw counts, per-rating rows, anonymous hashes, or client identifiers.
- Public confidence badges are positive-only, thresholded, and secondary to star ratings; they are not certifications, safety guarantees, public complaints, or vendor warnings.
- Rider Connect public application, suggestion, contact handoff, and unavailable-report routes do not require login, but they are validated and rate-limited server-side.
- Public event tracking is non-blocking and fire-and-forget.
- `/api/events` validates referenced vendor ids before insert and skips stale/nonexistent vendors safely.
- Abuse protection remains server-side and must not be treated as a browser-only guard.

## Rider Connect Privacy and Abuse

- Public rider suggestions are shaped by server routes and expose only rider id, display name, photo URL, vehicle type, operating areas, and usual availability label.
- Public suggestion responses must not include rider phone, WhatsApp phone, full legal name, internal notes, or internal status fields.
- Rider contact handoff returns a WhatsApp URL only after the user selects one rider and accepts the disclaimer.
- Customer and reporter phone values are stored as HMAC hashes. Set `RIDER_CONNECT_HASH_SECRET` in staging and production as a server-only secret.
- If `RIDER_CONNECT_HASH_SECRET` is missing, the MVP falls back to the service-role key for hashing; rotating that fallback changes future hashes and can reduce comparability with earlier records.
- Raw customer phone and address are used transiently to build the WhatsApp message and must not be persisted in request metadata.
- Unavailable reports are admin-review signals only; one anonymous report must not auto-suspend a rider.
- Current Rider Connect rate limits are in-memory and process-local, so they are best-effort for a single app instance rather than distributed global abuse protection.

## Supabase Data API Grants

- Public-schema access is explicit-grant only.
- Public discovery read tables are granted only the access required for public reads.
- Rider Connect tables are not granted to anon because rider phone/WhatsApp fields live in `public.riders`.
- Admin/internal tables are not exposed to anon.
- `app_schema_migrations` has RLS enabled and a deny-all client policy.
- Service-role access is reserved for server routes, migrations, analytics/event writes, ratings, and storage/image bookkeeping.
- Future public-schema tables, functions, and sequences fail closed until a migration grants access intentionally.

## RLS and Functions

- RLS remains enabled on public app tables.
- Grants expose database objects to Data API roles; RLS still controls row visibility and mutation permission.
- RLS helper functions remain executable where policies require them.
- Trigger functions and privileged RPCs should stay service_role-only unless a migration documents a narrower public need.
- SECURITY DEFINER helpers must stay minimal, use safe search paths where possible, and be reviewed during each grant/security release gate.

## Browser Cache Safety

- Public discovery snapshots are scoped by cache version and browser origin.
- Restored nearby results carry a request key for location/search/radius/category/price/open-now state.
- Malformed vendor records and known Playwright/mock vendor identities are rejected before hydration.
- Admin vendor mutations invalidate restored public discovery vendor data.

## Secrets

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, cookies, auth headers, or raw request bodies in client code or logs.
- Never expose `RIDER_CONNECT_HASH_SECRET` in client code, logs, or `NEXT_PUBLIC_*` env vars.
- `NEXT_PUBLIC_*` values are browser-visible and must contain only public-safe configuration.
- `NEXT_PUBLIC_MAP_STYLE_URL` must use a browser-safe map style URL/token.
