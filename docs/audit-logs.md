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

They require:

- authenticated admin role
- `SUPABASE_SERVICE_ROLE_KEY`

The service role requirement is intentional. It prevents environment-specific differences caused by token/RLS fallbacks.

## UI surface

Audit-log visibility currently appears inside the admin analytics area as:

- Recent team activity
- role filter
- action filter
- paginated `View more activity`

Agents do not see this UI and cannot access the API route.

## Source ownership

- [lib/admin/audit-log-service.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/admin/audit-log-service.ts)
- [app/api/admin/audit-logs/route.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/api/admin/audit-logs/route.ts)
- [components/admin/admin-analytics.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/admin/admin-analytics.tsx)
