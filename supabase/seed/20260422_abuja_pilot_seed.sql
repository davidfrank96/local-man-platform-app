begin;

insert into public.vendor_categories (id, name, slug)
values
  ('10000000-0000-4000-8000-000000000001', 'Breakfast', 'breakfast'),
  ('10000000-0000-4000-8000-000000000002', 'Lunch', 'lunch'),
  ('10000000-0000-4000-8000-000000000003', 'Dinner', 'dinner'),
  ('10000000-0000-4000-8000-000000000004', 'Late Night', 'late-night'),
  ('10000000-0000-4000-8000-000000000005', 'Rice', 'rice'),
  ('10000000-0000-4000-8000-000000000006', 'Swallow', 'swallow'),
  ('10000000-0000-4000-8000-000000000007', 'Grills', 'grills'),
  ('10000000-0000-4000-8000-000000000008', 'Snacks', 'snacks'),
  ('10000000-0000-4000-8000-000000000009', 'Drinks', 'drinks'),
  ('10000000-0000-4000-8000-000000000010', 'Budget Friendly', 'budget-friendly')
on conflict (slug) do update
set
  name = excluded.name;

insert into public.vendors (
  id,
  name,
  slug,
  short_description,
  phone_number,
  address_text,
  city,
  area,
  state,
  country,
  latitude,
  longitude,
  price_band,
  average_rating,
  review_count,
  is_active,
  is_open_override
)
values
  ('20000000-0000-4000-8000-000000000001', 'Wuse Morning Akara Stand', 'wuse-morning-akara-stand', 'Test breakfast vendor serving akara, pap, bread, and egg near Wuse offices.', '+2340000000000', 'Seed address near Wuse Market, Wuse, Abuja', 'Abuja', 'Wuse', 'FCT', 'Nigeria', 9.081300, 7.469400, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000002', 'Wuse Office Rice Pot', 'wuse-office-rice-pot', 'Test lunch vendor with rice plates for office workers in Wuse.', '+2340000000000', 'Seed address near Ademola Adetokunbo Crescent, Wuse, Abuja', 'Abuja', 'Wuse', 'FCT', 'Nigeria', 9.079600, 7.474200, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000003', 'Wuse Zobo and Snacks', 'wuse-zobo-and-snacks', 'Test snack and drink spot with zobo, puff-puff, and buns.', '+2340000000000', 'Seed address near Banex axis, Wuse, Abuja', 'Abuja', 'Wuse', 'FCT', 'Nigeria', 9.074800, 7.461500, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000004', 'Garki Amala Kitchen', 'garki-amala-kitchen', 'Test swallow vendor serving amala, ewedu, eba, and egusi in Garki.', '+2340000000000', 'Seed address near Area 10, Garki, Abuja', 'Abuja', 'Garki', 'FCT', 'Nigeria', 9.036200, 7.490500, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000005', 'Garki Night Suya', 'garki-night-suya', 'Test late-night grill spot for beef suya and chicken suya.', '+2340000000000', 'Seed address near Area 11, Garki, Abuja', 'Abuja', 'Garki', 'FCT', 'Nigeria', 9.042100, 7.501100, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000006', 'Garki Budget Beans Stop', 'garki-budget-beans-stop', 'Test budget meal vendor with beans, plantain, and local lunch plates.', '+2340000000000', 'Seed address near Garki International Market, Abuja', 'Abuja', 'Garki', 'FCT', 'Nigeria', 9.030900, 7.485700, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000007', 'Jabi Rice Corner', 'jabi-rice-corner', 'Test rice vendor serving jollof rice, fried rice, and chicken around Jabi.', '+2340000000000', 'Seed address near Jabi Lake Mall axis, Jabi, Abuja', 'Abuja', 'Jabi', 'FCT', 'Nigeria', 9.064300, 7.429100, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000008', 'Jabi Office Lunch Bowl', 'jabi-office-lunch-bowl', 'Test lunch bowl vendor with white rice, stew, and native rice.', '+2340000000000', 'Seed address near Jabi District offices, Abuja', 'Abuja', 'Jabi', 'FCT', 'Nigeria', 9.060600, 7.421900, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000009', 'Jabi Grill and Drinks', 'jabi-grill-and-drinks', 'Test evening grill and drinks vendor for casual dinner testing.', '+2340000000000', 'Seed address near Jabi Park axis, Abuja', 'Abuja', 'Jabi', 'FCT', 'Nigeria', 9.068500, 7.435200, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000010', 'Maitama Native Pot', 'maitama-native-pot', 'Test premium local food spot with pounded yam and native soups.', '+2340000000000', 'Seed address near Mississippi Street, Maitama, Abuja', 'Abuja', 'Maitama', 'FCT', 'Nigeria', 9.095400, 7.495100, 'premium', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000011', 'Maitama Lunch Canteen', 'maitama-lunch-canteen', 'Test standard lunch vendor serving rice and soups in Maitama.', '+2340000000000', 'Seed address near Ministers Hill, Maitama, Abuja', 'Abuja', 'Maitama', 'FCT', 'Nigeria', 9.089500, 7.487200, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000012', 'Guzape Grill Stop', 'guzape-grill-stop', 'Test evening grill vendor with fish, chicken, and suya in Guzape.', '+2340000000000', 'Seed address near Guzape District, Abuja', 'Abuja', 'Guzape', 'FCT', 'Nigeria', 9.004800, 7.519000, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000013', 'Guzape Neighborhood Kitchen', 'guzape-neighborhood-kitchen', 'Test neighborhood kitchen serving dinner plates and soups.', '+2340000000000', 'Seed address near Coza axis, Guzape, Abuja', 'Abuja', 'Guzape', 'FCT', 'Nigeria', 9.008900, 7.512400, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000014', 'Guzape Evening Rice', 'guzape-evening-rice', 'Test evening rice vendor serving jollof and fried rice.', '+2340000000000', 'Seed address near Guzape Hills, Abuja', 'Abuja', 'Guzape', 'FCT', 'Nigeria', 9.012700, 7.523200, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000015', 'Utako Transit Bites', 'utako-transit-bites', 'Test transit-friendly snacks and lunch vendor in Utako.', '+2340000000000', 'Seed address near Utako Motor Park, Abuja', 'Abuja', 'Utako', 'FCT', 'Nigeria', 9.069000, 7.446500, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000016', 'Utako Late Night Noodles', 'utako-late-night-noodles', 'Test late-night vendor serving noodles, eggs, and quick meals.', '+2340000000000', 'Seed address near Obafemi Awolowo Way, Utako, Abuja', 'Abuja', 'Utako', 'FCT', 'Nigeria', 9.066100, 7.451900, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000017', 'Utako Rice and Swallow', 'utako-rice-and-swallow', 'Test lunch vendor serving rice, eba, and egusi around Utako.', '+2340000000000', 'Seed address near Utako Market axis, Abuja', 'Abuja', 'Utako', 'FCT', 'Nigeria', 9.072300, 7.440800, 'standard', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000018', 'Lugbe Roadside Meals', 'lugbe-roadside-meals', 'Test roadside vendor with beans, bread, yam, and dinner plates.', '+2340000000000', 'Seed address near Lugbe FHA, Abuja', 'Abuja', 'Lugbe', 'FCT', 'Nigeria', 8.982700, 7.351000, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000019', 'Lugbe Breakfast Corner', 'lugbe-breakfast-corner', 'Test breakfast vendor with yam, egg, tea, and bread in Lugbe.', '+2340000000000', 'Seed address near Lugbe Federal Housing, Abuja', 'Abuja', 'Lugbe', 'FCT', 'Nigeria', 8.976900, 7.360800, 'budget', 0, 0, true, null),
  ('20000000-0000-4000-8000-000000000020', 'Lugbe Dinner Pot', 'lugbe-dinner-pot', 'Test dinner vendor serving rice, stew, and local soups in Lugbe.', '+2340000000000', 'Seed address near Lugbe Zone 5, Abuja', 'Abuja', 'Lugbe', 'FCT', 'Nigeria', 8.990400, 7.346800, 'budget', 0, 0, true, null)
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  phone_number = excluded.phone_number,
  address_text = excluded.address_text,
  city = excluded.city,
  area = excluded.area,
  state = excluded.state,
  country = excluded.country,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  price_band = excluded.price_band,
  average_rating = excluded.average_rating,
  review_count = excluded.review_count,
  is_active = excluded.is_active,
  is_open_override = excluded.is_open_override,
  updated_at = now();

