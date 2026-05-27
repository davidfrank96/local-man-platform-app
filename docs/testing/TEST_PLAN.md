## Title
Local Man — Test Plan

## Test Goal
Ensure the runtime, admin operations, public discovery surface, Phase 5 UX polish, and Phase 6 usage signals remain coherent before commit, deployment, or pilot use.

Release-discipline notes:
- release candidates should come from a clean committed worktree so the tested source tree matches the deployable artifact
- on local macOS sandboxed runs, Chromium launch may fail before Playwright can open the app; rerun those browser checks outside the sandbox and treat the in-sandbox failure as an environment limitation rather than an app regression
- a passing functional gate is not enough for production promotion when `npm audit` reports high-severity advisories

## Documentation Validation
Check:
- PRD and architecture do not conflict
- schema supports user stories
- API spec matches schema intent
- UI rules match product scope
- roadmap sequence makes sense

## Critical Logic
### Open Now Logic
Test:
- same-day schedules
- overnight schedules
- closed days
- manual overrides

### Location Logic
Test:
- location allowed
- location denied
- location retry after denied or unavailable
- resolved precise location trust messaging
- human-readable reverse location display when available
- coordinate fallback when reverse lookup fails
- no nearby vendors
- incorrect coordinates
- distance calculation accuracy
- nearby radius filtering
- nearby results stay within radius and expose stable `distance_km` and `ranking_score` fields while preserving open-first, distance-first discovery ordering
- browser geolocation success
- IP approximation fallback
- Abuja default city fallback
- approximate location messaging stays approximate and never implies exact nearby accuracy
- default-city fallback does not claim to be the user’s exact location
- denied and unavailable states do not print raw fallback chains to users

Current automated coverage:
- `tests/distance.test.ts`
- `tests/location-acquisition.test.ts`
- `tests/location-display.test.ts`
- `tests/reverse-geocode.test.ts`

Runtime smoke coverage:
- `npm run smoke:nearby`
- Requires real Supabase env vars and seeded Abuja data.
- Validates the `/api/vendors/nearby` response shape, non-empty vendor results, computed `distance_km`, computed `ranking_score`, open/distance/close-popularity ordering, radius filtering, invalid coordinate rejection, partial coordinate rejection, and Abuja fallback behavior.

### Public Discovery Logic
Test:
- public nearby API client sends location, radius, search, category, price, and open-now filters
- discovery sorting keeps open vendors above closed vendors
- distance sorts ascending within each open/closed group
- vendors with higher usage ranking can only beat similarly close vendors within the same open/closed group
- search and category filters do not add a relevance sort that overrides open status, distance, or close-distance usage ranking
- popular-vendor highlighting stays bounded and deterministic
- recently viewed vendors and last selected vendor memory restore cleanly from browser storage
- call links normalize phone numbers
- directions links target Google Maps coordinates
- categories route returns public category summaries
- vendor detail route transforms Supabase nested rows into the documented detail shape
- public UI shows runtime errors when Supabase data is unavailable
- vendor cards always render required fields
- vendor cards remain text-first, compact, image-free on the homepage, and readable without decorative assets
- vendor card and selected vendor preview actions show lightweight icons beside `Call` and `Directions`
- `Active hours:` stays visible before and after card selection
- distance and open/closed state stay visible before and after card selection
- selected vendor highlight remains readable
- selected vendor preview exposes `View details`, `Call`, and `Directions`
- selected vendor preview keeps the existing `View details` icon behavior while preserving `Call` and `Directions` icons
- vendor card metadata row keeps distance and open/closed state visible together
- the real map uses one vendor-marker system only with no clustering
- marker taps update the selected vendor preview without moving the camera
- storefront icon markers remain tappable and update the selected vendor preview
- card selection may gently focus the map without causing page scroll drift
- browser back restores discovery state
- `Back to map` restores discovery state
- restored discovery state keeps search and filter controls usable without manual reload
- mobile Home and Map tabs share search, category, price, open-now, radius, and selected-vendor state
- mobile About renders no search/filter controls and does not reset shared discovery state
- mobile radius filters return correct results for 1 km, 5 km, 10 km, and 30 km where seeded data exists
- filter panel header renders `Filters`, the active count pill, `Clear all`, and `Apply filters`
- `Clear all` remains visible but disabled when no non-default filters are active
- mobile filter sheet remains viewport-bounded, scrollable when needed, and clear of the fixed bottom dock
- desktop filter panel keeps radius/price side by side and category/open-now full width
- stale wider-radius or different-filter cached snapshots cannot hydrate a mismatched request key
- mock/test vendor ids and known mock slugs cannot hydrate public discovery cache or retained vendor memory
- discovery scroll-position snapshot persistence is throttled through animation frames and flushes on page hide
- friendly empty states appear only after loading completes for true empty search/filter/radius states
- mobile Map keeps the map visible when filtered results are empty and shows a lightweight empty-state overlay
- mobile Map refresh retries nearby discovery without a hard page reload and preserves current filters
- small-phone and tablet layouts remain stable
- public mobile polish keeps useful content reachable without the map or hero dominating the first screen
- time-based morning, afternoon, and night themes do not compromise card readability
- public shell applies the correct browser-local theme attribute for morning, afternoon, and night
- uploaded vendor images appear on vendor detail pages
- vendor detail layout stays compact on desktop and mobile without hiding sections
- vendor detail primary actions show icons beside `Call`, `Directions`, and `Request Rider`
- vendor detail renders a dedicated `Share this vendor with a friend` section below metadata, outside the location block and primary action row
- native share and copy-link actions use the canonical vendor detail URL without tracking params
- the dedicated WhatsApp share button is absent; WhatsApp availability comes from native share sheets where supported
- location reminder toast appears on discovery load and can be closed without blocking the page
- location reminder toast auto-dismisses after roughly five seconds

