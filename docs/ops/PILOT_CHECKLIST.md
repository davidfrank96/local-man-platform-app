## Title
Local Man — Pilot Operations Checklist

## Purpose
Use this checklist for Abuja pilot launch and daily pilot operations.

This is an operator runbook, not a feature document. It should stay short, practical, and aligned with the current MVP surface.

## Before Launch
- [ ] Confirm `docs/ops/RUNTIME_SETUP.md` passes end to end on the target Supabase project.
- [ ] Confirm `.env.local` contains the current Supabase URL, anon key, service role key, and database connection string.
- [ ] Confirm `npm run runtime:check-env` passes.
- [ ] Confirm `npm run runtime:check-db-env` passes.
- [ ] Confirm migration applied successfully.
- [ ] Confirm `npm run db:check` passes.
- [ ] Confirm explicit Data API grants and RLS policies are applied on the target Supabase project.
- [ ] Confirm Abuja seed applied successfully.
- [ ] Confirm `npm run smoke:nearby` passes against the real Supabase environment.
- [ ] Confirm admin login works for a user present in `admin_users`.
- [ ] Confirm at least one vendor profile loads with hours, categories, a featured dish, and an image.

## Vendor Data Quality Checklist
For each vendor before activation:
- [ ] Vendor name is clear and unique.
- [ ] Slug is lowercase, hyphen-separated, and unique.
- [ ] Phone number is present if the vendor should be callable.
- [ ] Latitude and longitude are present and accurate.
- [ ] Area is specific enough to scan quickly.
- [ ] Address text is present when known.
- [ ] Weekly hours are complete and believable.
- [ ] Featured dishes are present and representative.
- [ ] At least one image is uploaded or a missing-image fallback is acceptable.
- [ ] Price band is set if known.
- [ ] Description is short, factual, and not promotional.
- [ ] Vendor is marked active only when it is ready for the pilot.

## Admin Onboarding Steps
- [ ] Create or confirm the Supabase admin user.
- [ ] Confirm the user id exists in `admin_users`.
- [ ] Sign in at `/admin/login`.
- [ ] Confirm the admin session persists after refresh.
- [ ] Confirm logout returns to `/admin/login`.
- [ ] Confirm protected admin routes reject unauthenticated access.
- [ ] If operational-event storage is enabled, confirm `/admin/logs` loads for an admin account and remains unavailable to agents.

## Vendor Creation Process
- [ ] Open `/admin/vendors/new`.
- [ ] Let the slug auto-generate from the vendor name.
- [ ] Check required fields before saving.
- [ ] Enter latitude and longitude carefully.
- [ ] Save the vendor.
- [ ] Confirm the vendor appears in the admin list.
- [ ] Confirm the vendor loads in public discovery and vendor detail views.

## Image Upload Process
- [ ] Open the vendor image section in admin.
- [ ] Upload only supported image types.
- [ ] Keep files within the documented size limit.
- [ ] Confirm the image appears in the current image list.
- [ ] Refresh the page and confirm the image still appears.
- [ ] Switch to a different vendor and confirm the previous file name, preview, and image count do not carry over.
- [ ] Upload a different image to the second vendor and confirm the current file metadata appears in the operational log.
- [ ] Remove the image when no longer needed.
- [ ] Confirm the storage object and database row are both removed.

