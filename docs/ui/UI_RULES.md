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
- Retry location must clear stale denied/unavailable copy and update the UI to the current resolved source after success.
- Use `hooks/use-user-location.ts` as the frontend location acquisition interface.

## Vendor Card Required Fields
- name
- distance
- open/closed state
- one featured dish summary when available
- today’s hours only, shown as a compact `Today:` line
- short description only when no featured dish summary is available
- compact price label: `Budget-friendly`, `Everyday price`, or `Higher price`
- area
- compact rating: `★ 4.2` when ratings exist, otherwise `New`
- call button
- directions button
- helper text: `Tap to preview on map`
- visible detail link text: `View details →`
- tapping the card body should preview the vendor on the map without interfering with call, directions, or details

## Vendor Detail Rules
- strong hero image
- visible primary actions near top
- at-a-glance summary for open state, area, phone, price, rating, and featured dish count
- weekly hours clearly structured
- public hours should display in 12-hour AM/PM format
- featured dishes visually separated
- address and location visible
- missing vendor data should use explicit fallback copy instead of vague placeholders
- If a vendor has no image, show a plain missing-image state instead of stock imagery.

## Admin UI Rules
- forms must be explicit and simple
- location entry must be easy to validate
- image upload state must be clear
- vendor image upload should use a file input with a visible size/type hint, and removal should show the current uploaded images when available
- hours editor must be easy to understand
- destructive actions must be confirmed
- Admin access should use a simple Supabase email/password login flow and session validation instead of manual token paste.
- admin screens must stay functional and restrained until runtime data operations are validated.
- Vendor creation and editing should auto-generate a valid slug from the vendor name, but still allow manual edits if the slug remains lowercase and hyphen-separated.
- Admin vendor forms should make required fields obvious, show inline validation messages where possible, and give simple guidance for phone numbers and coordinates.

## Style Guidance
- clean modern look
- no noisy gradients everywhere
- avoid startup fluff
- practical spacing
- clear typography
- strong contrast
- Public discovery should use a subtle client-local time theme: morning, afternoon, or night.
- Time-based theme changes should mainly affect the page background, accent tone, map panel, and small highlights.
- Time-based theming must not reduce readability or make vendor cards visually heavy.
- Time-based themes must never compromise vendor card readability, including selected cards.
- Vendor cards should stay light and high-contrast in morning, afternoon, and night themes, even when the page background gets darker.
- Selected vendor cards should use a clearer active treatment through border, elevation, or subtle tint, but must keep `Today:`, distance, open/closed state, featured dish, price, area, rating, and actions easy to read.
- Morning background tones should stay soft and calm with cream, gentle green, and light mint accents.
- Afternoon background tones should stay warm and sunny with cream, amber, and gentle orange accents.
- Night background tones should feel like evening discovery with deeper blue/slate washes and readable light cards, not harsh black surfaces.
