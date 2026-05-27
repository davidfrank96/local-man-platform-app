# Local Man Release Notes

## 2026-05 Mobile, Cache, Security, and Regression Lockdown

This note summarizes the current branch behavior after the mobile discovery restructure, cache/security hardening, admin upload/session stabilization, and regression-lockdown coverage.

### Branch Consolidation Scope

This branch consolidates completed runtime behavior across Rider Connect, rating signals, confidence badges, admin moderation visibility, branding/logo integration, vendor sharing, responsive hardening, accessibility hardening, PWA Phase 0/1 groundwork, cache/runtime fixes, scroll/layout stabilization, and release-gate coverage. It does not introduce delivery dispatch, payments, public rider directories, offline-first marketplace behavior, push notifications, background sync, or realtime rider tracking.

### Rider Connect MVP

- `/riders/apply` lets prospective independent riders submit profile details for admin review.
- New rider applications remain `pending` and `hidden`; no rider becomes public automatically.
- `/admin/riders` lets admins create riders from manual intake, search/filter riders, update verification and visibility status, edit safe rider fields, manage structured weekday/weekend availability, and review contact/report counts.
- Admin rider create defaults to pending/hidden, requires external consent confirmation, rejects duplicate phone/WhatsApp values, and only allows visible riders when verified.
- Vendor detail pages include `Request Rider`.
- Public rider suggestions return up to 3 verified, visible, currently available riders and exclude rider phone, WhatsApp phone, full legal name, notes, full plate, and internal status fields.
- The public modal validates contact and delivery details before rider selection so users see actionable form copy instead of a raw validation error.
- Customer phone guidance is Nigerian-format specific. Accepted examples are `08012345678`, `+2348012345678`, and `2348012345678`; shortened values such as `0813273210`, `+234813273210`, and `234813273210` are rejected.
- `manual_address` requires a delivery address. `current_location` requires a delivery area. The frontend blocks rider suggestions until the mode-specific location requirement is satisfied, and backend validation remains authoritative for contact handoff.
- Contact handoff creates a minimal `rider_contact_intents` row, hashes customer phone, returns a first-name-only selected-rider verification sheet with masked plate when available, and returns a WhatsApp click-to-chat URL for the selected rider only.
- Unavailable reports create admin-review-only `rider_unavailable_reports` rows and do not auto-suspend riders.
- Rider Connect routes are rate-limited for applications, suggestions, contact handoffs, same-rider cooldowns, and unavailable reports.
- `RIDER_CONNECT_HASH_SECRET` is the server-only phone-hash secret for staging/production.
- The MVP does not include payments, order tracking, delivery dispatch, rider login, live rider GPS, availability guarantees, delivery guarantees, or WhatsApp API outbound sending.

### Public Mobile Discovery

- Mobile discovery now uses a fixed bottom dock with `Home`, `Map`, and `About`.
- `Home` contains the mobile header, shared search/filter controls, location messaging, vendor sections, and vendor cards.
- `Map` contains the dedicated map view, shared search/filter controls, map refresh, marker selection, and selected vendor panel.
- `About` contains lightweight support/about guidance only; it does not render search, filters, map, or vendor results.
- Home and Map share one search/filter/selected-vendor state. Search, category, price, open-now, and radius filters persist when switching between them.
- The selected vendor panel on the mobile Map tab flows naturally below the map through normal page scrolling.
- Desktop keeps the existing combined discovery layout with list/search content in the left column and map/selected vendor content in the right column.

### Search, Radius, Empty States, and Map Refresh

- Radius filters currently support 1 km, 5 km, 10 km, and 30 km.
- Radius/search/category/open-now/price filters are shared across mobile Home, mobile Map, and desktop discovery.
- The filter panel now shows a `Filters` header, active-filter count pill, `Clear all`, icon-labeled radius/price/category selects, an open-now card, and a primary `Apply filters` CTA while preserving the existing filtering/query behavior.
- Mobile filter view opens as a bounded sheet with a close button, stacked fields, contained scrolling, and spacing above the fixed bottom dock.
- Desktop filter view keeps radius and price in a two-column row, then category and open-now as full-width controls.
- Friendly empty states now distinguish true empty search/filter/radius results from loading and fetch errors.
- The mobile Map tab keeps the map visible for zero-result states and shows compact empty-state guidance.
- The mobile Map refresh control retries nearby discovery for the current state without hard-refreshing the browser page.

### Cache and Mock-Data Hygiene

- Public discovery snapshots include cache version, browser-origin environment, and a nearby request key.
- Restored nearby data cannot skip a live fetch when the active request key differs from the cached key.
- Malformed cached vendor records are rejected before hydration.
- Known Playwright/mock vendor ids and known mock slugs are rejected before they can hydrate discovery state or retained-vendor memory.
- Admin vendor mutations invalidate restored public discovery state after vendor create, update, deactivate, hours, image, and featured-dish changes.

### Analytics Integrity

- `/api/events` remains fire-and-forget and must not block public UI.
- Referenced vendor ids are validated before `user_events` insert.
- Stale or nonexistent vendor ids are skipped safely with sanitized operational logging instead of triggering database foreign-key failures.
- Valid vendor events still feed admin analytics and usage-signal ranking.

### Rating Signals

