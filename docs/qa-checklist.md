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