delete from public.vendor_category_map
where vendor_id in (
  select id
  from public.vendors
  where slug in (
    'wuse-morning-akara-stand',
    'wuse-office-rice-pot',
    'wuse-zobo-and-snacks',
    'garki-amala-kitchen',
    'garki-night-suya',
    'garki-budget-beans-stop',
    'jabi-rice-corner',
    'jabi-office-lunch-bowl',
    'jabi-grill-and-drinks',
    'maitama-native-pot',
    'maitama-lunch-canteen',
    'guzape-grill-stop',
    'guzape-neighborhood-kitchen',
    'guzape-evening-rice',
    'utako-transit-bites',
    'utako-late-night-noodles',
    'utako-rice-and-swallow',
    'lugbe-roadside-meals',
    'lugbe-breakfast-corner',
    'lugbe-dinner-pot'
  )
);

with seed_category_map(vendor_slug, category_slug) as (
  values
    ('wuse-morning-akara-stand', 'breakfast'), ('wuse-morning-akara-stand', 'snacks'), ('wuse-morning-akara-stand', 'budget-friendly'),
    ('wuse-office-rice-pot', 'lunch'), ('wuse-office-rice-pot', 'rice'),
    ('wuse-zobo-and-snacks', 'drinks'), ('wuse-zobo-and-snacks', 'snacks'), ('wuse-zobo-and-snacks', 'budget-friendly'),
    ('garki-amala-kitchen', 'lunch'), ('garki-amala-kitchen', 'swallow'), ('garki-amala-kitchen', 'budget-friendly'),
    ('garki-night-suya', 'late-night'), ('garki-night-suya', 'grills'),
    ('garki-budget-beans-stop', 'lunch'), ('garki-budget-beans-stop', 'budget-friendly'),
    ('jabi-rice-corner', 'lunch'), ('jabi-rice-corner', 'dinner'), ('jabi-rice-corner', 'rice'),
    ('jabi-office-lunch-bowl', 'lunch'), ('jabi-office-lunch-bowl', 'rice'),
    ('jabi-grill-and-drinks', 'dinner'), ('jabi-grill-and-drinks', 'grills'), ('jabi-grill-and-drinks', 'drinks'),
    ('maitama-native-pot', 'lunch'), ('maitama-native-pot', 'dinner'), ('maitama-native-pot', 'swallow'),
    ('maitama-lunch-canteen', 'lunch'), ('maitama-lunch-canteen', 'rice'), ('maitama-lunch-canteen', 'swallow'),
    ('guzape-grill-stop', 'dinner'), ('guzape-grill-stop', 'grills'),
    ('guzape-neighborhood-kitchen', 'dinner'), ('guzape-neighborhood-kitchen', 'swallow'),
    ('guzape-evening-rice', 'dinner'), ('guzape-evening-rice', 'rice'), ('guzape-evening-rice', 'budget-friendly'),
    ('utako-transit-bites', 'snacks'), ('utako-transit-bites', 'lunch'), ('utako-transit-bites', 'budget-friendly'),
    ('utako-late-night-noodles', 'late-night'), ('utako-late-night-noodles', 'dinner'), ('utako-late-night-noodles', 'budget-friendly'),
    ('utako-rice-and-swallow', 'lunch'), ('utako-rice-and-swallow', 'rice'), ('utako-rice-and-swallow', 'swallow'),
    ('lugbe-roadside-meals', 'breakfast'), ('lugbe-roadside-meals', 'dinner'), ('lugbe-roadside-meals', 'budget-friendly'),
    ('lugbe-breakfast-corner', 'breakfast'), ('lugbe-breakfast-corner', 'budget-friendly'),
    ('lugbe-dinner-pot', 'dinner'), ('lugbe-dinner-pot', 'rice'), ('lugbe-dinner-pot', 'swallow')
)
insert into public.vendor_category_map (vendor_id, category_id)
select vendors.id, vendor_categories.id
from seed_category_map
join public.vendors on vendors.slug = seed_category_map.vendor_slug
join public.vendor_categories on vendor_categories.slug = seed_category_map.category_slug
on conflict (vendor_id, category_id) do nothing;

