# Local Man Audit Logs

This document describes the current workspace audit-log system.

## Purpose

Audit logs provide accountability for workspace actions:

- who acted
- what they did
- what entity was affected
- when it happened

## Stored fields

Current `audit_logs` records include:

- `id`
- `admin_user_id`
- `user_role`
- `entity_type`
- `entity_id`
- `action`
- `metadata`
- `created_at`

Metadata also carries:

- `request_id`
- `actor_label`
- target labels such as vendor name, slug, email, or changed fields when available

## Tracked actions

Current tracked action families include:

- vendor create/update/status/delete
- vendor hours updates
- vendor image create/upload/delete
- featured dish create/delete
- admin/agent create/update/delete
- admin/agent role change

## Read and write behavior

### Writes

Audit writes are best-effort and non-blocking:

- successful workspace operation remains the priority
- audit write failures are logged with structured `AUDIT_LOG_FAILED`
- audit failure must not break the main mutation

### Reads

Audit-log reads are admin-only.

The production admin dashboard reads audit logs through the protected backend route:

- `GET /api/admin/audit-logs`
- backend admin auth and RBAC enforcement
- server-side `SUPABASE_SERVICE_ROLE_KEY` reads against `audit_logs`

The route currently returns:

- `auditLogs`
- pagination metadata:
  - `limit`
  - `offset`
  - `has_more`
  - `next_cursor`

`next_cursor` is a stringified next-offset token for the current "View more activity" pagination flow.

## UI surface

Audit-log visibility currently appears on the dedicated admin activity route as:

- Recent team activity
- `/admin/activity`
- role filter
- action filter
- paginated `View more activity`
- contained inner-scroll inside the activity list card

Agents do not see this UI and cannot access the API route.
Operational platform warnings and failures are intentionally separate and live on `/admin/logs`.

## Source ownership

- [lib/admin/audit-log-service.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/admin/audit-log-service.ts)
- [app/api/admin/audit-logs/route.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/api/admin/audit-logs/route.ts)
- [components/admin/admin-activity-board.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/admin/admin-activity-board.tsx)
