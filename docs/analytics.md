# Local Man Analytics

This document covers the current public event-tracking and admin analytics system.

## Public event pipeline

Current flow:

1. public interaction occurs
2. frontend tracking sends event to `/api/events`
3. backend validates and stores into `user_events`
4. admin analytics reads aggregate the stored events

Tracked public events currently include:

- `session_started`
- `first_interaction`
- `last_interaction`
- `vendor_selected`
- `vendor_detail_opened`
- `call_clicked`
- `directions_clicked`
- `search_used`
- `filter_applied`

## Admin analytics surface

The current admin analytics page shows:

- summary counts
- vendor performance
- drop-off metrics when session data is available
- recent user events
- recent team activity from audit logs

## Environment requirements

The production admin analytics dashboard reads directly from Supabase with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- the signed-in workspace user's access token

`SUPABASE_SERVICE_ROLE_KEY` is still required for:

- `/api/events` writes
- backend analytics fallback route reads in development and tests
- backend audit-log fallback route reads in development and tests

## Production-read notes

When debugging production mismatches, verify:

1. local and production point to the same Supabase project
2. production has valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. the logged-in workspace user is `admin`
4. `user_events` actually contains data in the production project

Current structured logs:

- `ANALYTICS_FETCH`
- `AUDIT_LOGS_FETCH`
- public tracking skip/failure events

## Known constraint

This repo can verify local behavior and the code path for production, but live production analytics still depends on:

- real production env vars
- real production data
- the correct logged-in admin role

## Source ownership

- [app/api/events/route.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/api/events/route.ts)
- [lib/admin/analytics-service.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/admin/analytics-service.ts)
- [app/api/admin/analytics/route.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/api/admin/analytics/route.ts)
- [components/admin/admin-analytics.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/admin/admin-analytics.tsx)