## Public Discovery Smoke Test
- [ ] Open the homepage.
- [ ] On mobile, confirm the Home, Map, and About dock tabs render.
- [ ] On mobile Home, confirm vendor cards render and search/filter controls work.
- [ ] On mobile Map, confirm the map area renders without a blank screen and the refresh control is usable.
- [ ] On mobile About, confirm support/about copy and the Using Localman, Why Localman Exists, Install Localman as an App, Terms of Use, and Privacy Policy accordions appear, and search/filter controls are absent.
- [ ] On desktop, confirm the combined list/map layout still renders.
- [ ] Confirm search changes the result set on mobile Home, mobile Map, and desktop.
- [ ] Confirm filters still work, including 1 km, 5 km, 10 km, and 30 km radius choices where seeded data exists.
- [ ] Confirm the filter panel shows active count, `Clear all`, open-now card, and `Apply filters`.
- [ ] Confirm the mobile filter sheet opens and scrolls without covering the bottom dock.
- [ ] Confirm vendor cards open the vendor detail page.
- [ ] Confirm call and directions actions render correctly.
- [ ] Confirm the selected vendor panel shows open state, area, active hours, and call/directions/detail actions.
- [ ] Confirm stale/mock cached vendors do not appear after browser refresh.
- [ ] Confirm the service worker registers in production runtime and caches only static shell assets.
- [ ] Confirm the PWA runtime marker is current and no `/api/**` or vendor/search payloads are in `CacheStorage`.

## Mobile Geolocation Test
- [ ] Test on a mobile browser with location permission allowed.
- [ ] Confirm precise location can resolve before fallback.
- [ ] Test with location denied.
- [ ] Confirm the app falls back to approximate location or Abuja without blocking.
- [ ] Test with location unavailable or timed out.
- [ ] Confirm the fallback message is clear.
- [ ] Confirm the retry location action still works.

## Rollback Steps
If a vendor record is wrong:
- [ ] Deactivate the vendor in admin.
- [ ] Remove incorrect images.
- [ ] Fix the vendor hours, dishes, or coordinates.
- [ ] Reactivate only after verification.

If a runtime release is broken:
- [ ] Stop promoting the release.
- [ ] Re-run `npm run smoke:nearby`.
- [ ] Re-check Supabase env vars.
- [ ] Re-apply the migration only if the schema was not actually applied.
- [ ] Re-run the seed validation queries.
- [ ] Restore the previous working deploy if the public app is already live.

If storage uploads are broken:
- [ ] Keep existing vendor records active.
- [ ] Pause new image uploads.
- [ ] Continue using the missing-image fallback.
- [ ] Check whether the POST request fires before debugging Storage.
- [ ] If Storage object exists but the image does not render, check `vendor_images` for the matching metadata row.
- [ ] Investigate the bucket, service-role auth, metadata insert, and selected-vendor state before resuming uploads.

## Known Limitations
- IP approximation is still an interface, not a concrete provider.
- Public map rendering may use MapLibre with a browser-safe MapTiler style URL or the coordinate fallback when the style URL is absent or the real map cannot load.
- PWA support is install/static-shell only; offline discovery, Rider Connect, ratings, maps, and dynamic marketplace cache behavior are not implemented.
- Android Chrome and iOS Add to Home Screen appearance should still be checked on real devices before promoting PWA installability publicly.
- Admin login uses Supabase email/password sessions backed by the current admin authorization model.
- Missing vendor images fall back cleanly, but some seed data still uses placeholder image URLs.
- Public rate limiting is still process-local and best-effort for a single app instance rather than a distributed global throttle.
- Browser-level smoke tests cover the core flows, not every admin edge case.

## Daily Checks
- [ ] Check admin login.
- [ ] Check one public vendor detail page.
- [ ] Check `GET /api/vendors/nearby` still returns sensible nearby results.
- [ ] Check any new vendor content for missing fields or obviously bad data.
- [ ] Check for broken image uploads or missing storage objects.
- [ ] Check mobile layout quickly in a real browser.

## Weekly Checks
- [ ] Review new or edited vendors for data quality.
- [ ] Confirm all active vendors still have valid coordinates.
- [ ] Confirm hours, dishes, and images are still present for pilot vendors.
- [ ] Confirm seed images or uploaded images still render.
- [ ] Re-run runtime smoke tests against the current environment.
- [ ] Review failed admin actions and audit logs.
- [ ] If operational-event storage is enabled, review recent `/admin/logs` warnings or failures and prune old events on the normal operator cadence.
- [ ] Revisit fallback messages if operators or users report confusion.
