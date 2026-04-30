# Local Man UI Overview

This document describes the current public UI as implemented.

## Product model

Local Man is a map-first, vendor-first discovery surface:

- the map is always part of the discovery experience
- vendor cards are compact, text-first, and action-oriented
- vendor selection updates the map preview and selected vendor summary
- mobile and web use the same data and actions, but different layout organization

## Discovery concept

The public homepage combines:

- a search and filter surface
- a nearby-vendors list
- a selected vendor summary
- a map preview
- lightweight retention sections for recent, popular, and last-selected vendors

The interaction model is:

1. resolve location
2. load nearby vendors
3. let the user search or filter
4. let the user preview a vendor from the list or map
5. let the user call, get directions, or open the full vendor detail page

## Mobile vs web

### Mobile

Mobile is stacked and map-first.

- the discovery header stays at the top
- search and filters live in a floating surface
- the map appears before the main vendor list
- the selected vendor summary appears directly below the map
- section switching uses a compact mobile vendor navbar

### Web

Web separates content and map into two columns.

- the left column carries the discovery heading, search/filter controls, location messaging, section navbar, and vendor sections
- the right column carries the map and selected vendor summary
- search and filter controls stay outside the map

## Vendor-first interaction model

The vendor list is the primary interaction surface.

- clicking or tapping a vendor card previews that vendor on the map
- the selected vendor summary updates without leaving discovery
- `Call`, `Directions`, and `View details` are available from both the card system and the selected preview

## Supporting UI systems

- time-based themes: morning, afternoon, night
- trust-first location copy
- lightweight location reminder toast
- global toast notifications for success, error, and info messages
- global client error boundary with safe fallback copy
- browser-local retention helpers:
  - recently viewed vendors
  - popular vendors near you
  - last selected vendor

## Workspace UI surfaces

The admin workspace now has two user-facing shells:

- admin dashboard:
  - analytics
  - team management
  - vendor registry and edit/create workflows
- agent dashboard:
  - vendor list
  - vendor edit workspace
  - CSV vendor intake

Restricted workspace areas are hidden before render based on resolved session role. Server-side route and API checks remain the source of truth.

## Source of truth

This overview is backed by the current public discovery implementation in:

- [components/public/public-discovery.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/public/public-discovery.tsx)
- [components/public/vendor-card.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/public/vendor-card.tsx)
- [components/public/vendor-filters.tsx](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/components/public/vendor-filters.tsx)
- [app/globals.css](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/globals.css)
