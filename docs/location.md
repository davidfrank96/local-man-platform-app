# Location UX and Reminder Behavior

This document covers the current location-related UX on discovery.

## Why location matters

Nearby vendor accuracy depends on the resolved location source.

The app prefers:

1. precise browser/device location
2. approximate location when usable and clearly labeled
3. a selected discovery area when precise or approximate location is unavailable
4. the default discovery area, Wuse, when location is unavailable and no area is selected

The backend nearby API still supports an Abuja default-city fallback for direct API callers and operator smoke checks. The public discovery UI must not silently load that fallback when browser location is unavailable. Its default browsing fallback is the curated Wuse discovery area, not Abuja-wide discovery or the entire vendor database.

Supported curated discovery areas are:

- Wuse
- Gwarinpa
- Jabi
- Utako
- Maitama
- Asokoro
- Garki
- Kubwa
- Lugbe

Area selection updates the active discovery origin, nearby dataset, map origin, Popular dataset, search dataset, and radius filtering. Search and radius never broaden to the entire vendor database.

Area restoration is intentionally short-lived:

- vendor list to vendor profile to back restores the selected area
- plain page reload returns to GPS when available or default Wuse when GPS is unavailable
- selected area is not persisted across browser restarts or future sessions

## Area Governance

Localman also maintains a broader governed Abuja area list for data quality in admin and CSV vendor intake. That governance layer normalizes known area names case-insensitively, so entries such as `wuse`, `WUSE`, and ` Wuse ` resolve to `Wuse`.

Manual vendor creation uses the governed area list as a controlled selector. Agents choose a high-level area such as `Wuse`, while the street, zone, landmark, or estate detail belongs in the vendor address field.

CSV vendor intake uses normalize-plus-warning behavior:

- known areas are stored in canonical form
- unknown areas are shown as preview warnings
- unknown areas do not block import
- existing vendor rows are not rewritten by the governance layer

## Location reminder popup

The homepage includes a lightweight, non-blocking location reminder toast.

Behavior:

- appears on discovery load
- auto-dismisses after about 5 seconds
- can be dismissed immediately with a close button
- does not request permission directly
- does not block use of search, filters, map, or cards

Message intent:

- encourage users to turn on location for more accurate nearby results

Placement:

- mobile: between the floating search/filter surface and the map when visible
- web: in the left content column below the desktop search/filter bar

## Location status and retry UI

The discovery page also includes a persistent location status panel.

Current responsibilities:

- show the current location headline
- show supporting trust/detail text
- show a retry action
- show the default Wuse discovery area when no usable location or selected area is available
- show the selected discovery area when user area fallback is active
- show Change so users can switch from Wuse to another curated discovery area

Retry behavior:

- uses the existing frontend location refresh path
- clears stale denied or unavailable state once location resolves again
- overrides a selected area when precise location succeeds
- does not create a new permission system

## Copy rules

Location copy stays trust-first:

- do not imply exact nearby accuracy from approximate or fallback location
- do not present the backend Abuja fallback as the user’s exact location
- do not show default-city vendors in the public frontend when the user has not provided location or selected an area; use default Wuse instead
- when precise location is active, the UI may show stronger confidence copy

## Source ownership

Implemented location flow relies on:

- [hooks/use-user-location.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/hooks/use-user-location.ts)
- [lib/location/acquisition.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/location/acquisition.ts)
- [lib/location/display.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/location/display.ts)
- [app/api/location/reverse/route.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/api/location/reverse/route.ts)