delete from public.vendor_hours
where vendor_id in (
  select id
  from public.vendors
  where slug in (
    'wuse-morning-akara-stand',
    'wuse-office-rice-pot',
    'wuse-zobo-and-snacks',
    'garki-amala-kitchen',
    'garki-night-suya',
    'garki-budget-beans-stop',
    'jabi-rice-corner',
    'jabi-office-lunch-bowl',
    'jabi-grill-and-drinks',
    'maitama-native-pot',
    'maitama-lunch-canteen',
    'guzape-grill-stop',
    'guzape-neighborhood-kitchen',
    'guzape-evening-rice',
    'utako-transit-bites',
    'utako-late-night-noodles',
    'utako-rice-and-swallow',
    'lugbe-roadside-meals',
    'lugbe-breakfast-corner',
    'lugbe-dinner-pot'
  )
);

with seed_hour_patterns(vendor_slug, pattern_name) as (
  values
    ('wuse-morning-akara-stand', 'breakfast'),
    ('wuse-office-rice-pot', 'lunch'),
    ('wuse-zobo-and-snacks', 'drinks_snacks'),
    ('garki-amala-kitchen', 'lunch'),
    ('garki-night-suya', 'late_night'),
    ('garki-budget-beans-stop', 'all_day'),
    ('jabi-rice-corner', 'dinner'),
    ('jabi-office-lunch-bowl', 'lunch'),
    ('jabi-grill-and-drinks', 'drinks_snacks'),
    ('maitama-native-pot', 'dinner'),
    ('maitama-lunch-canteen', 'lunch'),
    ('guzape-grill-stop', 'late_night'),
    ('guzape-neighborhood-kitchen', 'dinner'),
    ('guzape-evening-rice', 'dinner'),
    ('utako-transit-bites', 'all_day'),
    ('utako-late-night-noodles', 'late_night'),
    ('utako-rice-and-swallow', 'lunch'),
    ('lugbe-roadside-meals', 'dinner'),
    ('lugbe-breakfast-corner', 'breakfast'),
    ('lugbe-dinner-pot', 'dinner')
),
weekly_hours as (
  select
    vendors.id as vendor_id,
    days.day_of_week,
    seed_hour_patterns.pattern_name,
    case
      when seed_hour_patterns.pattern_name = 'breakfast' and days.day_of_week between 1 and 5 then time '06:30'
      when seed_hour_patterns.pattern_name = 'breakfast' and days.day_of_week = 6 then time '07:00'
      when seed_hour_patterns.pattern_name = 'lunch' and days.day_of_week between 1 and 5 then time '10:30'
      when seed_hour_patterns.pattern_name = 'lunch' and days.day_of_week = 6 then time '11:00'
      when seed_hour_patterns.pattern_name = 'dinner' and days.day_of_week between 0 and 6 then time '17:00'
      when seed_hour_patterns.pattern_name = 'late_night' and days.day_of_week between 1 and 6 then time '18:00'
      when seed_hour_patterns.pattern_name = 'all_day' and days.day_of_week between 1 and 6 then time '08:00'
      when seed_hour_patterns.pattern_name = 'all_day' and days.day_of_week = 0 then time '10:00'
      when seed_hour_patterns.pattern_name = 'drinks_snacks' and days.day_of_week between 0 and 6 then time '10:00'
      else null
    end as open_time,
    case
      when seed_hour_patterns.pattern_name = 'breakfast' and days.day_of_week between 1 and 5 then time '11:30'
      when seed_hour_patterns.pattern_name = 'breakfast' and days.day_of_week = 6 then time '12:00'
      when seed_hour_patterns.pattern_name = 'lunch' and days.day_of_week between 1 and 5 then time '16:00'
      when seed_hour_patterns.pattern_name = 'lunch' and days.day_of_week = 6 then time '15:00'
      when seed_hour_patterns.pattern_name = 'dinner' and days.day_of_week between 1 and 6 then time '22:00'
      when seed_hour_patterns.pattern_name = 'dinner' and days.day_of_week = 0 then time '21:00'
      when seed_hour_patterns.pattern_name = 'late_night' and days.day_of_week between 1 and 6 then time '02:00'
      when seed_hour_patterns.pattern_name = 'all_day' and days.day_of_week between 1 and 6 then time '20:00'
      when seed_hour_patterns.pattern_name = 'all_day' and days.day_of_week = 0 then time '18:00'
      when seed_hour_patterns.pattern_name = 'drinks_snacks' and days.day_of_week between 0 and 6 then time '19:00'
      else null
    end as close_time
  from seed_hour_patterns
  join public.vendors on vendors.slug = seed_hour_patterns.vendor_slug
  cross join generate_series(0, 6) as days(day_of_week)
)
insert into public.vendor_hours (vendor_id, day_of_week, open_time, close_time, is_closed)
select
  vendor_id,
  day_of_week,
  open_time,
  close_time,
  open_time is null or close_time is null
