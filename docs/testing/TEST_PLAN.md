## Title
The Local Man — Test Plan

## Phase 1 Test Goal
Ensure the foundation is coherent before feature implementation begins.

## Documentation Validation
Check:
- PRD and architecture do not conflict
- schema supports user stories
- API spec matches schema intent
- UI rules match product scope
- roadmap sequence makes sense

## Critical Logic
### Open Now Logic
Test:
- same-day schedules
- overnight schedules
- closed days
- manual overrides

### Location Logic
Test:
- location allowed
- location denied
- no nearby vendors
- incorrect coordinates
- distance calculation accuracy
- nearby radius filtering
- nearest-first vendor ordering
- browser geolocation success
- IP approximation fallback
- Abuja default city fallback

Current automated coverage:
- `tests/distance.test.ts`
- `tests/location-acquisition.test.ts`

### Vendor Display Logic
Test:
- missing image fallback
- no rating fallback
- no hours fallback

### Admin Data Quality
Test:
- invalid coordinates
- duplicate slugs
- invalid hours
- unsupported image type
