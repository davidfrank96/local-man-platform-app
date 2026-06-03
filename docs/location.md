# Location UX and Reminder Behavior

This document covers the current location-related UX on discovery.

## Why location matters

Nearby vendor accuracy depends on the resolved location source.

The app prefers:

1. precise browser/device location
2. approximate location when usable and clearly labeled
3. a selected discovery area when precise or approximate location is unavailable
4. no discovery origin until the user retries location or chooses an area

The backend nearby API still supports an Abuja default-city fallback for direct API callers and operator smoke checks. The public discovery UI must not silently load that fallback when no usable browser location or selected area exists.

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
- show Browse By Area when no usable location is available
- show the selected discovery area when area fallback is active

Retry behavior:

- uses the existing frontend location refresh path
- clears stale denied or unavailable state once location resolves again
- overrides a selected area when precise location succeeds
- does not create a new permission system

## Copy rules

Location copy stays trust-first:

- do not imply exact nearby accuracy from approximate or fallback location
- do not present the backend Abuja fallback as the user’s exact location
- do not show default-city vendors in the public frontend when the user has not provided location or selected an area
- when precise location is active, the UI may show stronger confidence copy

## Source ownership

Implemented location flow relies on:

- [hooks/use-user-location.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/hooks/use-user-location.ts)
- [lib/location/acquisition.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/location/acquisition.ts)
- [lib/location/display.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/location/display.ts)
- [app/api/location/reverse/route.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/app/api/location/reverse/route.ts)