from weekly_hours
order by vendor_id, day_of_week;

delete from public.vendor_featured_dishes
where vendor_id in (
  select id
  from public.vendors
  where slug in (
    'wuse-morning-akara-stand',
    'wuse-office-rice-pot',
    'wuse-zobo-and-snacks',
    'garki-amala-kitchen',
    'garki-night-suya',
    'garki-budget-beans-stop',
    'jabi-rice-corner',
    'jabi-office-lunch-bowl',
    'jabi-grill-and-drinks',
    'maitama-native-pot',
    'maitama-lunch-canteen',
    'guzape-grill-stop',
    'guzape-neighborhood-kitchen',
    'guzape-evening-rice',
    'utako-transit-bites',
    'utako-late-night-noodles',
    'utako-rice-and-swallow',
    'lugbe-roadside-meals',
    'lugbe-breakfast-corner',
    'lugbe-dinner-pot'
  )
);

with seed_dishes(id, vendor_slug, dish_name, description, image_url) as (
  values
    ('30000000-0000-4000-8000-000000000001'::uuid, 'wuse-morning-akara-stand', 'Akara and pap', 'Breakfast akara with pap.', '/seed-images/vendors/wuse-morning-akara-stand/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000002'::uuid, 'wuse-office-rice-pot', 'Jollof rice and chicken', 'Office lunch rice plate.', '/seed-images/vendors/wuse-office-rice-pot/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000003'::uuid, 'wuse-zobo-and-snacks', 'Zobo and puff-puff', 'Chilled zobo with puff-puff.', '/seed-images/vendors/wuse-zobo-and-snacks/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000004'::uuid, 'garki-amala-kitchen', 'Amala with ewedu', 'Amala served with ewedu and stew.', '/seed-images/vendors/garki-amala-kitchen/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000005'::uuid, 'garki-night-suya', 'Beef suya', 'Late-night beef suya.', '/seed-images/vendors/garki-night-suya/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000006'::uuid, 'garki-budget-beans-stop', 'Beans and plantain', 'Budget beans plate with plantain.', '/seed-images/vendors/garki-budget-beans-stop/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000007'::uuid, 'jabi-rice-corner', 'Fried rice and chicken', 'Fried rice plate with chicken.', '/seed-images/vendors/jabi-rice-corner/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000008'::uuid, 'jabi-office-lunch-bowl', 'White rice and stew', 'Lunch bowl with stew.', '/seed-images/vendors/jabi-office-lunch-bowl/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000009'::uuid, 'jabi-grill-and-drinks', 'Grilled chicken', 'Evening grilled chicken plate.', '/seed-images/vendors/jabi-grill-and-drinks/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000010'::uuid, 'maitama-native-pot', 'Pounded yam and vegetable soup', 'Pounded yam with native vegetable soup.', '/seed-images/vendors/maitama-native-pot/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000011'::uuid, 'maitama-lunch-canteen', 'Native rice', 'Native rice lunch plate.', '/seed-images/vendors/maitama-lunch-canteen/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000012'::uuid, 'guzape-grill-stop', 'Grilled fish', 'Evening grilled fish.', '/seed-images/vendors/guzape-grill-stop/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000013'::uuid, 'guzape-neighborhood-kitchen', 'Eba with egusi', 'Eba served with egusi soup.', '/seed-images/vendors/guzape-neighborhood-kitchen/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000014'::uuid, 'guzape-evening-rice', 'Evening jollof rice', 'Budget evening jollof rice.', '/seed-images/vendors/guzape-evening-rice/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000015'::uuid, 'utako-transit-bites', 'Meat pie and drink', 'Transit snack combo.', '/seed-images/vendors/utako-transit-bites/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000016'::uuid, 'utako-late-night-noodles', 'Noodles and egg', 'Late-night noodles with egg.', '/seed-images/vendors/utako-late-night-noodles/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000017'::uuid, 'utako-rice-and-swallow', 'Eba with egusi', 'Lunch swallow plate.', '/seed-images/vendors/utako-rice-and-swallow/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000018'::uuid, 'lugbe-roadside-meals', 'Beans and bread', 'Roadside beans and bread.', '/seed-images/vendors/lugbe-roadside-meals/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000019'::uuid, 'lugbe-breakfast-corner', 'Yam and egg', 'Breakfast yam and egg.', '/seed-images/vendors/lugbe-breakfast-corner/dish-1.jpg'),
    ('30000000-0000-4000-8000-000000000020'::uuid, 'lugbe-dinner-pot', 'Rice and stew', 'Dinner rice and stew.', '/seed-images/vendors/lugbe-dinner-pot/dish-1.jpg')
)
insert into public.vendor_featured_dishes (id, vendor_id, dish_name, description, image_url, is_featured)
select seed_dishes.id, vendors.id, seed_dishes.dish_name, seed_dishes.description, seed_dishes.image_url, true
from seed_dishes
join public.vendors on vendors.slug = seed_dishes.vendor_slug
on conflict (id) do update
set
  dish_name = excluded.dish_name,
  description = excluded.description,
  image_url = excluded.image_url,
  is_featured = excluded.is_featured,
  updated_at = now();

