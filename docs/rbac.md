# Local Man RBAC

This document describes the current role-based access control model.

## Roles

### `admin`

Full workspace access:

- `/admin/dashboard`
- analytics
- audit-log visibility
- team access management
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
- no audit-log access
- no team/admin-user management
- no vendor deactivation

## Enforcement layers

RBAC is enforced in three places:

1. server-side auth and permission checks
2. route-level guards in the admin app
3. Supabase RLS policies

Frontend hiding is not treated as sufficient protection.

## Auth flow

After successful workspace login:

- `admin` resolves to `/admin/dashboard`
- `agent` resolves to `/admin/agent`

Authenticated users missing from `admin_users` are auto-provisioned as `agent` by default. This avoids auth success followed by workspace rejection while preventing role escalation.

## Current permission model

Key permission boundaries:

- `analytics:read` -> admin only
- `audit_logs:read` -> admin only
- `admin_users:manage` -> admin only
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
