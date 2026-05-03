## Title
The Local Man — Current Sprint

## Sprint Goal
Close Phase 6 `Usage Signals` with a stable analytics surface, discovery refinement informed by real usage, and lightweight retention/rating loops that do not add backend weight.

## In Scope
- keep Phase 5 public discovery and admin workflows stable
- add internal analytics visibility for real usage signals
- use those signals to improve discovery ordering without adding opaque ranking logic
- add lightweight retention helpers for recent and last-selected vendors
- add simple public vendor ratings without expanding into a full review system
- keep public event tracking lightweight and non-blocking
- expose admin-only analytics at `/admin/analytics`
- summarize sessions, events, vendor performance, and drop-off signals safely
- keep public discovery, vendor cards, selected state, and vendor detail flows aligned with current behavior
- preserve back-navigation and `Back to map` state restoration
- keep location handling honest, trust-first, and retryable across precise, approximate, and default-city modes
- maintain human-readable location display with coordinate fallback when reverse lookup fails
- refine time-based theming without compromising card readability
- keep admin vendor create, edit, deactivate, hours, dishes, and image flows stable
- keep tests, docs, and runtime checks aligned with the shipped surface

## Out of Scope
- delivery
- payments
- chat
- loyalty
- vendor self-signup
- complex role management
- switching the public discovery renderer to Google Maps JavaScript
- concrete live IP approximation provider selection
- broad product expansion beyond discovery, vendor detail, and admin maintenance

## Done Criteria
Phase 6 signal visibility is ready when:
- docs describe the current analytics behavior accurately
- public tracking remains fire-and-forget and non-blocking
- `/admin/analytics` is protected by admin auth
- analytics summaries, vendor performance, drop-off panels, and recent activity load without breaking when data is sparse
- discovery ordering remains open-now-first, relevance-aware, and usage-ranked without regressing location or selection behavior
- local retention helpers stay non-blocking and device-local only
- simple ratings update vendor aggregate score display without introducing comments or account requirements
- Phase 5 public and admin workflows remain green under the full regression gate
- lint, typecheck, unit tests, browser smoke tests, build, and nearby smoke all pass

## Current Platform Status
- Vendor cards use a compact food-discovery layout with required actions and status fields.
- Vendor cards show compact `Active hours:` and preserve those fields after selection.
- Selected vendor cards and selected vendor preview panels use a stronger, readable highlight treatment.
- `Back to map` and browser-back restore discovery vendors, filters, selection, and scroll state.
- Public discovery uses client-local morning, afternoon, and night theming while keeping vendor cards light and readable.
- Public location handling distinguishes precise, approximate, and default-city modes with explicit trust messaging.
- Public discovery can bootstrap default-city nearby vendors and the MapLibre surface while precise location is still resolving, then upgrade results when location becomes available.
- Trust-first location display shows precise location only when browser geolocation succeeds, approximate location only when a usable approximate label exists, and neutral copy otherwise.
- Reverse location lookup shows human-readable area labels when available and falls back to rounded coordinates when it is not.
- Admin vendor creation, editing, deactivation, hours, dishes, and image management remain part of the active maintained surface.
- Admin vendor updates keep slugs stable by default so public detail URLs do not break when names change.
- Base vendor creation requires explicit acknowledgement for missing hours, featured dishes, and images.
- Admin hours entry uses compact 12-hour text input and converts to the existing 24-hour storage format before save.
- Admin media editing now distinguishes vendor profile images from optional featured dish image URLs, with remove actions for current featured dishes.
- Admin workspace is split cleanly across dashboard, vendor registry, create vendor, and focused vendor edit routes.
- Create vendor now supports a fuller onboarding flow with basic details, hours, featured dishes, image selection, acknowledgements, and review before create.
- Admin team access now refreshes from `admin_users` after mutation and treats existing auth users as a recoverable success path.
- Public event tracking records session, selection, detail, call, directions, search, and filter signals in `user_events`.
- Admin now includes a read-only analytics workspace for summary metrics, vendor rankings, drop-off signals, and recent activity.
- Nearby discovery now uses a simple weighted `ranking_score` from usage signals and keeps distance as a tie-breaker rather than the only sort rule.
- Discovery now highlights popular nearby vendors, keeps open vendors easier to find, and applies a clearer search ordering.
- Public discovery now remembers recently viewed vendors and the last selected vendor locally in the browser.
- Public vendor detail now supports a lightweight 1-5 star rating flow that updates aggregate vendor rating state.

## Current Warnings
- IP approximation is still an interface only; there is no live provider yet.
- Reverse geocoding is best-effort and depends on external availability.
- The public discovery map now uses optional client-side MapLibre with a browser-safe MapTiler style URL when configured and degrades to the existing coordinate fallback when it is not.
- The current real map intentionally ships without clustering; it uses one vendor-marker system, stable marker selection, and mobile-safe selected-preview placement.
- Admin auth still uses browser-stored session state and bearer-backed API requests rather than an HTTP-only cookie SSR model.
- Pilot quality still depends on complete and accurate vendor data entry.
- Historical `user_events` rows may not include `session_id`, so exact session drop-off reporting can be incomplete until newer traffic accumulates.
- Discovery retention is browser-local only and does not sync across devices.

## Readiness
Phase 6 is functionally complete. Deployment readiness depends on keeping the regression gate, runtime gate, and production environment configuration green together.

## Phase 5 Boundaries
Allowed:
- UX polish that does not bloat the interface
- readability, spacing, hierarchy, and selected-state refinements
- location trust messaging and retry behavior improvements
- documentation alignment
- regression coverage improvements

Still not allowed:
- delivery, payments, chat, loyalty, coupons, inventory, or vendor self-signup
- speculative feature work that is not grounded in current pilot use
- heavy visual redesign, media-heavy UI, or new third-party UI frameworks