- Star ratings remain the primary public rating signal.
- Users may optionally choose up to two predefined rating signals after selecting a star rating.
- No free-text reviews, public complaint pages, or public accusation feeds are included.
- Rating signals are stored in isolated catalog/selection tables instead of on `public.ratings`.
- Public confidence badges are positive-only, thresholded, capped, and secondary to the star rating.
- One-off ratings and duplicate retries cannot create or inflate confidence badges.
- Negative and neutral signals remain internal/admin-only and are not exposed through public vendor detail responses.
- Admin vendor edit can show aggregate-only signal counts for operational awareness without rating identities, anonymous hashes, IPs, or per-rating rows.

### Branding and Vendor Profile Polish

- Public header branding now shows the Localman icon beside the existing Localman text on mobile and desktop.
- Discovery vendor cards and selected vendor preview actions keep lightweight icons beside `Call` and `Directions`; `View details` retains its existing icon treatment.
- Vendor detail primary actions show lightweight icons beside `Call`, `Directions`, and `Request Rider`.
- Vendor detail includes a dedicated `Share this vendor with a friend` section below vendor metadata, separate from the primary action row.
- The share section supports native share and copy-link behavior using the canonical `/vendors/[slug]` URL.
- The dedicated WhatsApp share button was removed; WhatsApp remains available through supported native share sheets.

### PWA Runtime Foundation

- Localman now has Phase 0 and Phase 1 PWA groundwork for installable browser-app behavior.
- Phase 0 generated high-definition Android, iOS, browser, apple-touch, favicon, and maskable icon assets from the official Localman PNG logo, using a white install-icon background and preserving the brand colors/proportions.
- The manifest references install metadata, standalone display mode, theme/background colors, and the generated icon set.
- `/sw.js` registers only in production on HTTPS, `localhost`, or `127.0.0.1`.
- The service worker caches only static shell assets: Next static chunks, manifest, icons, local branding files, seed/static images, fonts, scripts, styles, and `/offline.html`.
- Dynamic marketplace data remains network-owned. `/api/**`, `/admin/**`, `/vendors/**`, `/search`, cross-origin requests, and non-GET requests are bypassed by the service worker.
- Offline navigation shows a lightweight reconnect page and does not present stale nearby vendors, rider availability, ratings, search results, or open/closed vendor state as current.
- The PWA runtime asks the registered service worker to check for updates after registration and when an installed PWA returns to focus or visibility, with throttling to avoid noisy update checks.
- Operators can confirm the loaded PWA runtime through `window.__LOCALMAN_PWA_RUNTIME__` and `html[data-localman-pwa-runtime]`.
- Push notifications, background sync, offline maps, offline discovery, and offline Rider Connect are not implemented.

### Accessibility and UI Hardening

- Rider Connect and rating prompt modal/sheet flows trap focus while open, close on `Escape`, and return focus to the trigger when dismissed.
- Rider Connect form errors are field-specific and connected with accessible descriptions where practical.
- Small touch-target regressions on public utility controls were hardened without changing layout architecture.
- Mobile filter sheets, Rider Connect, rating prompt, selected vendor previews, and bottom-dock spacing were regression-checked for overflow and overlap.

### Performance and Runtime Stability

- Discovery scroll-position persistence is throttled with `requestAnimationFrame` and flushed on `pagehide` so browser-back restoration remains accurate without scroll-time storage spam.
- Public discovery cache hydration is request-keyed and must yield to a live nearby fetch before restored data becomes authoritative.
- The service worker version bump removes older `localman-static-*` caches on activation while preserving the no-dynamic-API-cache rule.
- Known remaining scaling constraints are process-local rate limiting, app-side discovery ranking/filtering for the current pilot scale, and the absence of centralized distributed tracing.

### Admin Session and Vendor Images

- Admin sessions are cookie-backed and validated through `/api/admin/session`.
- Background focus/visibility refresh keeps authenticated workspaces mounted, including create/edit forms and native file-picker state.
- Vendor image upload state is scoped by selected vendor id.
- Switching vendors clears pending file refs, native file input state, local previews, and stale image-list state.
- Upload success requires both the Storage object and the returned `vendor_images` metadata row.
- Public vendor detail uses storage-backed image rows when available.

### Supabase Security Hardening

- Public-schema Data API access is explicitly granted through migrations.
- Legacy broad grants are revoked and replaced with least-privilege grants.
- RLS remains enabled for public-schema tables.
- `app_schema_migrations` has RLS enabled with a deny-all client policy.
- Future public-schema tables, functions, and sequences fail closed until a migration grants access intentionally.
- RLS helper functions remain executable because policies call them; trigger/admin/RPC functions stay service_role-only unless documented otherwise.

### Regression Protection

The current regression-lockdown suite covers:

- mobile Home/Map shared search/filter state
- radius filter cache/request-key safety
- mock vendor cache contamination
- invalid analytics vendor ids
- admin session refresh form-state preservation
- image picker form reset prevention
- mobile dock state persistence
- map refresh state persistence
- empty-state rendering
- selected vendor synchronization
- discovery cache request-key mismatch handling
- Rider Connect form validation before suggestion fetches
- PWA service-worker static-cache boundaries and runtime freshness markers
- modal focus trapping and Escape-close behavior

### Release Gate

Before production promotion, run:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run db:check`
- `npm run smoke:nearby`
- targeted mobile discovery Playwright tests
- targeted admin upload/session Playwright tests
- `npm audit`

High-severity dependency advisories remain deployment blockers even when functional tests pass.