Current automated coverage:
- `tests/public-api-client.test.ts`
- `tests/public-routes.test.ts`
- `tests/discovery-ranking.test.ts`
- `tests/public-user-action-tracking.test.ts`
- `tests/discovery-cache.test.ts`
- `tests/frontend-stability.test.ts`
- `tests/vendor-retention.test.ts`
- `tests/e2e/app-smoke.spec.ts`
- `tests/e2e/layout-stress.spec.ts`

### PWA Runtime Logic
Test:
- `/sw.js` registers only in production-safe browser contexts
- service worker scope stays at `/`
- service worker cache names are versioned and predictable
- runtime marker exposes the expected PWA shell version without user data
- focus/visibility return checks ask the registered service worker for updates without creating update loops
- precache list contains only install/static fallback assets
- `/_next/static/`, icons, local branding, seed/static images, manifest, fonts, scripts, and styles are cache-eligible
- `/api/**`, `/admin/**`, `/vendors/**`, `/search`, cross-origin requests, and non-GET requests bypass the service worker cache
- nearby discovery, Rider Connect, ratings, search/filter, open/closed state, and admin/session payloads are not stored in `CacheStorage`
- offline navigation falls back to `/offline.html`
- offline fallback copy does not present stale vendors, riders, ratings, or search results as live data
- production install/runtime checks confirm the service worker does not create update loops or duplicate fetch storms

Current automated coverage:
- `tests/pwa-runtime.test.ts`

### Public Rating Logic
Test:
- valid 1-5 vendor rating is accepted
- invalid scores are rejected
- unknown vendor slug returns `NOT_FOUND`
- rating RPC failures return `UPSTREAM_ERROR`
- star-only rating payloads remain valid
- optional predefined rating signals submit with the rating atomically
- signal-only payloads are rejected before any upstream write
- unknown, inactive, duplicate, excessive, or score-mismatched signals are rejected
- vendor lookup connectivity failures return `UPSTREAM_ERROR`
- first anonymous browser rating for a vendor succeeds
- second rating for the same vendor and anonymous browser identity returns a clean duplicate response and does not update the aggregate
- the same anonymous browser identity can rate a different vendor
- a different anonymous browser identity can rate the same vendor once
- rating summary updates:
  - `average_rating`
  - `review_count`
