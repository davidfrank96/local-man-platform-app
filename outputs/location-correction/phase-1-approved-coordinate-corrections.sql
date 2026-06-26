-- Localman Phase 1 coordinate correction execution
-- Approved operational update.
-- Scope: 2 APPROVED_CANDIDATE rows + 18 REVIEW_REQUIRED rows approved by product owner.
-- Excludes 5 REVISIT_REQUIRED rows.
-- Only latitude and longitude are set by this script.
-- Each UPDATE is guarded by slug + previous latitude + previous longitude.

begin;

create temporary table phase1_coordinate_updates (
  slug text primary key,
  old_latitude numeric,
  old_longitude numeric,
  new_latitude numeric,
  new_longitude numeric,
  approval_status text
) on commit drop;

insert into phase1_coordinate_updates (
  slug,
  old_latitude,
  old_longitude,
  new_latitude,
  new_longitude,
  approval_status
)
values
  ('afaihat', 9.057900::numeric, 7.495100::numeric, 9.074458::numeric, 7.443211::numeric, 'REVIEW APPROVED'),
  ('awashe-suya-spot', 9.057900::numeric, 7.495100::numeric, 9.069196::numeric, 7.441154::numeric, 'APPROVED'),
  ('bianns-cuisine', 9.057900::numeric, 7.495100::numeric, 9.062046::numeric, 7.466555::numeric, 'REVIEW APPROVED'),
  ('blessed-kitchen', 9.057900::numeric, 7.495100::numeric, 9.073458::numeric, 7.472005::numeric, 'REVIEW APPROVED'),
  ('blessing', 9.057900::numeric, 7.495100::numeric, 9.074458::numeric, 7.443211::numeric, 'REVIEW APPROVED'),
  ('correctchow', 9.057900::numeric, 7.495100::numeric, 9.079649::numeric, 7.470913::numeric, 'APPROVED'),
  ('idoma-kitchen', 9.057900::numeric, 7.495100::numeric, 9.073458::numeric, 7.472005::numeric, 'REVIEW APPROVED'),
  ('laraba', 9.057900::numeric, 7.495100::numeric, 9.062046::numeric, 7.466555::numeric, 'REVIEW APPROVED'),
  ('madam-cash', 9.057900::numeric, 7.495100::numeric, 9.045927::numeric, 7.522983::numeric, 'REVIEW APPROVED'),
  ('madam-yam', 9.057900::numeric, 7.495100::numeric, 9.062046::numeric, 7.466555::numeric, 'REVIEW APPROVED'),
  ('mama-amira', 9.057900::numeric, 7.495100::numeric, 9.045927::numeric, 7.522983::numeric, 'REVIEW APPROVED'),
  ('mama-bole', 9.057900::numeric, 7.495100::numeric, 9.075436::numeric, 7.422227::numeric, 'REVIEW APPROVED'),
  ('mama-food', 9.057900::numeric, 7.495100::numeric, 9.064331::numeric, 7.489297::numeric, 'REVIEW APPROVED'),
  ('mme-fura', 9.057900::numeric, 7.495100::numeric, 9.045927::numeric, 7.522983::numeric, 'REVIEW APPROVED'),
  ('native-hut', 9.057900::numeric, 7.495100::numeric, 9.063691::numeric, 7.477501::numeric, 'REVIEW APPROVED'),
  ('ozis-snacks-drinks-and-fast-food', 9.057900::numeric, 7.495100::numeric, 9.063691::numeric, 7.477501::numeric, 'REVIEW APPROVED'),
  ('salisu-suya-and-grill-spot', 9.057900::numeric, 7.495100::numeric, 9.079649::numeric, 7.470913::numeric, 'REVIEW APPROVED'),
  ('special-abacha', 9.057900::numeric, 7.495100::numeric, 9.062046::numeric, 7.466555::numeric, 'REVIEW APPROVED'),
  ('tina-rimke-dada', 9.057900::numeric, 7.495100::numeric, 9.064623::numeric, 7.421007::numeric, 'REVIEW APPROVED'),
  ('uche-best-tasty-meal', 9.057900::numeric, 7.495100::numeric, 9.074458::numeric, 7.443211::numeric, 'REVIEW APPROVED');

