# Discovery

This document describes how public vendor discovery currently works.

## Origin Priority

Discovery origin priority is:

1. GPS location
2. Selected discovery area
3. Default Wuse discovery area

GPS always wins over selected, restored, or default areas. Selected area wins over default Wuse. Default Wuse is used when no GPS origin and no selected area are available.

## Discovery Is Coordinate Based

Discovery uses coordinates and radius.

It does not filter by vendor `area` labels. A vendor labelled `Garki` can appear in Jabi discovery if its coordinates are inside the selected radius around the Jabi discovery origin.

Vendor `area` is display and governance data. It is not the discovery query filter.

## Discovery Areas

Selected-area discovery uses curated area centers:

| Area | Latitude | Longitude |
| --- | ---: | ---: |
| Wuse | 9.0813 | 7.4673 |
| Gwarinpa | 9.1099 | 7.4042 |
| Jabi | 9.0650 | 7.4231 |
| Utako | 9.0701 | 7.4410 |
| Maitama | 9.0956 | 7.4934 |
| Asokoro | 9.0476 | 7.5150 |
| Garki | 9.0267 | 7.4833 |
| Kubwa | 9.1538 | 7.3231 |
| Lugbe | 8.9910 | 7.3553 |

Default area is Wuse.

## Radius

Supported radius filters are:

- 1 km
- 5 km
- 10 km
- 30 km

Radius applies to GPS, selected-area, and default-Wuse modes.

## Search

Search filters the active discovery dataset. It does not search the whole vendor database.

Examples:

- GPS mode: search filters vendors near GPS origin.
- Jabi mode: search filters vendors near Jabi origin.
- Default Wuse mode: search filters vendors near Wuse origin.

Clearing search restores the current active discovery dataset.

## Ranking

Default, GPS, and selected-area ordering use:

1. Open vendors
2. Distance
3. Popularity
4. Stable tie-breakers

Search result ordering uses:

1. Open vendors
2. Distance
3. Search relevance
4. Popularity
5. Stable tie-breakers

Search relevance does not create distance inversions. A farther open vendor should not appear before a nearer open vendor because of popularity or relevance.

Popular intentionally uses:

1. Popularity
2. Distance

## Map Relationship

The map uses the same active discovery dataset as the list. Selecting a vendor card or marker should keep the selected card, selected marker, and camera target aligned to the same vendor id. MapLibre receives marker and camera coordinates in `[longitude, latitude]` order.

## Recent And Last Viewed

Recent and Last Viewed are user-centric. They are not scoped by area. They must prune unavailable or malformed retained vendors and should not override live discovery data.

## Snapshot Restoration

Discovery snapshots can restore selected area during vendor-profile back navigation. This is session restoration, not durable persistence.

Selected areas should not survive:

- page reload
- browser restart
- future sessions

GPS still overrides restored area.
