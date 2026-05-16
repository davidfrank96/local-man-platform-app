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
- Public event tracking is non-blocking and fire-and-forget.
- `/api/events` validates referenced vendor ids before insert and skips stale/nonexistent vendors safely.
- Abuse protection remains server-side and must not be treated as a browser-only guard.

## Supabase Data API Grants

- Public-schema access is explicit-grant only.
- Public discovery read tables are granted only the access required for public reads.
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
- `NEXT_PUBLIC_*` values are browser-visible and must contain only public-safe configuration.
- `NEXT_PUBLIC_MAP_STYLE_URL` must use a browser-safe map style URL/token.