create temporary table phase1_vendor_before_snapshot as
select
  v.id,
  v.name,
  v.slug,
  v.short_description,
  v.phone_number,
  v.address_text,
  v.city,
  v.area,
  v.state,
  v.country,
  v.price_band,
  v.average_rating,
  v.review_count,
  v.is_active,
  v.is_open_override
from public.vendors v
join phase1_coordinate_updates u on u.slug = v.slug;

do $$
declare
  guard_match_count integer;
begin
  select count(*)
  into guard_match_count
  from public.vendors v
  join phase1_coordinate_updates u
    on u.slug = v.slug
   and v.latitude = u.old_latitude
   and v.longitude = u.old_longitude;

  if guard_match_count <> 20 then
    raise exception 'Phase 1 coordinate preflight failed: expected 20 guarded matches, got %', guard_match_count;
  end if;
end $$;

-- 1. Afaihat (afaihat) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.074458, 7.443211; distance moved: 5.99 km
update public.vendors
set latitude = 9.074458,
    longitude = 7.443211
where slug = 'afaihat'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 2. Awashe suya spot (awashe-suya-spot) - APPROVED
-- old: 9.057900, 7.495100; new: 9.069196, 7.441154; distance moved: 6.06 km
update public.vendors
set latitude = 9.069196,
    longitude = 7.441154
where slug = 'awashe-suya-spot'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 3. Bianns Cuisine (bianns-cuisine) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.062046, 7.466555; distance moved: 3.17 km
update public.vendors
set latitude = 9.062046,
    longitude = 7.466555
where slug = 'bianns-cuisine'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 4. Blessed Kitchen (blessed-kitchen) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.073458, 7.472005; distance moved: 3.07 km
update public.vendors
set latitude = 9.073458,
    longitude = 7.472005
where slug = 'blessed-kitchen'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 5. Blessing (blessing) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.074458, 7.443211; distance moved: 5.99 km
update public.vendors
set latitude = 9.074458,
    longitude = 7.443211
where slug = 'blessing'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 6. CorrectChow (correctchow) - APPROVED
-- old: 9.057900, 7.495100; new: 9.079649, 7.470913; distance moved: 3.59 km
update public.vendors
set latitude = 9.079649,
    longitude = 7.470913
where slug = 'correctchow'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 7. Idoma Kitchen (idoma-kitchen) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.073458, 7.472005; distance moved: 3.07 km
update public.vendors
set latitude = 9.073458,
    longitude = 7.472005
where slug = 'idoma-kitchen'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 8. Laraba (laraba) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.062046, 7.466555; distance moved: 3.17 km
update public.vendors
set latitude = 9.062046,
    longitude = 7.466555
where slug = 'laraba'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 9. Madam Cash (madam-cash) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.045927, 7.522983; distance moved: 3.34 km
update public.vendors
set latitude = 9.045927,
    longitude = 7.522983
where slug = 'madam-cash'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 10. madam yam (madam-yam) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.062046, 7.466555; distance moved: 3.17 km
update public.vendors
set latitude = 9.062046,
    longitude = 7.466555
where slug = 'madam-yam'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 11. Mama Amira (mama-amira) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.045927, 7.522983; distance moved: 3.34 km
update public.vendors
set latitude = 9.045927,
    longitude = 7.522983
where slug = 'mama-amira'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 12. Mama Bole (mama-bole) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.075436, 7.422227; distance moved: 8.24 km
update public.vendors
set latitude = 9.075436,
    longitude = 7.422227
