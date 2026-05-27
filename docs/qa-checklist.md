# Local Man UI Improvement Phase QA Checklist

Use this checklist before pushing or releasing UI work.

## Layout and rendering

- [ ] mobile header appears once
- [ ] mobile bottom dock appears with Home, Map, and About tabs
- [ ] mobile Home search/filter bar is visible
- [ ] mobile Home vendor cards are visible
- [ ] mobile Map tab shows floating search/filter controls
- [ ] mobile Map tab shows the map or coordinate fallback
- [ ] mobile Map selected vendor card is below the map
- [ ] mobile Map selected vendor card uses natural page scrolling
- [ ] mobile location panel appears in the Home flow
- [ ] mobile vendor section navbar is visible
- [ ] mobile About tab shows about/support copy and no search/filter/map controls
- [ ] web left column contains header, search/filter, location panel, section navbar, and vendor content
- [ ] web right column contains map and selected vendor card
- [ ] header branding shows the Localman icon beside the existing Localman text on mobile and desktop
- [ ] desktop does not show the mobile bottom dock
- [ ] no hidden map on mobile or web
- [ ] no duplicate selected vendor cards
- [ ] no duplicate headers
- [ ] no horizontal overflow
- [ ] no clipped action buttons

## Discovery interaction

- [ ] search works
- [ ] filter toggle opens and closes
- [ ] filter panel shows `Filters`, active count, `Clear all`, and `Apply filters`
- [ ] `Clear all` is disabled when no non-default filters are active
- [ ] mobile filter sheet opens inside the viewport, scrolls internally when needed, and does not overlap the bottom dock
- [ ] desktop filter panel keeps radius/price side by side and category/open-now full width
- [ ] search state persists between mobile Home and Map
- [ ] radius filter works at 1 km, 5 km, 10 km, and 30 km where seeded data exists
- [ ] radius filter does not reuse a stale cached wider-radius result set
- [ ] category filter works
- [ ] open-now filter works
- [ ] map refresh preserves the current search/filter state
- [ ] friendly empty states appear for true empty search/filter/radius results
- [ ] vendor section navbars switch content correctly
- [ ] vendor card selection is smooth
- [ ] no list or helper-row flicker during vendor selection
- [ ] no scroll jump while tapping several vendor cards

## Vendor cards

- [ ] no images on vendor cards
- [ ] discovery cards show `Active hours`
- [ ] no duplicate plain `Open` text
- [ ] `New` has no star icon
- [ ] rating values keep the star icon
- [ ] `Call`, `Directions`, and `View details` work
- [ ] `Call` and `Directions` show lightweight icons without changing `View details` icon behavior

## Selected vendor card

- [ ] mobile selected vendor card is directly below the map
- [ ] web selected vendor card remains in the right/map column
- [ ] `Call`, `Directions`, and `View details` all work
- [ ] `Call` and `Directions` icons are present and aligned
- [ ] selected vendor change does not shake the page

## Location

- [ ] location reminder toast appears on load
- [ ] location reminder toast auto-dismisses after about 5 seconds
- [ ] location reminder close button works
- [ ] location retry panel appears when location is unavailable or denied
- [ ] retry location action works

## Vendor detail

- [ ] vendor detail page loads
- [ ] back to map restores discovery state
- [ ] detail hero stays compact
- [ ] images appear only on the detail page
- [ ] `Call`, `Directions`, and `Request Rider` action icons render without changing button behavior
- [ ] `Share this vendor with a friend` renders as a dedicated section below vendor metadata
- [ ] `Share link` uses native share when available and shares the canonical vendor URL
- [ ] `Copy link` copies the canonical vendor URL and shows safe feedback
- [ ] no dedicated WhatsApp share button appears
- [ ] Request Rider opens the Rider Connect modal
- [ ] Rider Connect reminds users to call the vendor first
- [ ] Rider Connect disclaimer states Localman connects users, vendors, and independent riders and does not collect payment or guarantee delivery
- [ ] Rider Connect phone helper shows accepted examples: `08012345678`, `+2348012345678`, and `2348012345678`
- [ ] Rider Connect rejects shortened phone values such as `0813273210`, `+234813273210`, and `234813273210`
- [ ] manual address mode requires a delivery address before rider suggestions load
- [ ] current location mode requires a delivery area before rider suggestions load
- [ ] rider suggestions show at most 3 verified, visible, currently available riders with public-safe fields only
- [ ] incomplete contact or delivery details show actionable validation copy before rider selection
- [ ] invalid Rider Connect form submissions do not call the rider suggestion or contact handoff endpoint
- [ ] selected-rider verification sheet shows first name, vehicle, area, availability text, and masked plate when available
- [ ] `Continue to WhatsApp` opens only after a selected-rider handoff is created
- [ ] Try another rider and Back to vendor work
- [ ] report rider unavailable stores a review signal without exposing report data publicly

## Themes

