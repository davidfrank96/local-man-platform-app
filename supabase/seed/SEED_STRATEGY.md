# The Local Man — Abuja Seed Strategy

## Goal

Create realistic Abuja pilot seed data so the public map, vendor cards, filters, vendor detail pages, and admin review workflows can be tested before live vendor onboarding.

This strategy defines the data shape and quality bar. The current SQL seed implementation is:
- `supabase/seed/20260422_abuja_pilot_seed.sql`

## Seed Target

- Internal testing: 20 to 30 vendors.
- Pilot readiness: 50 to 100 vendors.
- Geography: Abuja only.
- Initial areas: Guzape, Wuse, Garki, Jabi, Maitama, Utako, and Lugbe.

## Data Quality Rules

- Use realistic but clearly non-production vendor records until actual vendor permission is available.
- Do not use real phone numbers unless they belong to approved pilot vendors.
- Use plausible Abuja addresses and coordinates that place vendors inside their stated area.
- Every vendor must have at least one category, one featured dish, one image placeholder, weekly hours, and a rating placeholder.
- Keep vendor slugs lowercase and hyphenated.
- Keep price bands consistent across all seed data.
- Mark questionable records as inactive instead of deleting them, so admin visibility workflows can be tested.

## Price Bands

Use these values in `vendors.price_band`:

- `budget`
- `standard`
- `premium`

## Core Categories

Seed these categories first:

| Name | Slug | Notes |
| --- | --- | --- |
| Breakfast | `breakfast` | Akara, pap, tea, bread, yam, egg, early morning meals. |
| Lunch | `lunch` | Rice, swallow, soups, beans, stews, office lunch spots. |
| Dinner | `dinner` | Evening meals and regular neighborhood food spots. |
| Late Night | `late-night` | Night food spots and vendors open beyond standard hours. |
| Rice | `rice` | Jollof, fried rice, white rice, native rice. |
| Swallow | `swallow` | Amala, eba, semo, pounded yam, soups. |
| Grills | `grills` | Suya, grilled fish, chicken, asun. |
| Snacks | `snacks` | Small chops, puff-puff, meat pie, buns. |
| Drinks | `drinks` | Zobo, kunu, smoothies, soft drinks. |
| Budget Friendly | `budget-friendly` | Low-cost local meals. |

## Vendor Record Template

Each vendor seed record must map to the Phase 1 schema:

```json
{
  "name": "Example Area Food Spot",
  "slug": "example-area-food-spot",
  "phone_number": "+2340000000000",
  "area": "Wuse",
  "address_text": "Example address, Wuse, Abuja",
  "city": "Abuja",
  "state": "FCT",
  "country": "Nigeria",
  "latitude": 9.0765,
  "longitude": 7.3986,
  "price_band": "budget",
  "short_description": "Local breakfast and lunch vendor near offices.",
  "average_rating": 0,
  "review_count": 0,
  "is_active": true,
  "is_open_override": null
}
```

## Initial Vendor Mix

Use this distribution for the first 20 to 30 vendors:

| Area | Target Count | Vendor Mix |
| --- | ---: | --- |
| Wuse | 4-5 | Lunch spots, rice vendors, snacks, office breakfast. |
| Garki | 4-5 | Swallow spots, rice vendors, grills, budget meals. |
| Jabi | 3-4 | Lunch, dinner, grills, drinks. |
| Maitama | 2-3 | Standard and premium local food options. |
| Guzape | 2-3 | Neighborhood kitchens, dinner, grills. |
| Utako | 3-4 | Transit-friendly meals, snacks, rice, late-night options. |
| Lugbe | 3-4 | Budget meals, breakfast, dinner, roadside vendors. |

## Sample Vendor Concepts

Use these as concept seeds. Names should remain clearly test-data unless replaced with approved real vendors.

