## Localman

Localman is a location-aware marketplace for discovering local food vendors in Abuja, Nigeria. The public app helps users find nearby vendors, understand what they sell, call or get directions, request an independent rider handoff, and submit lightweight ratings. The admin app supports vendor onboarding, rider management, analytics, audit logs, and production data operations.

## Core Platform

- Public discovery uses GPS, selected-area, or default-Wuse origins.
- Discovery is coordinate and radius based; vendor area labels are governance/display data, not hard filters.
- Search and radius filters operate only against the active discovery dataset.
- Ranking uses open vendors first, distance second, then supporting signals. The Popular tab intentionally uses popularity first.
- The map uses MapLibre when available, with fallback marker rendering that keeps selected markers tappable in dense vendor areas.
- Rider Connect suggests up to 3 verified, visible, currently available riders and exposes only safe public rider details before WhatsApp handoff.
- Ratings use star scores plus predefined signals; no public free-text reviews are collected.
- The PWA service worker caches static shell assets only and does not cache marketplace, rider, rating, search, or admin data.
- Admin workflows include manual vendor creation, CSV vendor intake, vendor media, rider management, analytics, operational logs, and marketplace reset tooling.
- Admin Portal v2 authentication is hardened with distributed login protection, governed HttpOnly browser sessions, centralized password management, SSR-safe authentication pages, and shared authentication UI components.

## Production Operations

Production onboarding follows the permanent Localman import standard v1.0:

```text
Raw workbook
-> source validation
-> normalization
-> governance review
-> coordinate validation
-> duplicate coordinate audit
-> description review
-> import package
-> release gate
-> import
-> post-import validation
-> post-import quality audit
-> quality score
-> import history update
-> production baseline update
```

Production Data v1.0 is closed under the hardening governance model. Production is now the operational source of truth. Original onboarding workbooks remain historical source documents, and approved production overrides are recorded in `docs/PRODUCTION_CHANGELOG.md` before future certification work treats them as baseline.

Marketplace reset, import history, import checklists, override policy, and release gates are documented under `docs/`. Do not import raw field-collection workbooks directly, and do not skip any onboarding phase.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Supabase Postgres, Auth, and Storage
- MapLibre GL JS
- Zod validation
- Node test runner
- Playwright for e2e coverage

## Project Structure

- `app/` - App Router pages and API route handlers
- `components/` - public and admin UI
- `features/` - feature-level modules and notes
- `hooks/` - shared React hooks
- `lib/` - services, validation, location, analytics, PWA, and Supabase helpers
- `public/` - static assets, icons, manifest, and service worker assets
- `scripts/` - database, runtime, reset, and build scripts
- `supabase/` - migrations, seed data, and ops SQL
- `tests/` - unit and route tests
- `docs/` - architecture, discovery, governance, import, reset, ops, QA, and release documentation

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Apply migrations and verify database shape:

```bash
npm run db:migrate
npm run db:check
```

Run validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run browser tests:

```bash
npm run test:e2e
```

Run nearby smoke test:

```bash
npm run smoke:nearby
```

Marketplace reset dry run:

```bash
npm run marketplace:reset -- --dry-run
```

Marketplace reset execute mode requires explicit confirmation:

```bash
npm run marketplace:reset -- --execute --confirm-marketplace-reset
```

## Environment

Required for the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` for migrations, checks, and reset tooling

Recommended for production:

- `RIDER_CONNECT_HASH_SECRET`
- `NEXT_PUBLIC_MAP_STYLE_URL`
- `LOCALMAN_RUNTIME_ENVIRONMENT`
- `LOCALMAN_LOG_LEVEL`
- `LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE`

## Documentation Index

- [Architecture](docs/ARCHITECTURE.md)
- [Discovery](docs/DISCOVERY.md)
- [Area Governance](docs/AREA_GOVERNANCE.md)
- [Import Pipeline](docs/IMPORT_PIPELINE.md)
- [Production Import Standard](docs/PRODUCTION_IMPORT_STANDARD.md)
- [Production Import History](docs/PRODUCTION_IMPORT_HISTORY.md)
- [Production Import Checklist](docs/PRODUCTION_IMPORT_CHECKLIST.md)
- [Production Data Baseline](docs/PRODUCTION_DATA_BASELINE.md)
- [Production Data Integrity](docs/PRODUCTION_DATA_INTEGRITY.md)
- [Production Override Policy](docs/PRODUCTION_OVERRIDE_POLICY.md)
- [Production Changelog](docs/PRODUCTION_CHANGELOG.md)
- [Production Hardening Summary](docs/PRODUCTION_HARDENING_SUMMARY.md)
- [Admin Auth Security](docs/ADMIN_AUTH_SECURITY.md)
- [Admin Auth Certification](docs/ADMIN_AUTH_CERTIFICATION.md)
- [Localman Food Dictionary](docs/LOCALMAN_FOOD_DICTIONARY.md)
- [Permanent Regression Locks](docs/PERMANENT_REGRESSION_LOCKS.md)
- [Codex Guidelines](docs/CODEX_GUIDELINES.md)
- [Marketplace Reset](docs/MARKETPLACE_RESET.md)
- [Production Onboarding](docs/PRODUCTION_ONBOARDING.md)
- [Operations Runbook](docs/OPERATIONS.md)
- [Master Release Gate](docs/MASTER_RELEASE_GATE.md)
- [Release Status](docs/RELEASE_STATUS.md)
- [Historical Production Changelog](docs/CHANGELOG_PRODUCTION.md)
- [API Spec](docs/api/API_SPEC.md)
- [Analytics](docs/analytics.md)
- [Audit Logs](docs/audit-logs.md)
- [PWA Runtime](docs/pwa-runtime.md)
- [Rider Connect](docs/rider-connect.md)
- [RBAC](docs/rbac.md)
- [Security](docs/ops/SECURITY.md)
- [Environment Ops](docs/ops/ENV.md)
- [Runtime Setup](docs/ops/RUNTIME_SETUP.md)
- [QA Checklist](docs/qa-checklist.md)
- [Testing Plan](docs/testing/TEST_PLAN.md)
- [UI Overview](docs/ui.md)
- [Layout](docs/layout.md)
- [Navigation](docs/navigation.md)
- [Vendor Cards](docs/vendor-cards.md)
- [Release Notes](docs/RELEASE_NOTES.md)
