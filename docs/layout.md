# Local Man Layout Structure

This document describes the current discovery layout and ordering rules.

## Mobile homepage order

Current mobile discovery flow is:

1. Local Man header block
2. floating search/navbar with filter toggle
3. location reminder toast when visible
4. map interface
5. selected vendor card
6. location status / retry panel (`Showing nearby vendors` and retry action)
7. mobile vendor section navbar
8. active vendor section content
9. last selected vendor panel at the bottom

Notes:

- the location reminder toast is conditional and auto-dismisses
- the selected vendor card remains directly below the map
- the location status panel sits below the selected vendor card
- recent and popular sections are accessed through the mobile vendor section navbar rather than always rendering above the fold

## Mobile section behavior

The mobile vendor section navbar controls which content pane is visible:

- `Nearby`
- `Recent`
- `Popular`

Default active section:

- `Nearby`

The `Last selected vendor` panel remains separate and lower in the flow.

## Web layout

Current desktop and laptop layout is a two-column discovery shell.

### Left column

The left content column contains:

1. `Abuja pilot / Local Man` heading
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
- selected vendor card does not move above the header
- mobile and web maintain separate ordering rules through breakpoint-specific CSS

## Regression notes

Recent fixes in this phase restored:

- desktop content-left / map-right layout
- mobile stacked ordering
- map visibility after responsive wrapper regressions
- correct positioning of the location and retention panels in the mobile flow
