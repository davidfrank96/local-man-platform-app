# Local Man Navigation and Discovery Controls

This document covers the current search, filter, and section-navigation behavior.

## Mobile navigation

### Floating search/navbar

On mobile, search and filters are presented as a floating discovery surface.

- search field stays above the map
- filter button is part of the same floating row
- filter panel expands below that row
- search behavior is unchanged from the underlying discovery query logic

### Mobile filter behavior

The filter toggle opens the existing filter controls:

- radius
- price
- category
- open now
- apply
- clear when active

The panel is hidden by default and uses the same discovery state as the rest of the page.

### Mobile vendor section navbar

The mobile vendor navbar switches between existing sections:

- `Nearby`
- `Recent`
- `Popular`

Default:

- `Nearby`

It is a section switcher, not a route change.

## Web navigation

### Search and filter placement

On web, search and filters sit below the Local Man header in the left content column.

- they do not render inside the map
- they stay aligned with the vendor cards
- the filter toggle reveals the same underlying filter controls used on mobile

### Web vendor section navbar

The desktop vendor navbar sits below the location panel and above vendor content.

It switches between:

- `Nearby`
- `Recent`
- `Popular`
- `Last selected`

Default:

- `Nearby`

`Last selected` is present on web because the page has a real last-selected retention section.

## Selected vendor and detail navigation

- vendor card body click/tap previews a vendor on the map
- `View details` opens the vendor detail page
- `Back to map` returns to discovery
- discovery search, filters, selected vendor, and scroll position are restored through query state plus a session snapshot

## Search and filter rules

Supported public discovery filters are:

- search query
- radius
- open now
- price band
- category

There is no separate user-facing sort dropdown at the moment. Ordering is automatic and based on discovery logic.
