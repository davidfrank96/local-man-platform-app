# Search Feature

Search filters, nearby vendor discovery, and result-list behavior belong here.

Nearby search ordering follows the shared discovery ranking contract:
- open vendors first
- distance ascending inside each open/closed group
- popularity or usage signal only as a close-distance tie-breaker
- deterministic name/id tie-breaker last

Search and category filters must preserve that ordering contract after filtering. Cached or restored discovery snapshots are allowed only when they do not reintroduce deleted, deactivated, or stale vendor rows.