- vendor cards and detail continue to show `New` when no ratings exist
- repeated rating spam from one client is rate limited
- duplicate sequential and concurrent rating retries collapse into one upstream write
- reordered duplicate signal retries collapse into one upstream write and cannot inflate signal counts
- public rating controls disable after success and stay disabled on refresh using client-side storage
- route returns the database-owned post-write summary instead of recomputing ratings client-side
- public confidence badges appear only as thresholded positive summaries
- public badge responses do not expose negative signals, neutral signals, raw counts, per-rating rows, or anonymous hashes
- public copy avoids complaint, accusation, safety-warning, certification, or blacklist framing
- admin signal visibility stays aggregate-only and access-controlled

Current automated coverage:
- `tests/public-rating-route.test.ts`
- `tests/public-routes.test.ts`
- `tests/rating-signals.test.ts`
- `tests/e2e/app-smoke.spec.ts`

### Rider Connect Logic
Test:
- public rider application page renders independent-rider and no-payment/no-guarantee copy
- rider application rejects missing required fields, invalid phone values, missing consent, and missing independent-rider disclaimer
- successful rider applications create `pending` and `hidden` rider rows only
- admin rider APIs are protected from unauthenticated and unauthorized access
- admins can list riders, view rider detail, update verification status, update visibility status, and edit safe profile fields
- admin rider create/edit persists paired weekday/weekend availability times and rejects incomplete ranges while allowing overnight ranges
- invalid rider status values and unsafe fields are rejected
- public rider suggestions return at most 3 verified, visible, currently available riders
- public rider suggestions do not permanently exclude eligible riders beyond the first fetch window
- public rider suggestions keep operating area informational only and never use area/proximity as a hard eligibility filter
- public rider suggestions never include rider phone, WhatsApp phone, full legal name, notes, full plate, or internal status fields
- Request Rider blocks missing name, missing phone, invalid Nigerian phone values, missing manual address, and missing current-location area before any suggestion request
- accepted phone examples include `08012345678`, `+2348012345678`, and `2348012345678`
- shortened values such as `0813273210`, `+234813273210`, and `234813273210` stay invalid
- contact handoff requires disclaimer acceptance and a selected verified/visible/currently available rider
- contact handoff stores a minimal contact intent, hashes customer phone, and does not persist raw customer phone or full address
- contact handoff returns a WhatsApp URL for the selected rider only
- unavailable reports validate reason values, hash optional reporter phone, and stay admin-review-only
- Rider Connect application, suggestion, contact, and report routes return clean `TOO_MANY_REQUESTS` responses when rate limited
- user-facing Rider Connect copy rejects payment, dispatch, courier, driver, and guarantee wording
- Rider Connect does not add payments, order tracking, dispatch assignment, rider login, or WhatsApp API outbound sending
- Rider Connect modal traps focus, closes on `Escape`, and returns focus to the Request Rider trigger
- rating prompt modal/sheet traps focus, closes on `Escape`, and returns focus to the rating trigger

Current automated coverage:
- `tests/rider-connect-schemas.test.ts`
- `tests/rider-application-route.test.ts`
- `tests/admin-rider-routes.test.ts`
- `tests/public-rider-routes.test.ts`
- `tests/public-api-client.test.ts`
- `tests/e2e/app-smoke.spec.ts`

### Abuse Protection Logic
Test:
- repeated invalid admin login attempts are rate limited
- repeated public search abuse is rate limited without blocking normal default-city browsing
- repeated public analytics event floods are rate limited without turning analytics failures into public UX failures
- repeated Rider Connect applications, suggestions, contact handoffs, same-rider handoffs, and unavailable reports are rate limited without leaking private rider data
- repeated identical event retries collapse into one upstream write
- blocked responses expose structured `TOO_MANY_REQUESTS` or endpoint-safe degraded responses
- hashed limiter logging never requires raw client IP assertions in tests

Current automated coverage:
- `tests/admin-session-routes.test.ts`
- `tests/public-event-route.test.ts`
- `tests/public-nearby-route.test.ts`
- `tests/public-rating-route.test.ts`
- `tests/public-rider-routes.test.ts`
- `tests/rider-application-route.test.ts`

