# Tests

Local Man uses:
- Node's built-in test runner for unit and route-level integration coverage
- Playwright for browser smoke and layout-stress coverage

## Playwright discipline

Shared browser helpers live in:
- [tests/e2e/helpers/public-discovery.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/tests/e2e/helpers/public-discovery.ts)
- [tests/e2e/helpers/playwright-artifacts.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/tests/e2e/helpers/playwright-artifacts.ts)

Shared cleanup-safe namespace helpers live in:
- [lib/testing/playwright-artifacts.ts](/Users/frankenstein/Desktop/Local-man-main-app/local-man-platform-app/lib/testing/playwright-artifacts.ts)

Rules:
- use deterministic test namespaces instead of inline random names
- register teardown work in the shared cleanup registry for mutation tests
- install browser-state isolation before E2E flows that touch public discovery
- never create persistent shared-environment records without an approved cleanup namespace
- use `npm run db:inspect:playwright` before `npm run db:cleanup:playwright`

Shared-environment cleanup safety:
- `npm run db:cleanup:playwright` refuses remote cleanup unless `LOCALMAN_ALLOW_SHARED_ENV_TEST_CLEANUP=1` or `CI=true`
- cleanup only targets approved Playwright/QA namespaces

## Release-gate notes

- pair browser tests with `npm run smoke:nearby` and the static gate (`lint`, `typecheck`, `test`, `build`) before release signoff
- keep the worktree clean before final browser verification so the tested state matches the deployable state
- on local macOS sandboxed runs, Chromium launch can fail before the app loads; rerun Playwright outside the sandbox when that happens
- include mobile discovery regression coverage after dock/search/map changes:
  - Home and Map share search/filter state
  - radius filters do not reuse stale wider-radius cache
  - filter sheet shows active count, `Clear all`, and `Apply filters`
  - mobile filter sheet remains viewport-bounded above the dock
  - About renders no search/filter controls
  - map refresh preserves filters and selected-vendor state
  - empty-state copy appears only for true empty results
- include cache integrity coverage after discovery-state changes:
  - request-key mismatches require a live nearby fetch
  - malformed vendor cache is rejected
  - known mock ids and known mock slugs never hydrate production-shaped discovery state
- include public analytics FK-safety coverage after event-tracking changes:
  - valid-shaped missing vendor ids are skipped safely
  - mock vendor ids/slugs cannot reach production analytics through restored cache
- include the targeted vendor-image browser tests after upload changes:
  - native file input reset still posts
  - local preview creation failure does not reset the form
  - current native file beats stale React state
  - vendor switch clears pending file and preview state
  - stale image-list responses cannot overwrite a successful upload
- run a real Supabase-backed cross-vendor upload check when changing upload state, metadata insert handling, or admin image caches
- run `npm audit` as a release blocker check; high-severity advisories require remediation before production deploy