| Concept Name | Area | Price Band | Categories | Featured Dish Ideas |
| --- | --- | --- | --- | --- |
| Wuse Morning Akara Stand | Wuse | budget | Breakfast, Snacks, Budget Friendly | Akara and pap, bread and egg. |
| Garki Amala Kitchen | Garki | budget | Lunch, Swallow, Budget Friendly | Amala with ewedu, eba with egusi. |
| Jabi Rice Corner | Jabi | standard | Lunch, Dinner, Rice | Jollof rice, fried rice and chicken. |
| Maitama Native Pot | Maitama | premium | Lunch, Dinner, Swallow | Pounded yam and vegetable soup. |
| Guzape Grill Stop | Guzape | standard | Dinner, Grills | Grilled fish, chicken suya. |
| Utako Transit Bites | Utako | budget | Snacks, Lunch, Budget Friendly | Meat pie, jollof rice pack. |
| Lugbe Roadside Meals | Lugbe | budget | Breakfast, Dinner, Budget Friendly | Beans and bread, yam and egg. |
| Wuse Zobo and Snacks | Wuse | budget | Drinks, Snacks | Zobo, puff-puff. |
| Garki Night Suya | Garki | standard | Late Night, Grills | Beef suya, chicken suya. |
| Jabi Office Lunch Bowl | Jabi | standard | Lunch, Rice | White rice and stew, native rice. |

## Operating Hours Patterns

Use full weekly `vendor_hours` records for every vendor.

### Breakfast Vendor

- Monday to Friday: `06:30` to `11:30`
- Saturday: `07:00` to `12:00`
- Sunday: closed

### Office Lunch Vendor

- Monday to Friday: `10:30` to `16:00`
- Saturday: `11:00` to `15:00`
- Sunday: closed

### Dinner Vendor

- Monday to Saturday: `17:00` to `22:00`
- Sunday: `17:00` to `21:00`

### Late-Night Vendor

- Monday to Saturday: `18:00` to `02:00`
- Sunday: closed

This intentionally tests overnight open-now logic.

## Featured Dish Rules

- Add at least one featured dish per vendor.
- Add two or three dishes for vendors used heavily in UI testing.
- Keep names short and recognizable.
- Use `is_featured = true` for MVP seed dishes.

Example dishes:

- Akara and pap
- Jollof rice and chicken
- White rice and stew
- Amala with ewedu
- Eba with egusi
- Grilled fish
- Beef suya
- Beans and plantain
- Yam and egg
- Zobo

## Image Placeholder Rules

Use placeholder paths until approved vendor images exist.

Recommended placeholder pattern:

```text
/seed-images/vendors/{vendor-slug}/cover.jpg
/seed-images/vendors/{vendor-slug}/dish-1.jpg
```

Rules:

- Every vendor gets at least one `vendor_images` row.
- Every heavily tested vendor gets one cover image and one dish image.
- Do not use unlicensed real vendor photos.
- Replace placeholders with Supabase Storage URLs after upload workflow exists.

## Ratings Placeholder Rules

- Set `average_rating = 0` and `review_count = 0` for new test vendors unless curated rating data exists.
- Seed `ratings` only when testing rating display or aggregation.
- If ratings are seeded, use `source_type = 'admin_seed'`.

## Admin Seed Data

Admin users are managed through Supabase Auth. Do not seed real admin credentials in SQL.

For local testing:

- Create the admin auth user through Supabase Auth tooling.
- Insert a matching `admin_users` row using the auth user id.
- Use `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` from local environment values only.

## Seed File Plan

Current Phase 2 runtime validation uses one idempotent seed file:

```text
supabase/seed/20260422_abuja_pilot_seed.sql
```

Future seed expansion may split data by responsibility:

```text
supabase/seed/
  SEED_STRATEGY.md
  categories.sql
  vendors.sql
  vendor_hours.sql
  vendor_category_map.sql
  vendor_featured_dishes.sql
  vendor_images.sql
  ratings.sql
  admin_users.local.sql
```

Keep `admin_users.local.sql` out of production workflows.

## Validation Checklist

Before accepting seed data:

- Every vendor has a valid slug.
- Every vendor has valid Abuja coordinates.
- Every vendor belongs to one of the initial focus areas unless intentionally testing out-of-area behavior.
- Every active vendor has one or more categories.
- Every active vendor has weekly hours.
- Every active vendor has at least one featured dish.
- Every active vendor has at least one image placeholder.
- Phone numbers are approved real numbers or obvious non-production placeholders.
- No seed data introduces delivery, payment, login, chat, loyalty, coupons, inventory, or other out-of-scope features.