### Observability Logic
Test:
- structured server logger serializes safe error fields
- structured server logger redacts secrets, cookies, tokens, raw request-body fields, and database URLs
- safe incoming request ids are preserved
- unsafe request ids are replaced with generated internal ids
- debug logs stay disabled unless explicitly enabled
- only selected warn/error/degraded/rate-limited/slow events and selected admin mutation events are persisted when operational-event storage is enabled
- persisted operational-event payloads stay sanitized and environment-tagged
- operational-event persistence failures never break the original request flow
- nearby degraded empty responses emit a distinct failure log instead of looking like true empty search results
- ratings RPC failures emit structured route-failure logs without leaking sensitive config
- admin session validation failures emit structured auth logs without leaking cookies or auth headers
- public event tracking with stale or nonexistent vendor ids returns safely without violating `user_events` foreign keys

Current automated coverage:
- `tests/observability.test.ts`
- `tests/public-nearby-route.test.ts`
- `tests/public-rating-route.test.ts`
- `tests/admin-session-routes.test.ts`
- `tests/public-event-route.test.ts`

### Admin Foundation Logic
Test:
- missing admin session returns `UNAUTHORIZED`
- authenticated non-admin user returns `FORBIDDEN`
- authenticated user missing `admin_users` membership returns `FORBIDDEN`
- authenticated admin user is accepted
- cookie-backed admin session validation route returns the authenticated admin identity
- expired cookie-backed admin sessions refresh server-side when a valid refresh cookie is present
- background focus/visibility refresh does not unmount authenticated route-guard children or reset create/edit form state
- removed `admin_users` membership clears privileged cookies and blocks the stale session
- vendor listing supports pagination and filters
- vendor create writes audit log
- vendor update writes audit log
- vendor soft-delete writes audit log
- vendor hours replacement writes audit log
- vendor image upload writes audit log
- vendor image list and removal work against the same admin surface
- vendor image list normalizes storage-path-only rows into browser-loadable public URLs
- vendor image optimization validates real image bytes, resizes oversized uploads, writes matching content type and extension, and falls back safely when transformation fails
- vendor image upload fails if the Storage object is written but the `vendor_images` metadata row is not returned
- vendor image upload state is isolated by selected vendor id and cannot reuse a stale file from a prior vendor edit session
- vendor image upload uses the current native file input value even if React state and the DOM briefly diverge
- vendor image list state filters cached, fetched, uploaded, and deleted rows by the selected vendor id
- vendor hours can be loaded into the admin edit form before replacement
- vendor featured dishes can be loaded for the selected vendor before adding more
- vendor featured dish insertion writes audit log
- vendor featured dish removal writes audit log and updates the selected-vendor edit surface
- name updates do not silently change the vendor slug
- base vendor creation requires explicit acknowledgement when hours, featured dishes, or images are still missing
- empty image and dish arrays are rejected
- invalid image type and oversize uploads are rejected before storage writes
- corrupt image bytes are rejected before storage writes
- malformed Supabase payloads return controlled `UPSTREAM_ERROR` responses
- admin analytics route requires admin auth
- admin analytics route aggregates summary counts correctly
- admin analytics route tolerates empty `user_events`
- admin audit-log route returns the recent-team-activity pagination contract expected by the admin activity page
- admin audit-log route treats empty audit-log results as a valid success state
- admin logs route requires strict admin-only auth
- admin logs route sanitizes metadata before returning it
- admin logs route treats empty operational-event results as a valid success state
- admin analytics helper logic handles empty vendor performance and recent user events safely
- admin analytics recent-events and ranking lists remain internally scrollable without reintroducing page-height expansion controls
- admin activity and vendor-registry list panels stay internally scrollable for admin and agent workspaces
- admin logs list stays internally scrollable and does not render metadata as HTML
- usage-signal vendor ranking helper aggregates weighted vendor event counts safely

Current automated coverage:
- `tests/admin-auth.test.ts`
- `tests/admin-session-client.test.ts`
- `tests/admin-analytics-route.test.ts`
- `tests/admin-analytics-view.test.ts`
- `tests/admin-audit-logs-route.test.ts`
- `tests/admin-logs-route.test.ts`
- `tests/admin-vendor-routes.test.ts`
- `tests/admin-vendor-subresources.test.ts`
- `tests/admin-api-client.test.ts`
- `tests/vendor-usage-ranking.test.ts`
- `tests/admin-user-routes.test.ts`

