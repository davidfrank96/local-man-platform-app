## Title
The Local Man — Current Sprint

## Sprint Goal
Complete Phase 5 `UX Polish & Real-User Feedback Iteration` without expanding the product scope.

## In Scope
- keep public discovery, vendor cards, selected state, and vendor detail flows aligned with current behavior
- preserve back-navigation and `Back to map` state restoration
- keep location handling honest and retryable across precise, approximate, and default-city modes
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
- real Google Maps JavaScript integration
- concrete live IP approximation provider selection
- broad product expansion beyond discovery, vendor detail, and admin maintenance

## Done Criteria
Phase 5 is done when:
- docs describe the current UX and location behavior accurately
- vendor cards consistently show all required fields, including `Today:` hours
- selected vendor states remain readable and obvious across morning, afternoon, and night themes
- browser back and `Back to map` restore discovery state without manual reload
- precise location, fallback behavior, retry behavior, and reverse location display remain stable
- admin vendor maintenance flows remain functional
- lint, typecheck, unit tests, browser smoke tests, build, and nearby smoke all pass

## Current Phase 5 Status
- Vendor cards use a compact food-discovery layout with required actions and status fields.
- Vendor cards show compact `Today:` hours and preserve those fields after selection.
- Selected vendor cards and selected vendor preview panels use a stronger, readable highlight treatment.
- `Back to map` and browser-back restore discovery vendors, filters, selection, and scroll state.
- Public discovery uses client-local morning, afternoon, and night theming while keeping vendor cards light and readable.
- Public location handling distinguishes precise, approximate, and default-city modes with explicit trust messaging.
- Reverse location lookup shows human-readable area labels when available and falls back to rounded coordinates when it is not.
- Admin vendor creation, editing, deactivation, hours, dishes, and image management remain part of the active maintained surface.

## Current Phase 5 Warnings
- IP approximation is still an interface only; there is no live provider yet.
- Reverse geocoding is best-effort and depends on external availability.
- The public map is still the lightweight MVP map surface rather than a full SDK integration.
- Admin auth still uses browser-stored session state and bearer-backed API requests rather than an HTTP-only cookie SSR model.
- Pilot quality still depends on complete and accurate vendor data entry.

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
