# Localman PWA Runtime

This document describes the Phase 1 PWA runtime foundation.

## Scope

Localman is installable as a lightweight browser app with manifest, icon, and service-worker groundwork. It is not offline-first.

The service worker is intentionally small and root-scoped so it can support installability and repeat static asset reuse without changing discovery, search, Rider Connect, ratings, maps, admin, or routing behavior.

## Registration

- The client registers `/sw.js` only in production builds.
- Registration is allowed only on HTTPS, `localhost`, or `127.0.0.1`.
- Development mode does not register the service worker, which avoids stale Turbopack or local-development assets.
- Registration errors are swallowed so installability never blocks the Localman runtime.
- The client asks the registered service worker to check for updates after registration and again when an installed PWA returns to focus or visibility, with a short throttle so update checks do not become noisy.
- The runtime exposes a safe debug marker at `window.__LOCALMAN_PWA_RUNTIME__` and `html[data-localman-pwa-runtime]` so operators can confirm which PWA runtime version is loaded without exposing user data.

## Cached Assets

The service worker may cache:

- Next static JS/CSS chunks under `/_next/static/`
- PWA icons under `/icons/`
- Local branding assets under `/branding/`
- seed/static images under `/seed-images/`
- `manifest.webmanifest`
- `/offline.html`
- same-origin font, script, and style request destinations

The service worker uses a versioned static cache and removes older `localman-static-*` caches during activation. Cache version bumps are limited to static-shell freshness and must not introduce dynamic marketplace caching.

## Dynamic Data Rules

Dynamic marketplace data is not cached by the service worker.

The service worker bypasses:

- `/api/**`
- `/admin/**`
- `/vendors/**`
- `/search`
- non-GET requests
- cross-origin requests

This keeps these surfaces network-owned:

- nearby discovery
- search and filters
- open/closed vendor state
- vendor detail payloads
- rating payloads
- Rider Connect suggestions, contact handoff, and unavailable reports
- admin session and workspace data
- map provider requests

## Offline Behavior

Navigation requests are network-first. If a navigation fails because the browser is offline, the service worker returns `/offline.html`.

The offline page does not show stale vendors, rider availability, ratings, map state, or cached marketplace results. It tells users that live network access is required for those features.

## Install Experience

The manifest remains the source of install metadata:

- `name`: `Localman`
- `short_name`: `Localman`
- `display`: `standalone`
- `theme_color`: `#13733D`
- `background_color`: `#ffffff`
- Android, iOS, browser, and maskable icon assets are referenced from `/icons/`

## Known Limitations

- No offline discovery mode.
- No offline Rider Connect.
- No offline ratings.
- No offline maps.
- No background sync.
- No push notifications.
- No cached open/closed guarantees.
- Real-device install appearance should still be checked on Android Chrome and iOS Add to Home Screen before a public PWA launch.

## Release Gate

Before promotion, validate:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:nearby`
- targeted browser check that `/sw.js` registers in production and that `/api/vendors/nearby` is not served from `CacheStorage`
- `git diff --check`
