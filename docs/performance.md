# Local Man UI Performance and Stability Rules

This document records the current lightweight UI constraints and stability decisions.

## Core performance constraints

- no images on vendor cards
- no heavy remote media on discovery surfaces
- minimal animation
- lightweight inline SVG for small identity or metadata icons
- keep discovery usable on weak mobile networks

## Discovery-specific constraints

- map remains visible without oversized decorative UI
- selected vendor preview stays compact so the map keeps usable space
- filter surfaces are collapsible on mobile and web
- section navbars switch existing content instead of fetching new data per tab

## Layout-shift prevention

Current stability rules include:

- no repeated vendor reselection updates when the same vendor is tapped again
- no vendor-list refetch on simple selected-vendor changes
- no flicker of the nearby-results helper row during vendor selection
- no scroll-anchor jumps from dynamic upper panels such as the selected vendor panel or last-selected panel

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

- explicit breakpoint-specific ordering for:
  - header
  - floating filters
  - map
  - selected vendor
  - location panel
  - vendor sections
  - retention panels

## Theme and visual identity constraints

- morning, afternoon, and night themes must remain readable
- food identity styling should be lightweight and not compete with core content
- decorative marks must not cause layout shift or increase bundle weight materially
