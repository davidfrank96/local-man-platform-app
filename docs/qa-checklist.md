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
- [ ] desktop does not show the mobile bottom dock
- [ ] no hidden map on mobile or web
- [ ] no duplicate selected vendor cards
- [ ] no duplicate headers
- [ ] no horizontal overflow
- [ ] no clipped action buttons

## Discovery interaction

- [ ] search works
- [ ] filter toggle opens and closes
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

## Selected vendor card

- [ ] mobile selected vendor card is directly below the map
- [ ] web selected vendor card remains in the right/map column
- [ ] `Call`, `Directions`, and `View details` all work
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

## Admin and agent workspace

- [ ] admin login succeeds
- [ ] agent login succeeds
- [ ] admin lands on `/admin/dashboard`
- [ ] agent lands on `/admin/agent`
- [ ] admin can access analytics
- [ ] admin can access logs when operational-event storage is enabled
- [ ] admin can access team management
- [ ] agent cannot access analytics
- [ ] agent cannot access logs
- [ ] agent cannot access team management
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
