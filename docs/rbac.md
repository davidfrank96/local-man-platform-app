# Local Man RBAC

This document describes the current role-based access control model.

## Roles

### `admin`

Full workspace access:

- `/admin/dashboard`
- analytics
- activity
- logs
- audit-log visibility
- team access management
- rider profile management
- vendor create, edit, and deactivate flows
- vendor images, dishes, hours, and CSV intake

### `agent`

Restricted workspace access:

- `/admin/agent`
- full Create Vendor page
- vendor list
- vendor edit workspace
- vendor CSV intake
- vendor images, dishes, and hours needed by vendor onboarding

Agent restrictions:

- no analytics access
- no operational-log access
- no audit-log access
- no team/admin-user management
- no rider management
- no vendor deactivation

## Enforcement layers

RBAC is enforced in three places:

1. server-side auth and permission checks
2. route-level guards in the admin app
3. Supabase RLS policies

Frontend hiding is not treated as sufficient protection.
Client role checks exist only to shape navigation, redirects, and copy. Any direct browser request to a protected admin route or API is expected to be revalidated and rejected server-side when the permission is missing.

## Auth flow

After successful workspace login:

- `admin` resolves to `/admin/dashboard`
- `agent` resolves to `/admin/agent`
- the browser session is restored through secure same-origin HTTP-only cookies and `/api/admin/session`
- background focus/visibility refresh validates the session without moving an already-authenticated route back to loading state, so create/edit forms and file picker state stay mounted

Authentication proves identity only. Privileged workspace access exists only when the authenticated user already has an explicit row in `admin_users`.
`admin_users.role` is the authoritative role source. Supabase Auth `user_metadata.role` is mirrored from `admin_users.role` during create and role-change flows so session reads, dashboard routing, and the admin UI stay aligned.
Authenticated users missing from `admin_users` are denied workspace access and must be granted a role through team access first.

## Current permission model

Key permission boundaries:

- `analytics:read` -> admin only; covers admin analytics and aggregate-only vendor rating signal summaries
- `audit_logs:read` -> admin only
- `platform_logs:read` -> admin only
- `admin_users:manage` -> admin only
- `riders:manage` -> admin only
- `vendor:delete` -> admin only

General vendor create/edit flows remain available to both `admin` and `agent`.

## Data-layer notes

The current RLS model is defined by:

- [supabase/migrations/20260428120000_admin_rbac.sql](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/supabase/migrations/20260428120000_admin_rbac.sql)

Important behavior:

- admin workspace users are resolved from `admin_users`
- agents are valid workspace users but not full admins
- audit log reads remain admin-only
- vendor category mapping remains admin-only at the DB policy layer, so the server-controlled vendor intake flow performs that step safely
- rider profile management remains admin-only; public Rider Connect suggestions and handoffs are shaped by server routes and do not expose admin rider fields to anon
- explicit Supabase Data API grants expose only intended public tables to anon/authenticated roles; admin/internal tables are not anon-readable
- `app_schema_migrations` remains service-role bookkeeping with a deny-all client RLS policy
