# Maps Feature

Map rendering, location handling, directions helpers, and map-specific UI belong here.

Current map rules:
- MapLibre is used when `NEXT_PUBLIC_MAP_STYLE_URL` is configured
- the coordinate fallback map remains the non-tile fallback path
- storefront markers use oxblood by default and green for the selected vendor
- list/card selection and marker selection must stay synchronized
- mobile Map tab owns the dedicated mobile map view; Home remains list/search oriented
- mobile Map tab search/filter controls share the same discovery state as Home
- the mobile map refresh control retries nearby discovery/map data without hard-refreshing the page
- mobile selected vendor content flows below the map through natural page scrolling
- directions remain outbound Google Maps deep links generated from vendor coordinates, not an embedded Google Maps runtime