Manual admin UI smoke coverage:
- open `/admin` and confirm redirect to `/admin/login`
- open `/admin/vendors` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/analytics` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/activity` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/logs` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/vendors/new` and confirm the protected route still resolves to the admin login gate when signed out
- open `/admin/vendors/[id]` and confirm the protected route still resolves to the admin login gate when signed out
- sign in with an email/password account that exists in `admin_users`
- open `/admin/vendors`
- open `/admin/vendors/new`
- fill create-vendor form fields, open a native file picker, select an image, and confirm the page does not reload and field values remain
- open `/admin/vendors/[id]` with a valid vendor id
- load vendors
- confirm the dashboard overview cards show vendor totals and missing-data counts
- confirm high-volume analytics, activity, and vendor-registry lists scroll inside their cards instead of expanding the full page
- confirm the Logs page keeps operational rows inside the contained scroll panel, uses compact expandable summaries, and renders metadata details safely without horizontal overflow
- if `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE=false`, confirm the Logs page can still show the correct empty state instead of treating the absence of persisted rows as an error
- confirm the registry shows completeness badges for missing hours, images, and featured dishes
- confirm the create vendor page shows:
  - basic details
  - opening hours
  - featured dishes
  - vendor images
  - review and create
- create a vendor with Abuja coordinates
- confirm the incomplete-data acknowledgements must be checked before base vendor creation
- confirm hours, dishes, and image can be provided during create flow
- confirm partial failures identify the failed create sub-step
- update the selected vendor
- add one set of seven day hours
- confirm the current hours render in the edit form before saving changes
- save edited hours and confirm a visible success message appears
- upload one image file and verify it appears in the current image list
- confirm a local preview appears before upload
- confirm a visible success message appears after image upload
- switch to a second vendor and confirm the file input, local preview, and image count reset before selecting another image
- upload a different image to the second vendor and confirm logs, request payload, DB row, and storage path show the second file and second vendor id
- switch back to the first vendor and confirm no pending file or preview from the second vendor is retained
- remove the uploaded image and confirm the list updates
- add one featured dish
- confirm the featured dish list updates for the same selected vendor without a manual reload
- remove the featured dish and confirm the list updates without a manual reload
- deactivate the selected vendor with confirmation
- open `/admin/team`
- open `/admin/riders`
- confirm only admins with `riders:manage` can access rider management
- confirm rider search, verification filter, visibility filter, status badges, contact counts, report counts, and the independent-rider note render
- update a rider verification or visibility status and confirm an audit log is written when audit logging is enabled
- create a new admin or agent account
- create the same account again and confirm role assignment succeeds without a stale error banner
- confirm the list refreshes from `admin_users` without a full reload
- confirm missing `full_name` falls back to the email prefix instead of `No name`
- log out and confirm return to `/admin/login`
- verify each action returns a visible status message

Public detail follow-up after admin edits:
- open the public vendor detail page for the edited vendor
- confirm updated hours appear without waiting for a manual cache refresh
- confirm a real uploaded image is preferred over a seed placeholder when one exists
- open Request Rider
- confirm the modal reminds users to call the vendor first
- confirm the disclaimer says Localman connects users, vendors, and independent riders and does not collect payment or guarantee delivery
- submit valid contact details and confirm only public-safe rider suggestions render
- select one rider and confirm the verification sheet shows first name, vehicle, area, availability, masked plate, `Continue to WhatsApp`, `Try another rider`, and `Back to vendor`
- submit incomplete contact/delivery details and confirm the modal shows actionable validation copy before rider selection instead of a raw `Invalid input` message
- confirm report-unavailable flow stores an admin-review report without exposing report data publicly

Release-gate upload sequence:
- run the targeted browser upload tests in `tests/e2e/app-smoke.spec.ts`
- run a real Supabase-backed cross-vendor upload script against local dev runtime
- run the same cross-vendor upload script against local production runtime after `npm run build` and `npm run start`
- inspect `vendor_images`, Storage paths, and `ADMIN_VENDOR_IMAGE_UPLOADED` operational events for matching vendor id and file metadata
- run `npm run db:inspect:playwright` afterward and confirm no QA vendors, users, or storage objects remain

