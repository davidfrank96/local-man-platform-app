## Title
The Local Man — Architecture and Product Decisions

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
**Impact:** Full review systems are deferred.

### Decision 007
**Decision:** Supabase will handle database, admin auth, and storage in MVP.
**Reason:** Faster to ship and easier for AI-guided implementation.
**Impact:** Avoids unnecessary custom backend setup early.

### Decision 008
**Decision:** The product will prioritize discovery, not delivery.
**Reason:** Core value is visibility and location-based finding, not logistics.
**Impact:** Delivery, payments, and live order systems remain out of scope.
