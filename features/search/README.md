# Search Feature

Search filters, nearby vendor discovery, and result-list behavior belong here.

Nearby search ordering follows the shared discovery ranking contract:
- open vendors first
- distance ascending inside each open/closed group
- popularity or usage signal only as a close-distance tie-breaker
- deterministic name/id tie-breaker last

Search and category filters must preserve that ordering contract after filtering. Cached or restored discovery snapshots are allowed only when they do not reintroduce deleted, deactivated, or stale vendor rows.

Current mobile behavior:
- Home and Map tabs share one search/filter state.
- Search, category, price, open-now, and radius changes on Home must be reflected on Map.
- Search, category, price, open-now, and radius changes on Map must be reflected on Home.
- About does not render search/filter controls and must not reset the shared state.
- Radius filters currently support 1 km, 5 km, 10 km, and 30 km.

Cache-safety rules:
- restored nearby snapshots must match the active nearby request key before they can skip a fetch
- malformed vendor records, known mock ids, and known mock slugs must be rejected during cache restore
- stale cache must not produce false empty states for a wider or different radius/filter request