### Vendor Display Logic
Test:
- missing image fallback
- no rating fallback
- no hours fallback
- explicit missing-data copy for area, phone, address, and featured dishes
- compact price-band labels
- `New` fallback for unrated vendors
- vendor cards remain image-free on discovery surfaces
- selected-card readability in all time themes
- selected state does not change open/closed data

## Release Gate Checklist
Run before signoff:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:nearby`
- `npm run test:e2e`
- targeted Rider Connect API/UI tests when Rider Connect code or copy changes
- targeted PWA runtime tests when service-worker, manifest, icon, or runtime freshness code changes

Manual viewport checks:
- `320px`
- `375px`
- `414px`
- `768px`
- `1024px`
- `1440px`

Manual UI checks:
- mobile Home, Map, and About dock tabs render only on mobile
- mobile Home shows search/filter and vendor cards
- mobile Map shows shared search/filter, map refresh, map/fallback, and selected vendor panel
- mobile filter sheet shows the close button, active-count pill, stacked controls, open-now card, and `Apply filters`
- desktop filter panel shows the active-count pill, `Clear all`, two-column radius/price controls, full-width category, open-now card, and `Apply filters`
- mobile About shows support/about copy only
- desktop keeps the combined discovery layout and does not show the mobile dock
- vendor cards remain compact, readable, and image-free
- selected vendor preview keeps `Call`, `Directions`, and `View details` accessible
- vendor detail hero remains compact and readable
- public surfaces avoid heavy decorative assets, blur-heavy panels, and large eager images
- header branding renders the Localman icon beside the existing text without mobile overflow, navigation collision, or layout shift
- map controls stay visible
- MapLibre should load when `NEXT_PUBLIC_MAP_STYLE_URL` is configured, and the coordinate fallback map should take over quietly when it is not or when map loading fails.
- the real map should show oxblood storefront markers by default, a green storefront marker when selected, a blue user-location marker, and no cluster bubbles
- mobile Map selected vendor panel should flow below the map through normal page scrolling
- mobile marker taps should update the selected preview without drifting the map or scrolling the page down
- mobile pinch zoom and drag-pan should be checked on a real device before final release confidence
- no horizontal overflow on mobile
- morning, afternoon, and night themes stay readable
- Rider Connect and rating prompt keyboard navigation remains usable with focus trap and Escape-close behavior

### Admin Data Quality
Test:
- invalid coordinates
- duplicate slugs
- invalid hours
- unsupported image type

## Test Artifact Discipline
For any Playwright or QA flow that creates persistent admin-side records, use deterministic namespaces so cleanup stays scoped and reversible.

Current approved namespaces:
- vendor names: `QA Admin Vendor PLAYWRIGHT_...`
- vendor names for generic QA records: `QA_TEST_PLAYWRIGHT_...`
- explicit test marker prefix: `PLAYWRIGHT_...`
- ratings/comments marker prefix: `QA_E2E_PLAYWRIGHT_...`
- test-only account local parts: `qa_admin_playwright_...`, `qa_agent_playwright_...`

Cleanup utilities:
- `npm run db:inspect:playwright`
- `npm run db:cleanup:playwright`

Shared helpers:
- browser-state isolation: [tests/e2e/helpers/public-discovery.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/tests/e2e/helpers/public-discovery.ts)
- artifact factories and cleanup registry: [tests/e2e/helpers/playwright-artifacts.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/tests/e2e/helpers/playwright-artifacts.ts)
- namespace matchers: [lib/testing/playwright-artifacts.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/testing/playwright-artifacts.ts)

Rules:
- inventory first, then review the candidate list before deletion
- never reuse these prefixes for seeded or production records
- storage uploads created by tests should remain linked to those namespaces so the cleanup SQL can remove only verified test objects
- shared-environment cleanup requires explicit acknowledgement through `LOCALMAN_ALLOW_SHARED_ENV_TEST_CLEANUP=1` unless CI already sets `CI=true`
- destructive vendor invalidation must prune browser retention state as well as discovery snapshots
