# Vendor Cards and Selected Vendor Rules

This document describes the current discovery card system.

## Discovery vendor card rules

Vendor cards on discovery and list surfaces are intentionally image-free.

Rules:

- no vendor images or thumbnails
- no vendor image payload dependency from nearby list rendering
- compact layout
- text-first scanning
- lightweight metadata icons only

## Required discovery-card content

Each discovery card currently supports:

- vendor name
- featured dish or short description cue
- distance
- styled open/closed status badge
- `Active hours`
- price band
- area
- rating or `New`
- `Call`
- `Directions`
- `View details`

## Current label and icon rules

- `Today` has been replaced by `Active hours` on discovery cards
- only one visible open/closed status indicator should communicate state cleanly
- the styled pill/badge remains the primary state indicator
- the plain duplicate `Open` text near distance is suppressed in the cleaned card presentation
- `New` does not use a star icon
- numeric ratings keep their star icon

## Visual hierarchy

Current hierarchy emphasizes fast scanning:

- vendor name remains prominent
- featured dish or cue line stays highly visible
- metadata is grouped into compact lines
- action row stays easy to reach on both mobile and web

## Discovery card actions

Card actions are:

- `Call`
- `Directions`
- `View details`

Action rules:

- `Call` is primary
- `Directions` is secondary
- `View details` uses a lighter green treatment where implemented
- clicking/tapping the card body previews the vendor on the map
- action clicks must not be intercepted by the map-preview click target

## Selected vendor card

The selected vendor card is separate from the discovery list cards.

### Placement

- mobile: directly below the map
- web: in the right column under the map

### Current content

- selected vendor name
- distance chip
- open/closed chip
- `Today` hours
- area when available
- `Call`
- `Directions`
- `View details`

### Layout behavior

- compact by design
- does not take over the page
- must not force the map off screen on web
- must update smoothly when the selection changes

## Retention panels

Related but separate discovery surfaces:

- Recently viewed vendors
- Popular vendors near you
- Last selected vendor

These are not selected vendor cards. They are retention/supporting surfaces and should not be documented as the primary preview panel.

## Vendor detail image rule

- vendor profile images remain detail-page only
- detail-page images should request responsive transformed widths when the source is a Supabase Storage object
- detail-page images should lazy load and decode asynchronously without changing the visible layout box
