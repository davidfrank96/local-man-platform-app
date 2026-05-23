## Title
Local Man — Architecture and Product Decisions

## Decision Log

### Decision 001
**Decision:** The MVP will be web-first, not native mobile first.
**Reason:** Faster development, easier iteration, lower launch friction.
**Impact:** Mobile apps can be added later once product fit is clearer.

### Decision 002
**Decision:** Public users will not log in during MVP.
**Reason:** Reduces complexity and speeds delivery.
**Impact:** Ratings and personalization stay simple in version 1.

### Decision 003
**Decision:** Vendor onboarding is admin-managed in MVP.
**Reason:** Better data quality and lower fraud/garbage listings.
**Impact:** Internal operations handle the first vendor dataset.

### Decision 004
**Decision:** The initial pilot market is Abuja only.
**Reason:** Better density, better validation, less thin distribution.
**Impact:** Expansion comes after pilot learning.

### Decision 005
**Decision:** MapLibre with a browser-safe MapTiler style URL will be used for interactive map rendering, while Google Maps will be used only for external directions deep links.
**Reason:** MapLibre keeps the embedded discovery map aligned with the shipped implementation, while Google Maps still provides a familiar directions handoff.
**Impact:** Requires `NEXT_PUBLIC_MAP_STYLE_URL` management for the real map, while Google Maps API keys are not required for the current embedded renderer.

### Decision 006
**Decision:** Ratings will exist in MVP but stay lightweight.
**Reason:** Social proof helps discovery, but moderation complexity must stay low.
**Impact:** Star ratings remain primary, optional rating signals are predefined and limited, public confidence badges stay conservative and positive-only, and full review systems are deferred.

### Decision 007
**Decision:** Supabase will handle database, admin auth, and storage in MVP.
**Reason:** Faster to ship and easier for AI-guided implementation.
**Impact:** Avoids unnecessary custom backend setup early.

### Decision 008
**Decision:** The product will prioritize discovery, not delivery.
**Reason:** Core value is visibility and location-based finding, not logistics.
**Impact:** Delivery, payments, and live order systems remain out of scope.

### Decision 009
**Decision:** Admin vendor-image upload state is isolated by selected vendor id, and upload success requires a returned metadata row.
**Reason:** Real runtime debugging showed that storage success alone is not enough; stale file refs, stale image-list state, or missing `vendor_images` rows can make an upload appear successful while the UI cannot render the image correctly.
**Impact:** Vendor-image UI state must reset on vendor switch, local previews must be revoked deterministically, image lists must be filtered by `vendor_id`, and the backend must fail the upload when the metadata insert does not return the expected row.

### Decision 010
**Decision:** Mobile public discovery uses a Home/Map/About bottom dock while desktop keeps the combined list/map layout.
**Reason:** Small-screen users need search and vendor browsing without the map dominating the Home view, while still retaining a dedicated map experience.
**Impact:** Home and Map share one search/filter/selected-vendor state, About stays informational only, and the selected vendor card on Map must use natural page scrolling.

### Decision 011
**Decision:** Public discovery cache hydration is guarded by cache version, browser-origin environment, nearby request key, and mock/malformed vendor rejection.
**Reason:** Stale or Playwright-shaped vendor records previously reached production-like discovery state and analytics paths.
**Impact:** Cache restores can improve return navigation only when the payload is structurally safe and matches the active request state; otherwise the app discards the cache and refetches.

### Decision 012
**Decision:** Supabase public-schema Data API access is granted explicitly and future public-schema defaults fail closed.
**Reason:** Supabase Data API exposure defaults are changing, and Localman must avoid accidental anon exposure while keeping app routes stable.
**Impact:** Migrations must grant only the minimum needed table/function/sequence access, keep RLS enabled, and document any public or service_role-only function execution intentionally.

### Decision 013
**Decision:** Rider Connect is a lightweight independent-rider WhatsApp handoff, not a Localman delivery system.
**Reason:** Users may need help coordinating pickup, but Localman should not take on payment, dispatch, employment, rider-availability, or delivery-guarantee obligations in the MVP.
**Impact:** Public suggestions expose safe rider cards only, selected-rider handoff returns a WhatsApp click-to-chat URL, phone values are hashed where stored, admins manage rider profile visibility, and delivery/payment terms stay coordinated directly between the user, vendor, and rider.

### Decision 014
**Decision:** Vendor profile sharing stays client-side and secondary to vendor discovery actions.
**Reason:** Sharing is useful for lightweight referrals, but the MVP should not introduce social-feed behavior, tracking links, or a backend share service.
**Impact:** Vendor detail shows a small dedicated share section with native share and copy-link actions, using the canonical `/vendors/[slug]` URL and no WhatsApp-specific button, referral params, or analytics side effects.
