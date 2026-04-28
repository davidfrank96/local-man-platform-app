# Local Man Error Handling

This document describes the shared error contract and current UI error systems.

## Shared error contract

Current backend error responses normalize to:

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "User-facing explanation",
    "detail": "Safe technical context",
    "status": 400
  }
}
```

`details` may also be present for backward-compatible structured metadata.

## Error classes and mapping

The current system uses shared application errors and external-error mapping so UI and API consumers see a consistent shape.

Examples:

- `USER_ALREADY_EXISTS`
- `INVALID_PASSWORD`
- `CONFIGURATION_ERROR`
- `NETWORK_ERROR`
- `VALIDATION_ERROR`
- `UNKNOWN_ERROR`

## Role-based visibility

### Admin

Admin-facing forms may show:

- message
- error code
- short safe detail

### Agent / public user

Agent and public flows should only show:

- safe user-facing message

Stack traces, raw Supabase payloads, and secrets must never be shown in UI.

## Global frontend systems

### Toast system

The frontend has a global lightweight toast provider:

- success
- error
- info

Behavior:

- stackable
- auto-dismiss
- safe placement on mobile and web

### Error boundary

The app is wrapped with a global client error boundary and route-level `app/error.tsx` fallback:

- catches render crashes
- prevents a blank-screen failure
- shows safe fallback copy

## Logging

Backend uses structured logging through:

- [lib/observability.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/observability.ts)

Important log families include:

- `ERROR`
- `ADMIN_AUTH_EVENT`
- `ADMIN_USER_MISSING`
- `ANALYTICS_FETCH`
- `AUDIT_LOGS_FETCH`
- `AUDIT_LOG_FAILED`

Frontend uses:

- structured `handleAppError(...)`
- targeted `console.error(...)` / debug logging where operationally useful

## Source ownership

- [lib/errors/app-error.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/errors/app-error.ts)
- [lib/errors/ui-error.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/errors/ui-error.ts)
- [components/system/global-error-boundary.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/system/global-error-boundary.tsx)
- [components/system/toast-provider.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/system/toast-provider.tsx)
- [app/error.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/error.tsx)
