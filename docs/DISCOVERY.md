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

Radius produces the complete matching discovery dataset:

```text
Radius
↓
All Matching Vendors
↓
Map = All
Cards = Paginated
```

The complete matching dataset is the source for search, ranking, map rendering, and card pagination. Pagination is only a card browsing concern.

The nearby response contract is:

- `map_vendors`: all matching vendors
- `vendors`: the current card page
- `pagination`: card-list pagination metadata

The default card page size is 25. The maximum card page size is 50. Pagination never changes discovery, search, ranking, clustering, marker availability, or selected vendor identity.

## Search

Search filters the active discovery dataset. It does not search the whole vendor database.

Examples:

- GPS mode: search filters vendors near GPS origin.
- Jabi mode: search filters vendors near Jabi origin.
- Default Wuse mode: search filters vendors near Wuse origin.

Clearing search restores the current active discovery dataset.

Search runs before card pagination. A vendor that matches search outside the first card page must still be searchable, included in `map_vendors`, and eligible for card pagination.

Search covers vendor identity, descriptions, featured dishes, and category assignments. Multi-category vendors must remain visible in every assigned category because category filtering uses the preserved `vendor_category_map` data, not a single flattened category.

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

The map uses all vendors in the active matching discovery dataset. The card list uses a paginated subset of that same ranked result. Selecting a vendor card or marker should keep the selected card, selected marker, and camera target aligned to the same vendor id. MapLibre receives marker and camera coordinates in `[longitude, latitude]` order.

MapLibre clustering is a rendering concern only. It never changes the discovery dataset. Cluster bubbles show counts, unclustered vendors use storefront markers, selected vendors render through the selected overlay, and same-location groups expose a selector when multiple vendors share exact coordinates.

Card pagination must never change:

- map vendor count
- cluster source
- marker availability
- cluster contents
- selected vendor identity
- selected marker visibility

Card click has priority over cluster state. If a selected vendor is currently clustered, the selection flow must expand or move the camera enough to keep that vendor visible without changing the ranked dataset.

## Recent And Last Viewed

Recent and Last Viewed are user-centric. They are not scoped by area. They must prune unavailable or malformed retained vendors and should not override live discovery data.

## Snapshot Restoration

Discovery snapshots can restore selected area during vendor-profile back navigation. This is session restoration, not durable persistence.

Selected areas should not survive:

- page reload
- browser restart
- future sessions

GPS still overrides restored area.
