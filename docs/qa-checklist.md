# Local Man UI Improvement Phase QA Checklist

Use this checklist before pushing or releasing UI work.

## Layout and rendering

- [ ] mobile header appears once
- [ ] mobile floating search/filter bar is visible
- [ ] mobile map is visible
- [ ] mobile selected vendor card is below the map
- [ ] mobile location panel appears below the selected vendor card
- [ ] mobile vendor section navbar is visible
- [ ] web left column contains header, search/filter, location panel, section navbar, and vendor content
- [ ] web right column contains map and selected vendor card
- [ ] no hidden map on mobile or web
- [ ] no duplicate selected vendor cards
- [ ] no duplicate headers
- [ ] no horizontal overflow
- [ ] no clipped action buttons

## Discovery interaction

- [ ] search works
- [ ] filter toggle opens and closes
- [ ] radius filter works
- [ ] category filter works
- [ ] open-now filter works
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
- [ ] admin can access team management
- [ ] agent cannot access analytics
- [ ] agent cannot access team management
- [ ] agent cannot access audit logs

## Audit logs and analytics

- [ ] public event tracking still records events
- [ ] admin analytics page loads summary data
- [ ] recent user events render correctly
- [ ] recent team activity renders correctly
- [ ] analytics reads use a configured `SUPABASE_SERVICE_ROLE_KEY`
- [ ] audit-log reads use a configured `SUPABASE_SERVICE_ROLE_KEY`
- [ ] analytics empty state is real data absence, not auth/config failure

## CSV intake

- [ ] quick add vendor works for agent role
- [ ] CSV template downloads
- [ ] CSV preview shows valid and invalid rows
- [ ] invalid cells show inline issues
- [ ] duplicate rows in file are flagged
- [ ] duplicate existing vendors are flagged
- [ ] valid rows still upload when invalid rows are present
- [ ] CSV rows without coordinates are rejected clearly

## Error handling

- [ ] toast messages appear for handled UI failures
- [ ] global error boundary fallback renders on forced render failure
- [ ] admin-facing errors show safe code/detail only
- [ ] agent/public errors do not expose raw upstream details
