# Local Man UI Performance and Stability Rules

This document records the current lightweight UI constraints and stability decisions.

## Core performance constraints

- no images on vendor cards
- no heavy remote media on discovery surfaces
- vendor detail hero images should use responsive sizing and lazy browser loading
- Supabase-hosted vendor detail images should prefer transformed widths instead of full-size originals
- minimal animation
- lightweight inline SVG for small identity or metadata icons
- keep discovery usable on weak mobile networks

## PWA runtime cache constraints

- the service worker is a static-shell optimization only, not an offline-first data layer
- cache only static asset classes: `/_next/static/`, icons, local branding, seed/static images, manifest, fonts, scripts, styles, and `/offline.html`
- do not service-worker-cache `/api/**`, `/admin/**`, `/vendors/**`, `/search`, Rider Connect, rating, nearby discovery, search/filter, or open/closed vendor payloads
- navigation is network-first; offline fallback must use `/offline.html` and must not show stale marketplace state as current
- service worker registration is production-only and should not run during `npm run dev`
- update cache names deliberately so old `localman-static-*` caches can be removed predictably during activation

## Discovery-specific constraints

- map remains visible without oversized decorative UI
- discovery card and map props should stay stable enough to avoid unnecessary re-renders
- selected vendor preview stays compact so the map keeps usable space
- filter surfaces are collapsible on mobile and web
- the current filter panel is CSS and inline-SVG based; it must not add animation libraries, component frameworks, or new runtime-heavy effects
- mobile filter sheets use contained scrolling and `overscroll-behavior` so they do not trap the page behind the fixed bottom dock
- section navbars switch existing content instead of fetching new data per tab
- mobile Home and Map tabs share one discovery state instead of duplicating fetches or filter state
- mobile Map refresh should reuse the existing nearby fetch path and must not hard-refresh the browser page

## Layout-shift prevention

Current stability rules include:

- no repeated vendor reselection updates when the same vendor is tapped again
- no vendor-list refetch on simple selected-vendor changes
- no flicker of the nearby-results helper row during vendor selection
- no scroll-anchor jumps from dynamic upper panels such as the selected vendor panel or last-selected panel
- no horizontal viewport growth on narrow mobile widths, including 320px long unbroken vendor content cases
- no admin vendor-image page reset or route reload when selecting a local file
- no cross-vendor preview or file-input state leakage after switching edit sessions
- no stale discovery cache hydration when the nearby request key, cache version, browser origin, or vendor payload shape is unsafe
- the mobile Map selected vendor panel stays in normal page flow above the fixed dock
- discovery scroll-position snapshot writes are frame-throttled so sessionStorage persistence does not run for every raw scroll event

## Known regression fixes in this phase

### Vendor-selection jank

Problem:

- tapping a vendor could trigger redundant selection work and visible jumpiness

Fix:

- guard against reselection of the already-selected vendor
- keep dynamic upper panels out of browser scroll anchoring

### Nearby helper-row flicker

Problem:

- the row under `Nearby vendors` could flash loading text during vendor selection

Fix:

- decouple nearby-vendor loading from last-selected retention updates
- keep the nearby section mounted and stable during selected-vendor changes

### Responsive leakage

Problem:

- web and mobile ordering rules leaked into each other during rapid UI iteration

Fix:

- explicit breakpoint-specific ordering and mobile dock state for:
  - header
  - floating filters
  - map
  - selected vendor
  - location panel
  - vendor sections
  - retention panels

### Discovery cache leakage

Problem:

- stale browser discovery state or Playwright-shaped vendors could hydrate the public UI and emit invalid analytics vendor ids

Fix:

- include a nearby request key with restored snapshots
- scope cache envelopes by version and browser origin
- reject malformed vendor records and known mock/test vendor identities before hydration
- require a live nearby fetch when restored data is not authoritative for the active filter state

### Scroll persistence jank

Problem:

- discovery state persistence wrote the current scroll position to browser storage directly from every scroll event

Fix:

- keep the passive scroll listener, but schedule storage persistence through `requestAnimationFrame`
- flush immediately on `pagehide` so browser-back restoration still has the latest scroll position

### Vendor-image upload state leakage

Problem:

- upload state could appear stable for one vendor but later reuse stale file, preview, or image-list state after switching vendors during the same admin runtime

Fix:

- key the Vendor Images section by selected vendor id
- use the native file input as the upload source of truth at submit time
- revoke local object URLs on replacement and unmount
- clear image-list state during uncached vendor switches
- merge uploaded images only after filtering current and returned rows by selected `vendor_id`

## Theme and visual identity constraints

- morning, afternoon, and night themes must remain readable
- food identity styling should be lightweight and not compete with core content
- decorative marks must not cause layout shift or increase bundle weight materially