delete from public.vendor_images
where vendor_id in (
  select id
  from public.vendors
  where slug in (
    'wuse-morning-akara-stand',
    'wuse-office-rice-pot',
    'wuse-zobo-and-snacks',
    'garki-amala-kitchen',
    'garki-night-suya',
    'garki-budget-beans-stop',
    'jabi-rice-corner',
    'jabi-office-lunch-bowl',
    'jabi-grill-and-drinks',
    'maitama-native-pot',
    'maitama-lunch-canteen',
    'guzape-grill-stop',
    'guzape-neighborhood-kitchen',
    'guzape-evening-rice',
    'utako-transit-bites',
    'utako-late-night-noodles',
    'utako-rice-and-swallow',
    'lugbe-roadside-meals',
    'lugbe-breakfast-corner',
    'lugbe-dinner-pot'
  )
);

with seed_images(id, vendor_slug, image_url, sort_order) as (
  values
    ('40000000-0000-4000-8000-000000000001'::uuid, 'wuse-morning-akara-stand', '/seed-images/vendors/wuse-morning-akara-stand/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000002'::uuid, 'wuse-office-rice-pot', '/seed-images/vendors/wuse-office-rice-pot/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000003'::uuid, 'wuse-zobo-and-snacks', '/seed-images/vendors/wuse-zobo-and-snacks/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000004'::uuid, 'garki-amala-kitchen', '/seed-images/vendors/garki-amala-kitchen/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000005'::uuid, 'garki-night-suya', '/seed-images/vendors/garki-night-suya/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000006'::uuid, 'garki-budget-beans-stop', '/seed-images/vendors/garki-budget-beans-stop/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000007'::uuid, 'jabi-rice-corner', '/seed-images/vendors/jabi-rice-corner/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000008'::uuid, 'jabi-office-lunch-bowl', '/seed-images/vendors/jabi-office-lunch-bowl/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000009'::uuid, 'jabi-grill-and-drinks', '/seed-images/vendors/jabi-grill-and-drinks/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000010'::uuid, 'maitama-native-pot', '/seed-images/vendors/maitama-native-pot/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000011'::uuid, 'maitama-lunch-canteen', '/seed-images/vendors/maitama-lunch-canteen/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000012'::uuid, 'guzape-grill-stop', '/seed-images/vendors/guzape-grill-stop/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000013'::uuid, 'guzape-neighborhood-kitchen', '/seed-images/vendors/guzape-neighborhood-kitchen/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000014'::uuid, 'guzape-evening-rice', '/seed-images/vendors/guzape-evening-rice/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000015'::uuid, 'utako-transit-bites', '/seed-images/vendors/utako-transit-bites/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000016'::uuid, 'utako-late-night-noodles', '/seed-images/vendors/utako-late-night-noodles/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000017'::uuid, 'utako-rice-and-swallow', '/seed-images/vendors/utako-rice-and-swallow/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000018'::uuid, 'lugbe-roadside-meals', '/seed-images/vendors/lugbe-roadside-meals/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000019'::uuid, 'lugbe-breakfast-corner', '/seed-images/vendors/lugbe-breakfast-corner/cover.jpg', 0),
    ('40000000-0000-4000-8000-000000000020'::uuid, 'lugbe-dinner-pot', '/seed-images/vendors/lugbe-dinner-pot/cover.jpg', 0)
)
insert into public.vendor_images (id, vendor_id, image_url, sort_order)
select seed_images.id, vendors.id, seed_images.image_url, seed_images.sort_order
from seed_images
join public.vendors on vendors.slug = seed_images.vendor_slug
on conflict (id) do update
set
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

commit;
