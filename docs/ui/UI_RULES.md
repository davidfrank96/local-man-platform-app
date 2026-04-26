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
- Discovery ordering should be understandable without exposing raw ranking math.
- Open vendors should be easier to find than closed vendors.
- The UI may highlight a small set of popular nearby vendors when real usage signals support it.
- Do not overload the home screen with too many actions.
- Runtime errors must be visible when Supabase data is unavailable.
- Public UI must not render fake vendor data.

## Location UX Rules
- Request browser/device location as the primary method for precise nearby results.
- If the user allows location access, use precise coordinates and show nearby vendors normally.
- When precise browser location is active, show a compact trust label such as `High accuracy`.
- When reverse location lookup succeeds, show a human-readable area or city label first.
- If reverse lookup does not resolve a useful label, fall back to rounded coordinates instead of inventing a place name.
- If the user denies location access, use IP-based approximate coordinates internally when available, but only show approximate location in the UI when a usable human-readable label exists.
- Approximate location copy must never imply exact nearby accuracy; tell the user to turn on location for exact nearby results.
- If precise and approximate location are unavailable, keep vendor discovery usable internally with the Abuja default city view, but do not present that default city as the user’s exact location.
- Do not block the public app when location permission is denied.
- Do not imply exact distance when the location source is approximate or default city.
- Provide a clear path to retry location permission or change location later.
- Tell mobile users that precise location can take a few seconds before fallback.
- Retry location must clear stale denied/unavailable copy and update the UI to the current resolved source after success.
- Denied, unavailable, and default-city fallback states should use calm trust-first copy such as `Showing nearby vendors` and `Turn on location for more accurate nearby vendors.`
- Do not show raw fallback chains like `Approximate location unavailable` or `Showing Abuja` as if that were the user’s location.
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
- optional lightweight popularity badge when a vendor is among the top ranked nearby results
- call button
- directions button
- helper text: `Tap to preview on map`
- visible detail link text: `View details →`
- tapping the card body should preview the vendor on the map without interfering with call, directions, or details
- `Today:`, distance, and open/closed state must remain visible before and after the card is selected.
- selected cards must stay readable in every time theme and use a clear but compact highlight treatment
- browser back and `Back to map` must restore discovery state without leaving the search and filter controls blocked or requiring a manual reload

## Vendor Detail Rules
- strong hero image
- visible primary actions near top
- at-a-glance summary for open state, area, phone, price, rating, and featured dish count
- lightweight star rating input may appear here, but it must stay compact and comment-free
- weekly hours clearly structured
- public hours should display in 12-hour AM/PM format
- featured dishes visually separated
- address and location visible
- missing vendor data should use explicit fallback copy instead of vague placeholders
- If a vendor has no image, show a plain missing-image state instead of stock imagery.

## Discovery Clarity Rules
- Search relevance should feel predictable: stronger name matches should rise above weaker descriptive matches.
- When filters are active, the current filter state should be obvious and easy to clear.
- Discovery ordering helper copy may explain the current emphasis, such as open now, search relevance, popularity, or distance.
- Retention helpers such as recently viewed vendors or last selected vendor memory should remain compact and supportive rather than taking over the page.
- Client-only retention must use local browser storage and must never block public browsing.

## Admin UI Rules
- admin workspace should be split cleanly across:
  - `/admin` for overview
  - `/admin/analytics` for usage signals
  - `/admin/vendors` for registry management
  - `/admin/vendors/new` for creation
  - `/admin/vendors/[id]` for focused editing
- admin screens should use clear hierarchy, restrained cards, and obvious section boundaries instead of one long mixed form
- the dashboard view should surface overview counts and quick actions for incomplete vendors
- the analytics view should stay read-only and show:
  - summary cards
  - vendor performance tables
  - drop-off panels
  - recent activity
  - clear empty states when usage data is not available yet
- the vendor registry should support search and filtering, then move into a dedicated edit workspace
- the create vendor page should be a full onboarding page with clearly separated sections for:
  - basic details
  - opening hours
  - featured dishes
  - vendor images
  - review and create
- forms must be explicit and simple
- location entry must be easy to validate
- image upload state must be clear
- vendor profile images and featured dishes must be presented as separate admin sections with separate helper text
- vendor image upload should use a file input with a visible size/type hint, immediate local preview before upload, and removal should show the current uploaded images when available
- `No images yet` should appear only when the selected vendor has no current vendor profile images
- hours editor must be easy to understand
- admin vendor edit workflows must load current hours, current uploaded images, and current featured dishes before editing so updates do not start from a blank state
- current featured dishes should have a clear remove action in the same selected-vendor edit surface
- destructive actions must be confirmed
- Admin access should use a simple Supabase email/password login flow and session validation instead of manual token paste.
- admin screens must stay functional and restrained until runtime data operations are validated.
- Vendor creation should auto-generate a valid slug from the vendor name.
- Vendor editing should keep the existing slug stable by default, because the slug controls the public URL.
- Admins may still edit the slug manually if it remains lowercase and hyphen-separated.
- Base vendor creation may proceed without hours, featured dishes, or images only after the admin explicitly acknowledges each missing data group.
- the create vendor page should allow hours, featured dishes, and an image to be added during onboarding instead of forcing all of them into later edit-only work
- The edit workspace should keep basic details, hours, featured dishes, and vendor images as clearly separated sections within the same selected-vendor view.
- Hours entry should use simple 12-hour text input such as `9 AM` or `8:30 PM`, converted to 24-hour storage before submission.
- Optional featured dish image URLs should be labeled clearly as dish-specific and not currently displayed on the public vendor profile.
- Admin vendor forms should make required fields obvious, show inline validation messages where possible, and give simple guidance for phone numbers and coordinates.
- successful admin write actions should show concise confirmation such as vendor updated, hours updated, or image uploaded.
- failed admin write actions should show a readable message with the API error code when available and must not fail silently.
- when create flow succeeds only partially, the status copy must identify the failed step, such as hours, dishes, or image upload.
- analytics must never expose raw tracking failures in the public app
- analytics filters should stay lightweight: last 24 hours, 7 days, 30 days, and all time

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
- Selected vendor preview panels should stay compact and action-oriented, with `View details`, `Call`, and `Directions` visible on mobile.
- Morning background tones should stay soft and calm with cream, gentle green, and light mint accents.
- Afternoon background tones should stay warm and sunny with cream, amber, and gentle orange accents.
- Night background tones should feel like evening discovery with deeper blue/slate washes and readable light cards, not harsh black surfaces.
