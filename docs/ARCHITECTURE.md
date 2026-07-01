# Localman Architecture

This document describes the current production architecture after marketplace reset, production onboarding, import hardening, Batch 1-4 vendor imports, discovery scaling, map clustering, admin count corrections, and admin edit-state lockdown.

## System Overview

Localman has two primary surfaces:

- Public marketplace app for vendor discovery, vendor detail, ratings, sharing, PWA use, and Rider Connect handoff.
- Admin app for vendor onboarding, rider management, analytics, audit logs, CSV intake, and marketplace operations.

The application is a Next.js App Router project backed by Supabase Postgres, Supabase Auth, Supabase Storage, and MapLibre GL JS.

## Public Discovery

Discovery origin priority is:

1. GPS location
2. User-selected discovery area
3. Default Wuse discovery area

All public discovery modes use coordinates and radius. Vendor `area` labels do not control whether a vendor is returned.

The active discovery origin feeds:

- nearby API requests
- map center
- radius filtering
- search scope
- Popular tab scope

Discovery result ownership is split after the complete matching dataset is built:

```text
Radius
↓
All Matching Vendors
↓
Map = All
Cards = Paginated
```

Radius determines the complete matching dataset. Search and ranking run against that complete dataset before pagination. The map receives all matching vendors so clustering and marker visibility are not affected by card-page size. The card list receives a paginated subset for browsing.

The nearby response is split by ownership:

- `map_vendors`: all vendors matching the active radius/search/filter dataset
- `vendors`: the current card page
- `pagination`: card-list pagination metadata

Default card page size is 25. The maximum accepted card page size is 50.

Recent and Last Viewed are user-centric retention surfaces and are not area-centric.

## Search

Search runs against the active discovery dataset:

- GPS mode searches vendors near the GPS origin.
- Selected-area mode searches vendors near the selected area center.
- Default-Wuse mode searches vendors near Wuse.

Search does not query the entire vendor database from the public app.

Search also does not run against only the currently loaded card page. It filters the complete radius-matched dataset, then map vendors and card vendors are split from that result.

Search covers the approved searchable vendor fields, including vendor name, descriptions, category assignments, and featured dishes. Multi-category vendors remain searchable and filterable under every valid `vendor_category_map` assignment.

## Ranking

Default, GPS, and selected-area ordering use:

1. Open vendors
2. Distance
3. Popularity
4. Stable tie-breakers

Search result ordering uses:

1. Open vendors
2. Distance
3. Search relevance
4. Popularity
5. Stable tie-breakers

The Popular tab intentionally differs:

1. Popularity
2. Distance

## Map

MapLibre renders the map when `NEXT_PUBLIC_MAP_STYLE_URL` is configured. The map follows the active discovery origin and receives all matching vendors from the active discovery dataset. Card pagination must not remove vendors from the map or clustering source. Marker selection, selected-vendor cards, and camera movement are synchronized by vendor identity.

The production map uses native MapLibre clustering for vendor density:

- cluster bubbles display vendor counts only
- unclustered vendor markers use the Localman storefront marker visual
- selected vendor overlay is independent of clustered source state
- card click always wins: card selection sets the selected vendor, moves the camera, expands the cluster if needed, and keeps the selected marker visible
- cluster taps expand the cluster and do not select a vendor
- duplicate-coordinate vendor groups use the same-location selector instead of hiding choices behind one marker
- mobile selected-vendor camera movement uses an upward offset so the marker is not covered by the bottom card/sheet

Map coordinate handling is explicit:

- stored vendor coordinates are latitude and longitude fields
- MapLibre camera and marker APIs receive `[longitude, latitude]`
- invalid or missing coordinates are ignored for map rendering
- selected vendor camera movement wins over generic bounds fitting after a card or marker selection
- fallback marker rendering keeps dense and selected markers tappable

If the map style is unavailable, the app falls back to a calm coordinate-based map state without changing discovery behavior.

## Rider Connect

Rider Connect is a handoff system, not dispatch.

- Suggestions are capped at 3 riders.
- Suggestions include only verified, visible, currently available riders.
- Public suggestion cards do not expose phone, WhatsApp values, internal notes, full names, or full plates.
- The selected rider can expose first name and masked plate before WhatsApp handoff.
- WhatsApp handoff is created only after the contact intent is accepted and stored.
- Localman does not collect delivery payment, assign riders, guarantee delivery, or send WhatsApp messages.

## Ratings

Ratings are lightweight:

- 1-5 star rating
- optional predefined signals
- no public free-text reviews
- one rating per vendor per anonymous browser identity

Public badge outputs are thresholded and positive-only. Raw rating signals and anonymous client hashes are not public data.

## Admin

Admin access uses Supabase Auth plus `admin_users` membership. Authenticated users without an admin membership row are denied workspace access.

Admin capabilities include:

- vendor creation and editing
- governed area selection for manual vendor creation
- CSV vendor intake
- vendor hours, dishes, and media management
- rider management and rider application review
- admin analytics
- operational logs
- audit logs
- team management
- marketplace reset dry-run and execute tooling

Admin dashboard totals are database totals, not loaded-page counts. Vendor registry pagination remains in place and can display "showing N of total" without fetching every vendor.

The admin edit workspace is keyed by selected vendor id so switching vendors remounts the form and clears uncontrolled/default input state. Image upload and save paths must use the current selected vendor id at the time of action.

## PWA

The PWA layer is intentionally conservative:

- service worker caches static shell assets only
- dynamic marketplace, rider, rating, search, and admin APIs are network-owned
- offline fallback avoids stale marketplace data
- stale chunk recovery avoids reload loops
- runtime markers support stale-shell diagnosis

## Storage

Vendor image metadata lives in `vendor_images`. Supabase Storage objects live in the `vendor-images` bucket. Deleting database rows does not automatically remove storage objects, so marketplace reset builds and deletes a storage object list explicitly.

## Operational Boundaries

Marketplace data is operational data. Production vendor onboarding uses the documented workflow v1.0:

1. Source validation
2. Data normalization
3. Governance review
4. Coordinate validation
5. Duplicate coordinate audit
6. Description review
7. Import package
8. Release gate
9. Import
10. Post-import validation
11. Post-import quality audit
12. Quality score and import history update
13. Production baseline and override register update

No production import may skip a phase. Batch imports are recorded in `docs/PRODUCTION_IMPORT_HISTORY.md`. Reset and release procedures are documented in `docs/MARKETPLACE_RESET.md`, `docs/OPERATIONS.md`, and `docs/MASTER_RELEASE_GATE.md`.

Coordinates are production trust data. Duplicate coordinate audits are mandatory for every batch. Candidate coordinate corrections are prepared as human-review packages first; production coordinates are never automatically changed by import, geocoding, or discovery code.

## Production Data Baseline

Production Data v1.0 is governed as an operational baseline:

- production is the operational source of truth after approved hardening
- original onboarding workbooks remain historical source documents
- approved production overrides are recorded in `docs/PRODUCTION_CHANGELOG.md`
- integrity certification compares production against either the original workbook value or an approved production override
- unexpected differences remain blockers until corrected or approved

Future Codex and operator work must not treat every production/workbook difference as an automatic error. The required classification is `SOURCE_MATCH`, `APPROVED_PRODUCTION_OVERRIDE`, or `UNEXPECTED_CHANGE`.
