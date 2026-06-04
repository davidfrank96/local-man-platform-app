# Local Man UI Overview

This document describes the current public UI as implemented.

## Product model

Local Man is a discovery-first, vendor-first surface:

- the map remains part of discovery, but mobile gives it a dedicated tab
- vendor cards are compact, text-first, and action-oriented
- vendor selection updates the map preview and selected vendor summary
- vendor detail pages can open a liability-safe Rider Connect handoff flow
- mobile and web use the same data and actions, but different layout organization

## Discovery concept

The public homepage combines:

- a search and filter surface
- a nearby-vendors list
- a selected vendor summary
- a map preview
- lightweight retention sections for recent, popular, and last-selected vendors
- a mobile-only bottom dock with Home, Map, and About tabs

Discovery origin priority is:

1. GPS or precise browser/device location
2. user-selected discovery area
3. default discovery area, Wuse

Default Wuse is a curated area-center fallback built on the same area-discovery system as Browse By Area. It is not the backend Abuja `default_city` fallback, not all-vendors mode, and not an Abuja-wide browse mode.

## Filter surface

Current discovery filters preserve the same query behavior while using a cleaner panel UI:

- search remains visible in the shared Home, Map, and desktop discovery controls
- the filter toggle opens radius, price, category, open-now, and apply controls
- the panel header shows `Filters`, an active-count pill such as `1 active`, and a `Clear all` action
- `Clear all` is visible but disabled when no non-default filters are active
- radius choices are 1 km, 5 km, 10 km, and 30 km
- price choices are `Any`, `Budget`, `Standard`, and `Premium`
- category is full width and is disabled only when no categories are loaded
- open-now is a tap-friendly card with checkbox, title, helper copy, and a clock icon
- `Apply filters` is the primary CTA and submits the current draft filter controls
- mobile opens the same panel as a viewport-bounded sheet with a close button and contained scrolling
- desktop uses the same component with radius and price side by side, category full width, then open-now full width

The interaction model is:

1. resolve GPS, selected area, or default Wuse as the active discovery origin
2. load nearby vendors
3. let the user search or filter
4. let the user select a vendor from the list or map
5. let the user call, get directions, or open the full vendor detail page
6. on detail pages, let the user request an independent rider handoff without adding payments or dispatch

## Mobile vs web

### Mobile

Mobile is tabbed through a fixed bottom dock.

- Home shows the discovery header, shared search/filter controls, location messaging, vendor section navigation, and vendor cards
- Map shows a dedicated map view with shared search/filter controls, map refresh, and the selected vendor summary below the map
- About shows lightweight product/support guidance plus collapsible Using Localman, Why Localman Exists, Install Localman as an App, Terms of Use, and Privacy Policy sections without search, filters, or map
- Home and Map share the same search, radius, category, price, open-now, and selected-vendor state
- the selected vendor summary on Map uses normal page scrolling

### Web

Web separates content and map into two columns.

- the left column carries the discovery heading, search/filter controls, location messaging, section navbar, and vendor sections
- the right column carries the map and selected vendor summary
- search and filter controls stay outside the map

## Vendor-first interaction model

The vendor list is the primary interaction surface.

- clicking or tapping a vendor card updates the selected vendor state
- the selected vendor summary updates without leaving discovery
- `Call`, `Directions`, and `View details` are available from both the card system and the selected preview

Default nearby ordering is:
- open vendors before closed vendors
- distance ascending inside the same open/closed group
- usage-signal popularity only as a close-distance tie-breaker
- stable name/id ordering last

## Supporting UI systems

- time-based themes: morning, afternoon, night
- trust-first location copy
- lightweight location reminder toast
- curated area discovery for Wuse, Gwarinpa, Jabi, Utako, Maitama, Asokoro, Garki, Kubwa, and Lugbe
- selected-area restoration through vendor-detail back navigation only; it does not persist through page reloads or future sessions
- GPS always overrides restored, selected, and default areas
- search and radius filters operate against the active discovery dataset, not the entire vendor database
- Popular is scoped to the active discovery dataset; Recent and Last selected are user-centric retention surfaces
- Updates Center entry points through the mobile bell and desktop header bell
- global toast notifications for success, error, and info messages
- global client error boundary with safe fallback copy
- browser-local retention helpers:
  - recently viewed vendors
  - popular vendors near you
  - last selected vendor
- cache hygiene:
  - discovery snapshots carry a cache version, browser-origin environment, and nearby request key
  - malformed cached vendor records and known mock/test vendor ids or slugs are rejected before hydration
  - restored discovery snapshots yield to a live nearby fetch before becoming authoritative again

## Workspace UI surfaces

The admin workspace now has two user-facing shells:

- admin dashboard:
  - dashboard overview
  - analytics
  - activity
  - logs
  - team management
  - rider management
  - vendor registry and edit/create workflows
- agent dashboard:
  - full Create Vendor page
  - vendor list
  - vendor edit workspace
  - CSV vendor intake

Current admin navigation order:

- `Dashboard`
- `Analytics`
- `Manage vendors`
- `Create vendor`
- `Riders`
- `Team access`
- `Activity`
- `Logs`

High-volume admin lists stay contained inside internal scroll panels:

- analytics recent-events and ranking tables
- activity feed
- vendor registry
- logs feed with compact expandable rows

Restricted workspace areas are hidden before render based on resolved session role. Server-side route and API checks remain the source of truth.
Those client-side checks are presentation-only:
- they reduce clutter
- they improve redirects and denied-state copy
- they must never be treated as the authorization boundary

Vendor image upload state is also workspace UI state:
- pending file, filename, local preview URL, and upload status are scoped to the selected vendor edit session
- switching vendors must clear pending image state before another upload starts
- upload success is shown only after the storage-backed `vendor_images` row is returned and merged for the current vendor

Rider Connect UI state is intentionally lightweight:
- public suggestions show at most 3 verified, visible, currently available independent riders with public-safe profile fields only
- operating area is displayed as rider context only and is not an eligibility filter
- incomplete contact or delivery details show actionable validation copy before the suggestion list appears
- phone helper copy shows accepted Nigerian examples: `08012345678`, `+2348012345678`, and `2348012345678`
- manual-address mode requires a delivery address; current-location mode requires a delivery area
- after rider selection, the verification sheet shows first name, vehicle, area, listed availability, and a masked plate when available before `Continue to WhatsApp`
- rider phone and WhatsApp values stay server-side until the selected-rider handoff is created
- the user sends the WhatsApp message directly
- modal focus is trapped while open, `Escape` closes the flow, and focus returns to the trigger after close
- admin rider management controls profile review and visibility only, not delivery assignment or payment

## Source of truth

This overview is backed by the current public discovery implementation in:

- [components/public/public-discovery.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/public/public-discovery.tsx)
- [components/public/vendor-card.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/public/vendor-card.tsx)
- [components/public/vendor-filters.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/public/vendor-filters.tsx)
- [app/globals.css](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/globals.css)