- [ ] morning theme readable
- [ ] afternoon theme readable
- [ ] night theme readable
- [ ] selected cards readable in all themes

## Runtime sanity

- [ ] no console errors
- [ ] no hydration errors
- [ ] no obvious remount loops
- [ ] no broken import or runtime crash
- [ ] production service worker registers at `/sw.js` without update loops
- [ ] PWA runtime marker reports the current version and contains no user data
- [ ] returning to an installed PWA from focus/visibility triggers a throttled update check without reloading the app unexpectedly
- [ ] service worker cache contains only static shell assets, icons, branding, seed/static images, manifest, and `/offline.html`
- [ ] service worker does not cache `/api/**`, `/vendors/**`, `/search`, Rider Connect, ratings, nearby discovery, or admin/session payloads
- [ ] offline navigation shows the reconnect fallback instead of stale marketplace data

## Admin and agent workspace

- [ ] admin login succeeds
- [ ] agent login succeeds
- [ ] admin lands on `/admin/dashboard`
- [ ] agent lands on `/admin/agent`
- [ ] admin can access analytics
- [ ] admin can access logs when operational-event storage is enabled
- [ ] admin can access team management
- [ ] admin can access rider management
- [ ] agent cannot access analytics
- [ ] agent cannot access logs
- [ ] agent cannot access team management
- [ ] agent cannot access rider management
- [ ] agent cannot access audit logs

## Audit logs and analytics

- [ ] public event tracking still records events
- [ ] public event tracking skips stale/nonexistent vendor ids safely without `user_events` foreign-key errors
- [ ] admin analytics page loads summary data
- [ ] admin activity page loads recent team activity
- [ ] admin logs page loads recent operational warnings or shows the correct empty state when storage is disabled
- [ ] recent user events render correctly
- [ ] recent team activity renders correctly
- [ ] production analytics reads flow through the protected `/api/admin/analytics` route
- [ ] production audit-log reads flow through the protected `/api/admin/audit-logs` route
- [ ] production operational-log reads flow through the protected `/api/admin/logs` route
- [ ] analytics, activity, vendor-registry, and logs lists stay inside contained scroll panels at high volume
- [ ] logs metadata stays inert and never renders as HTML
- [ ] analytics empty state is real data absence, not auth/config failure
- [ ] logs empty state is expected when storage is disabled or no persistable events match the current filters

## Vendor Images

- [ ] selecting a vendor image does not reload or reset the edit page
- [ ] selecting a vendor image on `/admin/vendors/new` preserves all entered create-form fields
- [ ] selecting a file shows the current filename and local preview when preview creation is available
- [ ] upload sends `POST /api/admin/vendors/:id/images`
- [ ] operational upload logs show the current file metadata, not a stale previous file
- [ ] switching from Vendor A to Vendor B clears pending file input and preview state
- [ ] Vendor B upload creates a `vendor_images` row with Vendor B's id and a Vendor B storage path
- [ ] switching back to Vendor A does not show Vendor B's pending file or uploaded image
- [ ] upload success is not accepted if the metadata row is missing
- [ ] delete removes the storage object, removes the row, and updates the current image list
- [ ] public vendor detail renders the uploaded storage-backed image after refresh

## Rider Connect

- [ ] `/riders/apply` renders independent-rider, no-payment, and no-guarantee copy
- [ ] rider application requires consent and independent-rider disclaimer
- [ ] successful rider application is stored as hidden and pending
- [ ] `/admin/riders` renders search, verification filter, visibility filter, status badges, contact counts, report counts, and the independent-rider note
- [ ] admin can update rider verification and visibility status
- [ ] public suggestions include only verified, visible, currently available riders and are capped at 3
- [ ] public suggestions exclude rider phone, WhatsApp values, full legal names, notes, full plate, and internal status fields
- [ ] selected-rider verification shows masked plate only and never full plate
- [ ] contact handoff hashes customer phone and stores minimal metadata
- [ ] unavailable report hashes reporter phone when provided
- [ ] Rider Connect copy avoids payment, dispatch, courier, driver, and guarantee wording
- [ ] Rider Connect modal traps focus, closes on `Escape`, and returns focus to the Request Rider trigger
- [ ] rating prompt modal/sheet traps focus, closes on `Escape`, and returns focus to the rating trigger

## CSV intake

- [ ] CSV template downloads
- [ ] CSV template matches the full Create Vendor schema
- [ ] CSV preview shows valid and invalid rows
- [ ] invalid cells show inline issues
- [ ] duplicate rows in file are flagged
- [ ] duplicate existing vendors are flagged
- [ ] valid rows still upload when invalid rows are present
- [ ] CSV rows without coordinates are rejected clearly
- [ ] legacy minimal CSV format is rejected clearly

## Error handling

- [ ] toast messages appear for handled UI failures
- [ ] global error boundary fallback renders on forced render failure
- [ ] admin-facing errors show safe code/detail only
- [ ] agent/public errors do not expose raw upstream details