where slug = 'mama-bole'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 13. Mama food (mama-food) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.064331, 7.489297; distance moved: 0.96 km
update public.vendors
set latitude = 9.064331,
    longitude = 7.489297
where slug = 'mama-food'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 14. Mme Fura (mme-fura) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.045927, 7.522983; distance moved: 3.34 km
update public.vendors
set latitude = 9.045927,
    longitude = 7.522983
where slug = 'mme-fura'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 15. Native Hut (native-hut) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.063691, 7.477501; distance moved: 2.04 km
update public.vendors
set latitude = 9.063691,
    longitude = 7.477501
where slug = 'native-hut'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 16. Ozis Snacks, drinks and fast-food (ozis-snacks-drinks-and-fast-food) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.063691, 7.477501; distance moved: 2.04 km
update public.vendors
set latitude = 9.063691,
    longitude = 7.477501
where slug = 'ozis-snacks-drinks-and-fast-food'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 17. Salisu Suya and grill Spot (salisu-suya-and-grill-spot) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.079649, 7.470913; distance moved: 3.59 km
update public.vendors
set latitude = 9.079649,
    longitude = 7.470913
where slug = 'salisu-suya-and-grill-spot'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 18. special Abacha (special-abacha) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.062046, 7.466555; distance moved: 3.17 km
update public.vendors
set latitude = 9.062046,
    longitude = 7.466555
where slug = 'special-abacha'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 19. Tina Rimke dada (tina-rimke-dada) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.064623, 7.421007; distance moved: 8.17 km
update public.vendors
set latitude = 9.064623,
    longitude = 7.421007
where slug = 'tina-rimke-dada'
  and latitude = 9.057900
  and longitude = 7.495100;

-- 20. UCHE BEST TASTY MEAL (uche-best-tasty-meal) - REVIEW APPROVED
-- old: 9.057900, 7.495100; new: 9.074458, 7.443211; distance moved: 5.99 km
update public.vendors
set latitude = 9.074458,
    longitude = 7.443211
where slug = 'uche-best-tasty-meal'
  and latitude = 9.057900
  and longitude = 7.495100;

do $$
declare
  updated_count integer;
  profile_changed_count integer;
  outside_bounds_count integer;
begin
  select count(*)
  into updated_count
  from public.vendors v
  join phase1_coordinate_updates u
    on u.slug = v.slug
   and v.latitude = u.new_latitude
   and v.longitude = u.new_longitude;

  if updated_count <> 20 then
    raise exception 'Phase 1 coordinate update failed: expected 20 updated rows, got %', updated_count;
  end if;

  select count(*)
  into profile_changed_count
  from public.vendors v
  join phase1_vendor_before_snapshot b on b.id = v.id
  where
    v.name is distinct from b.name
    or v.slug is distinct from b.slug
    or v.short_description is distinct from b.short_description
    or v.phone_number is distinct from b.phone_number
    or v.address_text is distinct from b.address_text
    or v.city is distinct from b.city
    or v.area is distinct from b.area
    or v.state is distinct from b.state
    or v.country is distinct from b.country
    or v.price_band is distinct from b.price_band
    or v.average_rating is distinct from b.average_rating
    or v.review_count is distinct from b.review_count
    or v.is_active is distinct from b.is_active
    or v.is_open_override is distinct from b.is_open_override;

  if profile_changed_count <> 0 then
    raise exception 'Phase 1 coordinate update touched non-coordinate vendor fields for % rows', profile_changed_count;
  end if;

  select count(*)
  into outside_bounds_count
  from public.vendors v
  join phase1_coordinate_updates u on u.slug = v.slug
  where v.latitude < 8.2
     or v.latitude > 9.4
     or v.longitude < 6.7
     or v.longitude > 7.8;

  if outside_bounds_count <> 0 then
    raise exception 'Phase 1 coordinate update moved % rows outside Abuja/FCT audit bounds', outside_bounds_count;
  end if;
end $$;

commit;
