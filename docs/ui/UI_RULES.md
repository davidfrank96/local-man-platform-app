## Title
The Local Man — UI Rules

## Design Principles
1. Map-first discovery.
2. Mobile-first layout.
3. Clear actions.
4. Minimal clutter.
5. Food visibility matters.
6. Fast scanning is more important than heavy detail.

## Public UI Rules
- Homepage must open into a map-first layout.
- Vendor cards must be readable in one quick glance.
- Use strong visual separation between vendors.
- Show open/closed state clearly.
- Show distance clearly.
- Call and directions buttons must be obvious.
- Search and filters must not overwhelm the screen.
- Do not overload the home screen with too many actions.
- Runtime errors must be visible when Supabase data is unavailable.
- Public UI must not render fake vendor data.

## Location UX Rules
- Request browser/device location as the primary method for precise nearby results.
- If the user allows location access, use precise coordinates and show nearby vendors normally.
- If the user denies location access, use IP-based approximate coordinates when available and communicate that results are approximate.
- If precise and approximate location are unavailable, show the Abuja default city view.
- Do not block the public app when location permission is denied.
- Do not imply exact distance when the location source is approximate or default city.
- Provide a clear path to retry location permission or change location later.
- Tell mobile users that precise location can take a few seconds before fallback.
- Use `hooks/use-user-location.ts` as the frontend location acquisition interface.

## Vendor Card Required Fields
- name
- distance
- open/closed state
- short description or dish cue
- rating
- call button
- directions button

## Vendor Detail Rules
- strong hero image
- visible primary actions near top
- weekly hours clearly structured
- featured dishes visually separated
- address and location visible
- If a vendor has no image, show a plain missing-image state instead of stock imagery.

## Admin UI Rules
- forms must be explicit and simple
- location entry must be easy to validate
- image upload state must be clear
- hours editor must be easy to understand
- destructive actions must be confirmed
- Phase 2B admin UI may use a pasted Supabase access token until a fuller admin auth flow is implemented.
- admin screens must stay functional and restrained until runtime data operations are validated.

## Style Guidance
- clean modern look
- no noisy gradients everywhere
- avoid startup fluff
- practical spacing
- clear typography
- strong contrast
