# Marketplace Reset

The marketplace reset process clears QA/test marketplace data before production onboarding while retaining platform infrastructure.

Do not run execute mode without a current backup and explicit operator approval.

## Why Reset Exists

Current marketplace data can include QA/test vendors, riders, ratings, images, user events, and operational events. Production onboarding requires an empty marketplace dataset while keeping schema, policies, configuration, admin accounts, categories, and rating signal options intact.

## Disposable Tables

Reset clears these tables:

- `rating_signal_selections`
- `rider_contact_intents`
- `rider_unavailable_reports`
- `user_events`
- `operational_events`
- `vendor_images`
- `vendor_featured_dishes`
- `vendor_hours`
- `vendor_category_map`
- `ratings`
- `vendors`
- `riders`

## Retained Infrastructure Tables

Reset verifies these remain present:

- `admin_users`
- `vendor_categories`
- `rating_signal_options`
- `app_schema_migrations`

The reset does not delete schema, migrations, RLS policies, functions, storage bucket configuration, or environment configuration.

## Storage Cleanup

Supabase Storage objects in the `vendor-images` bucket are disposable for marketplace reset.

The reset script builds a deletion candidate list from:

- existing objects in `vendor-images`
- `vendor_images.storage_object_path` values

Database deletion does not automatically delete storage objects, so storage cleanup is explicit.

## Backup Requirement

Before execute mode:

1. Take a database backup.
2. Confirm storage backup/export policy.
3. Confirm target Supabase URL and project ref.
4. Run dry run.
5. Review counts and storage candidates.

## Dry Run

Default mode is dry run.

```bash
npm run marketplace:reset -- --dry-run
```

Dry run should:

- print target Supabase URL/project ref
- count disposable and retained tables
- list storage deletion candidates
- report planned delete order
- avoid deleting rows
- avoid deleting storage objects

## Execute

Execute mode requires the confirmation flag.

```bash
npm run marketplace:reset -- --execute --confirm-marketplace-reset
```

Execute mode should:

1. log pre-reset counts
2. delete child/dependent rows first
3. delete parent marketplace rows
4. delete storage objects in batches
5. recount disposable and retained tables
6. verify disposable tables are zero
7. verify retained infrastructure tables remain non-zero
8. print final report

## Warnings

- Execute mode is destructive.
- Do not execute against an unknown project.
- Do not execute before backup.
- `audit_logs` are not part of marketplace analytics reset and are not cleared by this process.
- If storage deletion failures are reported, review and clean remaining objects before production launch.
- Reset does not import production data. Import is a separate workflow.
