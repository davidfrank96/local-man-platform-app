# Local Man Rider Connect

Rider Connect is the current lightweight handoff model for connecting users, vendors, and registered independent riders.

## MVP Model

- Public riders apply at `/riders/apply`.
- Admins review rider profiles at `/admin/riders`.
- Vendor detail pages show `Request Rider`.
- Users submit contact details, delivery area/address, order note, a payment coordination note, and the required disclaimer.
- Localman returns up to 3 public-safe rider suggestions for riders that are `verified`, `visible`, and currently within their structured availability window.
- The user chooses one rider and Localman returns a WhatsApp click-to-chat URL for that selected rider only.
- The user sends the WhatsApp message directly. Localman does not send WhatsApp messages through an API.
- Users can report a selected rider as unavailable after handoff.

There is no public all-rider directory. Public rider discovery is vendor-scoped, capped, and shaped by the server route.

Rider Connect does not include payments, checkout, delivery dispatch, order tracking, rider acceptance lifecycle, rider login, live rider GPS, realtime tracking, offline coordination, or delivery guarantees.

## Liability-Safe Copy Rules

Use:

- `Request Rider`
- `Find a Rider`
- `independent riders`
- `coordinate directly`
- `Continue to WhatsApp`
- `Localman connects you`
- `usually available`
- `rider suggestions`

Avoid copy that implies checkout, booking, Localman-operated delivery, live rider availability, courier employment, driver assignment, dispatch confirmation, or delivery-outcome guarantees.

Required disclaimer:

> Localman only connects users, vendors, and independent riders. Food availability, payment, delivery fee, pickup, and delivery terms are handled directly between the user, vendor, and rider. Localman does not collect payment or guarantee delivery.

User-facing flows must also remind users to call the vendor first to confirm food availability and price. Rider hours must be described as usual/listed availability, not real-time certainty.

## Public Application

`/riders/apply` accepts independent rider applications with:

- display name
- full legal name
- phone number
- WhatsApp number
- vehicle type
- optional plate number
- operating areas
- usual available hours
- consent checkbox
- independent-rider disclaimer checkbox

The application flow does not collect NIN, BVN, bank account, wallet, password, delivery fee, live location, or photo uploads. Successful applications are inserted as `verification_status = pending` and `visibility_status = hidden`, so riders never become public automatically.

## Admin Management

`/admin/riders` allows admins with `riders:manage` to:

- list, search, and filter riders
- create rider profiles from manual intake or external consent records
- review contact-intent and unavailable-report counts
- update `verification_status`: `pending`, `verified`, `rejected`
- update `visibility_status`: `hidden`, `visible`, `suspended`
- edit safe profile fields including names, phone values, vehicle type, plate number, operating areas, display-only usual available hours, structured weekday/weekend availability windows, and notes

Admin-created rider profiles default to `pending` and `hidden` unless an admin explicitly chooses another valid status pair. `visible` is allowed only for `verified` riders. Admin create requires confirmation that rider consent was collected externally and rejects duplicate phone or WhatsApp values.

Admin makes rider profiles eligible for future suggestion flows only. Admin does not approve individual deliveries, assign riders, process delivery payments, or mediate disputes.

Hard delete is intentionally unsupported in the MVP. Deactivation is handled through `hidden`, `suspended`, or `rejected` statuses so profile history, contact intents, and unavailable reports remain auditable.

## Public Suggestion and Handoff APIs

`GET /api/vendors/[slug]/riders`:

- requires a valid active vendor slug
- rate limits public suggestion requests
- returns only riders that are verified, visible, and currently available based on structured weekday/weekend time windows
- returns a maximum of 3 rider suggestions
- uses lightweight stable rotation when more than 3 riders are available
- keeps operating area informational only; area and proximity are not eligibility filters
- is the only public rider suggestion surface; the MVP does not expose an all-riders listing endpoint or public rider search
- returns public-safe fields only: rider id, first-name display label, photo URL, vehicle type, operating areas, and usual availability label
- never returns rider phone, WhatsApp phone, full legal name, notes, full plate, or internal status fields

When no riders are available, the public modal shows an empty state telling the user to call the vendor directly or try again later.

`POST /api/vendors/[slug]/riders/contact`:

- validates selected rider, customer details, delivery mode/address/area, order note, payment note, and disclaimer acceptance
- verifies the vendor exists and the selected rider is still verified, visible, and currently available
- stores a minimal `rider_contact_intents` row
- hashes customer phone before storage
- uses raw customer phone/address only transiently while building the WhatsApp URL
- returns the WhatsApp URL for the selected rider only
- returns a safe selected-rider card that may include a masked plate value for the verification sheet

`POST /api/vendors/[slug]/riders/report-unavailable`:

- validates vendor and rider existence
- accepts `no_response`, `unavailable`, `wrong_number`, `unsafe`, and `other`
- hashes optional reporter phone before storage
- stores a `rider_unavailable_reports` row for admin review
- never auto-suspends a rider from one report

## Privacy Model

- Public suggestions exclude rider phone and WhatsApp values.
- Public identity display is first-name-only.
- Full plate numbers are never public; the selected-rider verification sheet may show only a masked plate helper.
- Raw rider contact values are queried only server-side when creating the selected-rider handoff.
- Customer and reporter phone values are stored as server-side HMAC hashes.
- `RIDER_CONNECT_HASH_SECRET` should be set in staging and production as a server-only secret.
- If `RIDER_CONNECT_HASH_SECRET` is missing, the MVP falls back to `SUPABASE_SERVICE_ROLE_KEY`; rotating that fallback key changes future hashes and can reduce comparability with earlier hashes.
- Raw customer delivery address is not stored in first-class columns; contact intents store only minimal metadata and delivery area.
- No public user login is required for the MVP.

## Abuse Protection

Current Rider Connect limits are process-local and in-memory:

- rider applications: `5` per hour
- rider suggestions: `60` per 10 minutes per vendor-scope/client bucket
- rider contact handoffs: `5` per hour
- contact handoffs per vendor: `3` per hour
- same-rider contact cooldown: `1` per 5 minutes
- unavailable reports: `5` per hour
- unavailable reports for the same rider: `2` per hour

These limits protect a single app instance. A distributed limiter should replace them before high-volume production scaling.

## Database and Security

Rider Connect uses:

- `public.riders`
- `public.rider_contact_intents`
- `public.rider_unavailable_reports`

RLS is enabled on all three tables. Anon receives no direct table grants for rider data. Authenticated admin users receive RLS-gated access for admin review. Service-role access is retained for server routes that shape public-safe responses, insert applications, create contact intents, and receive unavailable reports.

Supabase Data API exposure remains explicit-grant only. Future rider-related migrations must grant only the minimum required object privileges and must not expose raw rider phone/WhatsApp fields to anon.

## QA Checklist

- Rider application page renders liability-safe independent-rider copy.
- A submitted application creates a hidden/pending rider only.
- Admin rider page is protected and visible only to admins with `riders:manage`.
- Public suggestions include only verified, visible, currently available riders, are capped at 3, and include no private fields.
- The selected-rider verification sheet shows masked plate values only and never exposes the full plate publicly.
- Contact handoff requires disclaimer acceptance and returns a WhatsApp URL only after a rider is selected.
- The public modal blocks incomplete contact or delivery details before rider selection so users see actionable copy instead of a raw validation error.
- Contact intent stores hashed customer phone and minimal metadata.
- Unavailable report stores hashed reporter phone when provided and remains admin-review-only.
- Copy tests reject payment, dispatch, courier, driver, and guarantee wording.
