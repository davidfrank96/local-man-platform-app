# Local Man Layout Structure

This document describes the current discovery layout and ordering rules.

## Mobile dock structure

Current mobile discovery uses a fixed bottom dock with three tabs:

- `Home`
- `Map`
- `About`

The default active tab is `Home`.

### Home tab order

1. Local Man header block
2. shared mobile search/filter surface
3. location reminder toast when visible
4. location status / retry panel (`Showing nearby vendors` and retry action)
5. mobile vendor section navbar
6. active vendor section content
7. last-selected vendor panel when that section is active

Notes:

- the location reminder toast is conditional and auto-dismisses
- recent, popular, and last-selected sections are accessed through the mobile vendor section navbar rather than always rendering above the fold
- Home does not render the large map, so vendor browsing remains list-first on small screens

### Map tab order

1. shared mobile map search/filter surface
2. map interface
3. map refresh control
4. selected vendor card

Notes:

- the selected vendor card flows naturally below the map
- the page, not the card itself, provides scrolling
- the fixed dock must not cover the selected vendor card actions
- the current mobile Map tab uses a taller map than the Home tab used before the dock restructure

## Mobile section behavior

The mobile vendor section navbar controls which content pane is visible:

- `Nearby`
- `Recent`
- `Popular`
- `Last selected`

Default active section:

- `Nearby`

The section switcher does not change routes and does not reset shared discovery filters.

## Mobile About behavior

The mobile About tab is local UI state, not a route. It shows lightweight product/support guidance and must not render search, filters, map, or vendor results.

## Web layout

Current desktop and laptop layout is a two-column discovery shell.

### Left column

The left content column contains:

1. `Abuja pilot` eyebrow, public title, and short discovery subtitle
2. desktop search/filter bar
3. location reminder toast when visible
4. location status / retry panel
5. desktop vendor section navbar
6. active vendor section content

### Right column

The right column contains:

1. map
2. selected vendor card

The search/filter bar and vendor section navbar are not rendered inside the map.

## Tablet behavior

Tablet keeps a balanced discovery layout:

- map and list remain visible
- mobile-only floating behavior is reset at the tablet breakpoint
- layout avoids one-column mobile ordering leakage into tablet and desktop

## Layout constraints

- no horizontal overflow on mobile
- no overlapping fixed or sticky discovery surfaces
- map stays visible on mobile and web
- selected vendor card does not move above the mobile Map tab map or above the desktop map
- mobile selected vendor card remains in the normal page flow
- mobile and web maintain separate ordering rules through breakpoint-specific CSS

## Regression notes

Recent fixes in this phase restored:

- desktop content-left / map-right layout
- mobile dock ordering
- map visibility after responsive wrapper regressions
- correct positioning of the location and retention panels in the mobile flow
