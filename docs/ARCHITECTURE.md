# Localman Architecture

This document describes the current production architecture after marketplace reset, production onboarding, import hardening, and the Batch 1-3 vendor imports.

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

Recent and Last Viewed are user-centric retention surfaces and are not area-centric.

## Search

Search runs against the active discovery dataset:

- GPS mode searches vendors near the GPS origin.
- Selected-area mode searches vendors near the selected area center.
- Default-Wuse mode searches vendors near Wuse.

Search does not query the entire vendor database from the public app.

Search also does not run against only the currently loaded card page. It filters the complete radius-matched dataset, then map vendors and card vendors are split from that result.

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

Marketplace data is operational data. Production vendor onboarding uses the documented workflow:

1. Raw workbook
2. Transformation
3. Validation
4. Audit
5. Manual review
6. Import
7. Post-import validation

Batch imports are recorded in `docs/PRODUCTION_IMPORT_HISTORY.md`. Reset and release procedures are documented in `docs/MARKETPLACE_RESET.md`, `docs/OPERATIONS.md`, and `docs/MASTER_RELEASE_GATE.md`.
