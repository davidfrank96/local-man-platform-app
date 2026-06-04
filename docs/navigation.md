# Local Man Navigation and Discovery Controls

This document covers the current search, filter, and section-navigation behavior.

Discovery origin priority is GPS first, then a user-selected discovery area, then the default Wuse discovery area. The default Wuse origin is a curated area-center fallback, not backend `default_city`, not Abuja-wide discovery, and not an all-vendors mode.

## Mobile navigation

### Bottom dock

On mobile, top-level discovery navigation is a fixed bottom dock with:

- `Home`
- `Map`
- `About`

It is local UI state, not route navigation.

### Home search/filter surface

On the mobile Home tab, search and filters are presented above the vendor sections.

- search field filters the same nearby dataset used by the Map tab
- filter button is part of the same mobile row
- filter button opens the current filter sheet/panel without changing routes
- search behavior is unchanged from the underlying discovery query logic

### Map search/filter surface

On the mobile Map tab, the same search/filter state is available in the map view.

- the floating Map search/filter surface uses the same handlers and filter state as Home
- search or filter changes on Map persist when switching back to Home
- the map marker dataset follows the same filtered vendor set
- the map refresh control retries nearby discovery without hard-refreshing the browser page

### About tab

The mobile About tab does not render search, filters, map, or vendor sections. It includes collapsible Using Localman, Why Localman Exists, Install Localman as an App, Terms of Use, and Privacy Policy sections for mobile users. Switching to About must not reset the shared discovery filters.

### Mobile filter behavior

The filter toggle opens the current filter controls:

- radius
- price
- category
- open now
- `Apply filters`
- `Clear all`

The panel is hidden by default and uses the same discovery state as the rest of the page.
On mobile, the open panel behaves as a viewport-bounded sheet with its own close button, contained vertical scrolling, and safe spacing above the fixed bottom dock.
On desktop, the open panel remains in the left discovery column.

Runtime UI details:
- the header shows `Filters`, an active-filter count pill, and `Clear all`
- `Clear all` remains visible but is disabled when no non-default filters are active
- radius and price are side by side on desktop and stacked on mobile
- category is full width
- open-now is a full-width card with checkbox, helper text, and a clock icon
- `Apply filters` submits the draft filter state

Supported radius choices are currently 1 km, 5 km, 10 km, and 30 km.

### Mobile vendor section navbar

The mobile vendor navbar switches between existing sections:

- `Nearby`
- `Recent`
- `Popular`
- `Last selected`

Default:

- `Nearby`

It is a section switcher, not a route change.

Section data rules:

- `Nearby` uses the active discovery origin.
- `Popular` is usage-driven but scoped to the active discovery dataset.
- `Recent` is user-centric retained history.
- `Last selected` is user-centric retained selection memory.
- Switching sections does not change the active discovery origin.

## Web navigation

### Search and filter placement

On web, search and filters sit below the Local Man header in the left content column.

- they do not render inside the map
- they stay aligned with the vendor cards
- the filter toggle reveals the same underlying filter controls used on mobile

### Web vendor section navbar

The desktop vendor navbar sits below the location panel and above vendor content.

It switches between:

- `Nearby`
- `Recent`
- `Popular`
- `Last selected`

Default:

- `Nearby`

`Last selected` is present on web because the page has a real last-selected retention section.

The same section data rules apply on web: Nearby and Popular follow the active discovery origin, while Recent and Last selected remain user-centric.

## Selected vendor and detail navigation

- vendor card body click/tap updates the selected vendor state
- on desktop this also previews the vendor in the right-column map context
- on mobile the selected vendor is visible on the Map tab
- `View details` opens the vendor detail page
- vendor detail exposes `Request Rider` for the Rider Connect handoff flow when users want to coordinate with an independent rider
- vendor detail primary actions remain `Call`, `Directions`, and `Request Rider`; sharing is a separate secondary section
- vendor detail includes a standalone `Share this vendor with a friend` section for native share and copy-link actions using the canonical vendor URL
- `Back to map` returns to discovery
- discovery search, filters, selected vendor, and scroll position are restored through query state plus a short-lived session snapshot
- restored nearby vendor data is reused only when the snapshot is still fresh enough to trust
- restored nearby vendor data still yields to one live nearby fetch before it becomes authoritative again
- admin vendor create, update, deactivate, hours, image, and featured-dish mutations invalidate restored discovery vendor data
- vendor-image uploads also invalidate restored discovery data because public vendor detail may now prefer the new storage-backed image
- mobile Popular and Last selected retention actions use `Open` for direct detail navigation, while desktop can keep map-preview actions where the map is visible beside the list

Rider Connect is detail-page UI, not discovery navigation. It must not change Home/Map/About tab state, map selection, or discovery restoration.

## Search and filter rules

Supported public discovery filters are:

- search query
- radius
- open now
- price band
- category

There is no separate user-facing sort dropdown at the moment. Ordering is automatic and based on discovery logic.
Search and filter state is shared across mobile Home and Map; do not introduce separate mobile tab-specific filter stores.
Search operates only against the active discovery dataset:

- GPS mode searches the GPS nearby dataset.
- selected-area mode searches the selected area dataset.
- default-Wuse mode searches the Wuse dataset.

Search must not fall back to the entire vendor database. Radius choices are 1 km, 5 km, 10 km, and 30 km and apply under GPS, selected-area, and default-Wuse origins.
