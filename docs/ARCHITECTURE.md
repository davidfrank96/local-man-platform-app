# Localman Architecture

This document describes the current production architecture before marketplace reset and production onboarding.

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

Recent and Last Viewed are user-centric retention surfaces and are not area-centric.

## Search

Search runs against the active discovery dataset:

- GPS mode searches vendors near the GPS origin.
- Selected-area mode searches vendors near the selected area center.
- Default-Wuse mode searches vendors near Wuse.

Search does not query the entire vendor database from the public app.

## Ranking

Default, GPS, selected-area, and search result ordering use:

1. Open vendors
2. Distance
3. Supporting ranking factors such as popularity or search relevance

The Popular tab intentionally differs:

1. Popularity
2. Distance

## Map

MapLibre renders the map when `NEXT_PUBLIC_MAP_STYLE_URL` is configured. The map follows the active discovery origin and uses the same vendor dataset as the list. Marker selection and selected-vendor cards are synchronized by vendor identity.

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

Do not treat seeded or QA marketplace data as production data. Production onboarding should use the marketplace reset process, then import vetted vendor and rider data.
