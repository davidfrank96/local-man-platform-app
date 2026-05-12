# Maps Feature

Map rendering, location handling, directions helpers, and map-specific UI belong here.

Current map rules:
- MapLibre is used when `NEXT_PUBLIC_MAP_STYLE_URL` is configured
- the coordinate fallback map remains the non-tile fallback path
- storefront markers use oxblood by default and green for the selected vendor
- list/card selection and marker selection must stay synchronized
- directions remain outbound Google Maps deep links generated from vendor coordinates, not an embedded Google Maps runtime
