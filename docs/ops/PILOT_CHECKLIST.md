## Title
The Local Man — Pilot Operations Checklist

## Purpose
Use this checklist for Abuja pilot launch and daily pilot operations.

This is an operator runbook, not a feature document. It should stay short, practical, and aligned with the current MVP surface.

## Before Launch
- [ ] Confirm `docs/ops/RUNTIME_SETUP.md` passes end to end on the target Supabase project.
- [ ] Confirm `.env.local` contains the current Supabase URL, anon key, and database connection string.
- [ ] Confirm `npm run runtime:check-env` passes.
- [ ] Confirm `npm run runtime:check-db-env` passes.
- [ ] Confirm migration applied successfully.
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
- [ ] Remove the image when no longer needed.
- [ ] Confirm the storage object and database row are both removed.

## Public Discovery Smoke Test
- [ ] Open the homepage.
- [ ] Confirm vendor cards render.
- [ ] Confirm the map area renders without a blank screen.
- [ ] Confirm search changes the result set.
- [ ] Confirm filters still work.
- [ ] Confirm vendor cards open the vendor detail page.
- [ ] Confirm call and directions actions render correctly.
- [ ] Confirm the selected vendor panel shows open state, area, phone, price, rating, and featured dish count.

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
- [ ] Investigate the bucket and auth configuration before resuming uploads.

## Known Limitations
- IP approximation is still an interface, not a concrete provider.
- Public map rendering is still the MVP coordinate grid.
- Admin login uses Supabase email/password sessions backed by the current admin authorization model.
- Missing vendor images fall back cleanly, but some seed data still uses placeholder image URLs.
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
- [ ] Revisit fallback messages if operators or users report confusion.
