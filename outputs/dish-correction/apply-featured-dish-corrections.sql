-- Localman featured dish correction draft
-- DO NOT EXECUTE until product owner approval is complete.
-- Regenerated after source workbook reconciliation.
-- Includes SOURCE_CONFIRMED rows only.
-- It intentionally ends with ROLLBACK for safety.

begin;

-- Adamu kilishi (adamu-kilishi)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 14; match=source_evidence_row
-- Current: Kilishi, pepper meat and Danguru | Kilishi, pepper meat and Danguru | Kilishi, pepper meat and Danguru
-- Proposed: Kilishi, pepper meat and Danguru |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '681be045-3fb0-4afb-a799-006d040f42db'
  and vendor.slug = 'adamu-kilishi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Kilishi, pepper meat and Danguru', 'Kilishi upward Danguru( grounded meat, Chicken and Beef) From N2,500-25,000. Suya pepper N4,000 upward.', null, true
from public.vendors as vendor
where vendor.id = '681be045-3fb0-4afb-a799-006d040f42db'
  and vendor.slug = 'adamu-kilishi';

-- ADAMU SPECIAL KILISHI (adamu-special-kilishi)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 13; match=source_evidence_row
-- Current: Kilishi, Ram, Suya, Chicken suya Goat Suya etc. | Kilishi, Ram, Suya, Chicken suya Goat Suya etc. | Kilishi, Ram, Suya, Chicken suya Goat Suya etc.
-- Proposed: Kilishi, Ram, Suya, Chicken suya Goat Suya etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '2464ed10-13c7-4cf2-8d12-d72d16619d47'
  and vendor.slug = 'adamu-special-kilishi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Kilishi, Ram, Suya, Chicken suya Goat Suya etc.', 'Special dried Kilishi, Suya Dambu, Nama, Ram, Goat meat, and Chicken suya', null, true
from public.vendors as vendor
where vendor.id = '2464ed10-13c7-4cf2-8d12-d72d16619d47'
  and vendor.slug = 'adamu-special-kilishi';

-- Afaihat (afaihat)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 15; match=source_evidence_row
-- Current: moi moi catfish pepper soup, cow head etc. | moi moi catfish pepper soup, cow head etc. | moi moi catfish pepper soup, cow head etc.
-- Proposed: moi moi catfish pepper soup, cow head etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'e14f4436-99b5-4cef-b40f-f5d098c387d3'
  and vendor.slug = 'afaihat';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'moi moi catfish pepper soup, cow head etc.', 'Rice and stew, semo, garri, Apu, Ewedu, gbegiri, beans soup, vegetable soup, okro, pounded yam etc.', null, true
from public.vendors as vendor
where vendor.id = 'e14f4436-99b5-4cef-b40f-f5d098c387d3'
  and vendor.slug = 'afaihat';

-- Ahjiah (ahjiah)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 19; match=source_evidence_row
-- Current: yam, potato, Akara, pap and bread etc. | yam, potato, Akara, pap and bread etc. | yam, potato, Akara, pap and bread etc.
-- Proposed: yam, potato, Akara, pap and bread etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '5a79d518-3ff9-4065-876f-0715955f4fe5'
  and vendor.slug = 'ahjiah';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, potato, Akara, pap and bread etc.', 'Akara pap white rice and stew from 1,000 jollof rice 1,000 without meat, with meat is 1,300 moi moi 200 Awara N50 sweet potatoes N50 Tuwoshinkaf N500 kunu ngeda N300 yam N100 etc.', null, true
from public.vendors as vendor
where vendor.id = '5a79d518-3ff9-4065-876f-0715955f4fe5'
  and vendor.slug = 'ahjiah';

-- Alice kitchen (alice-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 8; match=source_evidence_row
-- Current: Rice plantain, beans and ofaku | Rice plantain, beans and ofaku | Rice plantain, beans and ofaku
-- Proposed: Rice plantain, beans and ofaku |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '0ca3a819-0918-4158-b8be-c04d4fb8afcb'
  and vendor.slug = 'alice-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice plantain, beans and ofaku', 'White Rice, porridge beans, fried plantain, Soup: Oha, Afang, vegetable soup, Egusi Banger soup etc. Swallow: Apu garri, Semo,Wheat etc. ranging from', null, true
from public.vendors as vendor
where vendor.id = '0ca3a819-0918-4158-b8be-c04d4fb8afcb'
  and vendor.slug = 'alice-kitchen';

-- Anambra Kitchen (anambra-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 3; match=source_evidence_row
-- Current: Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi.
-- Proposed: Jollof rice, rice and stew, swallow and soup, Moi Moi. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'fda9a847-919a-4a49-ac37-1ba0d636f97d'
  and vendor.slug = 'anambra-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Jollof rice, rice and stew, swallow and soup, Moi Moi.', 'Rice and stew with meat, jollof Rice and plantain with salad. Swallow Garri,Apu Semo, Wheat, and poundo. Soup: Vegetable, Egusi,oha, bitter leaf, Ogbono Okro etc.', null, true
from public.vendors as vendor
where vendor.id = 'fda9a847-919a-4a49-ac37-1ba0d636f97d'
  and vendor.slug = 'anambra-kitchen';

-- Ann's kitchen (ann-s-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 5; match=source_evidence_row
-- Current: Indomie/egg, cooked yam and porridge beans etc. | Indomie/egg, cooked yam and porridge beans etc. | Indomie/egg, cooked yam and porridge beans etc.
-- Proposed: Indomie/egg, cooked yam and porridge beans etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '500de36e-7f25-4042-b485-f9595cf696e3'
  and vendor.slug = 'ann-s-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Indomie/egg, cooked yam and porridge beans etc.', 'Indomie and 2eggs N1,500 cooked yam and porridge beans N1,500 Swallow: Apu, garri and Semo with Soup N1,200-1,500 All kinds of Soft Drinks', null, true
from public.vendors as vendor
where vendor.id = '500de36e-7f25-4042-b485-f9595cf696e3'
  and vendor.slug = 'ann-s-kitchen';

-- Aunty Indomie (aunty-indomie)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 56; match=source_evidence_row
-- Current: Drinks, spaghetti, Indomie, and egg | Drinks, spaghetti, Indomie, and egg | Drinks, spaghetti, Indomie, and egg
-- Proposed: Drinks, spaghetti, Indomie, and egg |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '91a35c50-b955-42fd-ae64-a60a9bf70169'
  and vendor.slug = 'aunty-indomie';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Drinks, spaghetti, Indomie, and egg', 'Indomie and 2eggs N2,000-2500 Jollof spaghetti a plate with Beef N2,500 Drinks: Energy drink,Fearless, Maltina, Bottle water, Fanta and coke price', null, true
from public.vendors as vendor
where vendor.id = '91a35c50-b955-42fd-ae64-a60a9bf70169'
  and vendor.slug = 'aunty-indomie';

-- Awashe suya spot (awashe-suya-spot)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 19; match=source_evidence_row
-- Current: suya, kidney, liver, chicken, kilishi etc. | suya, kidney, liver, chicken, kilishi etc. | suya, kidney, liver, chicken, kilishi etc.
-- Proposed: suya, kidney, liver, chicken, kilishi etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '6817223e-4de1-425f-9483-a13619572fc6'
  and vendor.slug = 'awashe-suya-spot';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'suya, kidney, liver, chicken, kilishi etc.', 'Suya,Gizzard, full grilled/ roasted suya,kidney, liver kilishi etc', null, true
from public.vendors as vendor
where vendor.id = '6817223e-4de1-425f-9483-a13619572fc6'
  and vendor.slug = 'awashe-suya-spot';

-- Baba Suya (baba-suya)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 75; match=source_evidence_row
-- Current: Roasted Suya and roasted Chicken | Roasted Suya and roasted Chicken | Roasted Suya and roasted Chicken
-- Proposed: Roasted Suya and roasted Chicken |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '00bb8e6e-0a6a-46dd-9bb8-b18213f78982'
  and vendor.slug = 'baba-suya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted Suya and roasted Chicken', 'Ram Suya N1,000 upward, Full roasted local chicken N7,500', null, true
from public.vendors as vendor
where vendor.id = '00bb8e6e-0a6a-46dd-9bb8-b18213f78982'
  and vendor.slug = 'baba-suya';

-- Blessing indomie (blessing-indomie)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 2; match=source_evidence_row
-- Current: indomie,Egg,Coconut Rice and Beef. | indomie,Egg,Coconut Rice and Beef. | indomie,Egg,Coconut Rice and Beef.
-- Proposed: indomie,Egg,Coconut Rice and Beef. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '0c3fc024-fe2e-4144-9f9f-e853de9f32cf'
  and vendor.slug = 'blessing-indomie';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'indomie,Egg,Coconut Rice and Beef.', 'indomie and egg N1500-2,000 with coconut Rice with Beef N2,000', null, true
from public.vendors as vendor
where vendor.id = '0c3fc024-fe2e-4144-9f9f-e853de9f32cf'
  and vendor.slug = 'blessing-indomie';

-- Blessing Smoothie (blessing-smoothie)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 64; match=source_evidence_row
-- Current: Fruit juice like pineapple juice, Tiger nut etc. | Fruit juice like pineapple juice, Tiger nut etc. | Fruit juice like pineapple juice, Tiger nut etc.
-- Proposed: Fruit juice like pineapple juice, Tiger nut etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'aaf044aa-4d7a-489a-b6b8-a7a19edbbb68'
  and vendor.slug = 'blessing-smoothie';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fruit juice like pineapple juice, Tiger nut etc.', 'Orange juice, pineapple juice, watermelon juice, Tiger nut drink, strawberry( banana,showershub, pineapple and Date) Avocado, cucumber, banana, pineapple and Date Watermelon, beetroot,banana, pineapple, and date. prices , 2,500-3000.', null, true
from public.vendors as vendor
where vendor.id = 'aaf044aa-4d7a-489a-b6b8-a7a19edbbb68'
  and vendor.slug = 'blessing-smoothie';

-- Calabar kitchen (calabar-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 39; match=source_evidence_row
-- Current: Rice and stew with beans, Swallow and Soup. | Rice and stew with beans, Swallow and Soup. | Rice and stew with beans, Swallow and Soup.
-- Proposed: Rice, beans, yam, plantain, Afang soup etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '25b4fbfd-7cd2-4c6f-bf60-39de95cf3704'
  and vendor.slug = 'calabar-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans, yam, plantain, Afang soup etc.', 'Rice and stew with plantain and fish N2,000 jollof with salad with meat N1,500 Soup: Afang with any Swallow N2,500 Vegetable with any Swallow N2,500 White soup and pounded yam N3,000 Banger soup and Swallow on order....', null, true
from public.vendors as vendor
where vendor.id = '25b4fbfd-7cd2-4c6f-bf60-39de95cf3704'
  and vendor.slug = 'calabar-kitchen';

-- Chi joy Catherine Services (chi-joy-catherine-services)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 5; match=source_evidence_row
-- Current: Bottle water, fanta, coke, Sprite, bones, puff puff, etc. | Bottle water, fanta, coke, Sprite, bones, puff puff, etc. | Bottle water, fanta, coke, Sprite, bones, puff puff, etc.
-- Proposed: Bottle water, fanta, coke, Sprite, bones, puff puff, etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '48d50c50-457d-4590-9fc3-f15f2d3425d8'
  and vendor.slug = 'chi-joy-catherine-services';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Bottle water, fanta, coke, Sprite, bones, puff puff, etc.', 'Meat pie N1000, Egg Roll N700, Cake,N1000-5000,000 Including wedding cakes, bread N300, Drinks: Cern malt, Tiger nut, zono, fruit juice, Minerals', null, true
from public.vendors as vendor
where vendor.id = '48d50c50-457d-4590-9fc3-f15f2d3425d8'
  and vendor.slug = 'chi-joy-catherine-services';

-- China (china)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 55; match=source_evidence_row
-- Current: Rice, beans, yam, fried plantain, Agidi and pepper soup, swallow and soup. | Rice, beans, yam, fried plantain, Agidi and pepper soup, swallow and soup. | Rice, beans, yam, fried plantain, Agidi and pepper soup, swallow and soup.
-- Proposed: Rice, beans, yam, fried plantain, Agidi and pepper soup, swallow and soup. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '0452ff70-0a8b-4fa2-87d9-b8c29027b73a'
  and vendor.slug = 'china';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans, yam, fried plantain, Agidi and pepper soup, swallow and soup.', 'Rice and stew beans and meat N1,200 jollof with salad and meat N1,500 Swallow; Semo, Apu, garri Soup; Vegetable, Egusi, ogbono, Banger N1,500. Goat meat pepper soup with Agidi N1,500 fried Chicken,egg, roasted yam and plantain. porridge beans and yam N1,000', null, true
from public.vendors as vendor
where vendor.id = '0452ff70-0a8b-4fa2-87d9-b8c29027b73a'
  and vendor.slug = 'china';

-- Chizzy African food (chizzy-african-food)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 6; match=source_evidence_row
-- Current: oha, Egusi, biterleaf, okro, Afang, white soup, banker Stew etc | oha, Egusi, biterleaf, okro, Afang, white soup, banker Stew etc | oha, Egusi, biterleaf, okro, Afang, white soup, banker Stew etc
-- Proposed: oha, Egusi, biterleaf, okro, Afang, white soup, banker Stew etc |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'b3b720b7-738f-436f-b226-6df4abd2f29a'
  and vendor.slug = 'chizzy-african-food';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'oha, Egusi, biterleaf, okro, Afang, white soup, banker Stew etc', 'Rice and stew with beans, Goat meat, oha soup Apu, Egusi, biterleaf, Afang, white soup, Ofaku stew etc ranging N1500-3500', null, true
from public.vendors as vendor
where vendor.id = 'b3b720b7-738f-436f-b226-6df4abd2f29a'
  and vendor.slug = 'chizzy-african-food';

-- Christina Onishinu (christina-onishinu)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 8; match=source_evidence_row
-- Current: Roasted yam, Roasted plantain, kpomo | Roasted yam, Roasted plantain, kpomo | Roasted yam, Roasted plantain, kpomo
-- Proposed: Roasted yam, Roasted plantain, kpomo |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '6a66690e-b82e-4f73-8c1a-b90d6cc3bf6b'
  and vendor.slug = 'christina-onishinu';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, Roasted plantain, kpomo', 'Roasted plantain and porridge beans with kpomo N2,000. Roasted Plantain, with porridge beans and kpomo N2,000', null, true
from public.vendors as vendor
where vendor.id = '6a66690e-b82e-4f73-8c1a-b90d6cc3bf6b'
  and vendor.slug = 'christina-onishinu';

-- Christy (christy)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 17; match=source_evidence_row
-- Current: yam, potato, Akara, pap and indomie with egg. | yam, potato, Akara, pap and indomie with egg. | yam, potato, Akara, pap and indomie with egg.
-- Proposed: yam, potato, Akara, pap and indomie with egg. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '3d8a5b04-62c4-42ee-aa8e-28bc79b34439'
  and vendor.slug = 'christy';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, potato, Akara, pap and indomie with egg.', 'she sells, indomie and egg N1700, fried N100, yam N100,potato N50,Akara N50 pap N300', null, true
from public.vendors as vendor
where vendor.id = '3d8a5b04-62c4-42ee-aa8e-28bc79b34439'
  and vendor.slug = 'christy';

-- Comfort Kitchen (comfort-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 6; match=source_evidence_row
-- Current: Fried chicken, Fried goat meat, fried fish, | Fried chicken, Fried goat meat, fried fish, | Fried chicken, Fried goat meat, fried fish,
-- Proposed: Fried chicken, Fried goat meat, fried fish, |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '6876bd3e-d2bf-4a7a-910e-ec7d1f05c281'
  and vendor.slug = 'comfort-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fried chicken, Fried goat meat, fried fish,', 'Rice and stew with meat N1,300-N1,500 Swallow and Soup with Meat N1,500, with pounded yam N1600 Fried chicken N1,000-N1,500 fried goat meat N500 Fried Fish N500-1,000', null, true
from public.vendors as vendor
where vendor.id = '6876bd3e-d2bf-4a7a-910e-ec7d1f05c281'
  and vendor.slug = 'comfort-kitchen';

-- Diamond Gee global (diamond-gee-global)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 25; match=source_evidence_row
-- Current: Doghnut puff puff, Meatpie, fishpie, fish roll etc. | Doghnut puff puff, Meatpie, fishpie, fish roll etc. | Doghnut puff puff, Meatpie, fishpie, fish roll etc.
-- Proposed: Doghnut puff puff, Meatpie, fishpie, fish roll etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '40d8b2b3-dd21-4f76-91e4-09107ac904ff'
  and vendor.slug = 'diamond-gee-global';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Doghnut puff puff, Meatpie, fishpie, fish roll etc.', 'Snacks like: Doughnuts,Egg roll, Meatpie, Chin Chin, Puff puff, Fish roll and peanut. Soft drinks like, Coke, Fanta, Pepsi,7up, Sweepes, etc.', null, true
from public.vendors as vendor
where vendor.id = '40d8b2b3-dd21-4f76-91e4-09107ac904ff'
  and vendor.slug = 'diamond-gee-global';

-- Esther (esther)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 23; match=source_evidence_row
-- Current: Yam, bones, potato, yam, pap, Akara | Yam, bones, potato, yam, pap, Akara | Yam, bones, potato, yam, pap, Akara
-- Proposed: Yam, bones, potato, yam, pap, Akara |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'efc56fbc-022a-4840-bab7-726bf425dbc1'
  and vendor.slug = 'esther';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Yam, bones, potato, yam, pap, Akara', 'Bones N100, Egg Roll N500, Akara N50, Yam N100, potato N50', null, true
from public.vendors as vendor
where vendor.id = 'efc56fbc-022a-4840-bab7-726bf425dbc1'
  and vendor.slug = 'esther';

-- G&G Restaurant (g-g-restaurant)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 34; match=source_evidence_row
-- Current: Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi.
-- Proposed: Jollof rice, rice and stew, swallow and soup, Moi Moi. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'b922b3d2-8f30-4fe1-8df2-4c7231d55475'
  and vendor.slug = 'g-g-restaurant';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Jollof rice, rice and stew, swallow and soup, Moi Moi.', 'She sells, Rice and stew with meat N1,200 Jollof rice with meat and Fish N1,700-2000 Swallow: Apu, Semo Garri, Wheat pounded yam. Soup; Afang, Egusi, biterleaf, vegetable soup and Ogbono.from N1,200-1700.', null, true
from public.vendors as vendor
where vendor.id = 'b922b3d2-8f30-4fe1-8df2-4c7231d55475'
  and vendor.slug = 'g-g-restaurant';

-- gift (gift)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 1 workbook row 12; match=source_evidence_row
-- Current: White Rice, stew jollof rice, fried rice etc. | White Rice, stew jollof rice, fried rice etc. | White Rice, stew jollof rice, fried rice etc.
-- Proposed: White Rice, stew jollof rice, fried rice etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'f46a5a36-168c-4048-8e05-6ad0dd1e0352'
  and vendor.slug = 'gift';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'White Rice, stew jollof rice, fried rice etc.', 'White Rice, and stew, Roasted yam, Roasted plantain with fish, Swallow like Eba, Semovita, Soup: Afang, vegetable, bitter leaf, okro Egusi, white soup. Porridge beans,bread and Chicken.', null, true
from public.vendors as vendor
where vendor.id = 'f46a5a36-168c-4048-8e05-6ad0dd1e0352'
  and vendor.slug = 'gift';

-- God's Hand food vendor (god-s-hand-food-vendor)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 93; match=source_evidence_row
-- Current: Rice and stew , beans, yam, moi moi etc. | Rice and stew , beans, yam, moi moi etc. | Rice and stew , beans, yam, moi moi etc.
-- Proposed: Rice and stew , beans, yam, moi moi etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'df7dd665-a260-4187-8ee2-90d0272d591f'
  and vendor.slug = 'god-s-hand-food-vendor';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew , beans, yam, moi moi etc.', 'Jollof rice and porridge beans with meat and disposable plates is N1500, Same as Rice and stew. Roasted yam, porridge Beans, plantain, with kpomo and Fish is N1500.', null, true
from public.vendors as vendor
where vendor.id = 'df7dd665-a260-4187-8ee2-90d0272d591f'
  and vendor.slug = 'god-s-hand-food-vendor';

-- Ify plantain (ify-plantain)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 23; match=source_evidence_row
-- Current: Kpomo, Roasted yam and plantain with porridge beans | Kpomo, Roasted yam and plantain with porridge beans | Kpomo, Roasted yam and plantain with porridge beans
-- Proposed: Kpomo, Roasted yam and plantain with porridge beans |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'fb2d70c0-1a50-44fd-bc11-373240fa8ae2'
  and vendor.slug = 'ify-plantain';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Kpomo, Roasted yam and plantain with porridge beans', 'Roasted yam and Beans with kpomo N1,200 Roasted plantain and beans with kpomo N1,700 Beans and bread N1,100 Bottle Mineral N400', null, true
from public.vendors as vendor
where vendor.id = 'fb2d70c0-1a50-44fd-bc11-373240fa8ae2'
  and vendor.slug = 'ify-plantain';

-- IVY KITCHEN (ivy-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 74; match=source_evidence_row
-- Current: Rice and stew, Irish potato,yam, plantain, egg etc. | Rice and stew, Irish potato,yam, plantain, egg etc. | Rice and stew, Irish potato,yam, plantain, egg etc.
-- Proposed: Rice and stew, Irish potato,yam, plantain, egg etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'e1f29826-489c-4391-8627-273bd73a4914'
  and vendor.slug = 'ivy-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew, Irish potato,yam, plantain, egg etc.', 'White Rice and stew with meat N1500, jollof rice and meat N1500, Swallow: Apu, garri, Pounded yam, Semo Soup: Vegetable, Egusi, draw, bitter leaf upward. Irish potato N3500, yam, plantain and egg N2500.', null, true
from public.vendors as vendor
where vendor.id = 'e1f29826-489c-4391-8627-273bd73a4914'
  and vendor.slug = 'ivy-kitchen';

-- Iya (iya)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 17; match=source_evidence_row
-- Current: Doghnut, Puff puff, Fish roll, drinks etc. | Doghnut, Puff puff, Fish roll, drinks etc. | Doghnut, Puff puff, Fish roll, drinks etc.
-- Proposed: Doghnut, Puff puff, Fish roll, drinks etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'dacabe92-ac86-44fc-92cc-6cc29d0954b8'
  and vendor.slug = 'iya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Doghnut, Puff puff, Fish roll, drinks etc.', 'Meatpie N600, Sausage roll N600 ,Egg roll N600, Doghnut N100-300, Bons N100, Puff puff N100, peanut N100. All kinds of Soft Drinks', null, true
from public.vendors as vendor
where vendor.id = 'dacabe92-ac86-44fc-92cc-6cc29d0954b8'
  and vendor.slug = 'iya';

-- Joy Cathering and outdoor services (joy-cathering-and-outdoor-services)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 78; match=source_evidence_row
-- Current: Rice beans, Swallow,Soup, fish and meat | Rice beans, Swallow,Soup, fish and meat | Rice beans, Swallow,Soup, fish and meat
-- Proposed: Rice beans, Swallow,Soup, fish and meat |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'cce1c7cf-7251-4327-a8d9-3193d4c2dec4'
  and vendor.slug = 'joy-cathering-and-outdoor-services';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice beans, Swallow,Soup, fish and meat', 'Rice and stew with meat N1500 Swallow and soup, Apu, semo, garri with Egusi, okro, oha, ogbono, banger for N1500 while vegetable soup is N2,000 white soup N2,500', null, true
from public.vendors as vendor
where vendor.id = 'cce1c7cf-7251-4327-a8d9-3193d4c2dec4'
  and vendor.slug = 'joy-cathering-and-outdoor-services';

-- Joy Fish Service (joy-fish-service)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 58; match=source_evidence_row
-- Current: Roasted Catfish with Fish | Roasted Catfish with Fish | Roasted Catfish with Fish
-- Proposed: Roasted Catfish with Fish |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'b8f5cfff-a396-416a-a5cd-7d4a699e3eb5'
  and vendor.slug = 'joy-fish-service';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted Catfish with Fish', 'Roasted catfish with Chips', null, true
from public.vendors as vendor
where vendor.id = 'b8f5cfff-a396-416a-a5cd-7d4a699e3eb5'
  and vendor.slug = 'joy-fish-service';

-- KC faith kitchen (kc-faith-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 12; match=source_evidence_row
-- Current: Ofaku, Rice and stew, beans and plantain etc. | Ofaku, Rice and stew, beans and plantain etc. | Ofaku, Rice and stew, beans and plantain etc.
-- Proposed: Ofaku, Rice and stew, beans and plantain etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'aeb52c4e-c9d6-4026-80aa-cec144c51efb'
  and vendor.slug = 'kc-faith-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Ofaku, Rice and stew, beans and plantain etc.', 'Rice and Stew with meat N1700, Rice and Ofaku with meat N1700, Swallow: Garri, Semo, Apu, plantain flour, Soup: Okro, Egusi, vegetable, bitter leaf, Oha.N1700,2,200,and N2700 etc.', null, true
from public.vendors as vendor
where vendor.id = 'aeb52c4e-c9d6-4026-80aa-cec144c51efb'
  and vendor.slug = 'kc-faith-kitchen';

-- madam Bole (madam-bole)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 16; match=source_evidence_row
-- Current: ijebu garri, sugar, bread, roasted fish, plantain etc | ijebu garri, sugar, bread, roasted fish, plantain etc | ijebu garri, sugar, bread, roasted fish, plantain etc
-- Proposed: ijebu garri, sugar, bread, roasted fish, plantain etc |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '7b5e7176-9873-43a3-b5bc-e22bd125e1c5'
  and vendor.slug = 'madam-bole';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'ijebu garri, sugar, bread, roasted fish, plantain etc', 'Bread, ijebu garri, sugar, Roasted potatoes, yam, plantain, fresh beans and sauce', null, true
from public.vendors as vendor
where vendor.id = '7b5e7176-9873-43a3-b5bc-e22bd125e1c5'
  and vendor.slug = 'madam-bole';

-- Madam Calabar (madam-calabar)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 76; match=source_evidence_row
-- Current: Rice, Beans plantain,meat and fish. | Rice, Beans plantain,meat and fish. | Rice, Beans plantain,meat and fish.
-- Proposed: Rice, Beans plantain,meat and fish. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '25e4d814-0531-4d18-b543-7ced2d97d4d7'
  and vendor.slug = 'madam-calabar';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, Beans plantain,meat and fish.', 'Rice and stew with meat N1,000, yam and porridge beans with meat N1200 Titus fish N2,000', null, true
from public.vendors as vendor
where vendor.id = '25e4d814-0531-4d18-b543-7ced2d97d4d7'
  and vendor.slug = 'madam-calabar';

-- Madam Cash (madam-cash)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 80; match=source_evidence_row
-- Current: Rice beans, Banger, and swallow with soup. | Rice beans, Banger, and swallow with soup. | Rice beans, Banger, and swallow with soup.
-- Proposed: Rice beans, Banger, and swallow with soup. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '4c5768ea-c80b-4f32-9b7b-96f355441472'
  and vendor.slug = 'madam-cash';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice beans, Banger, and swallow with soup.', 'jollof rice,N1,000 porridge beans N1,000, without meat N700, White rice and Ofaku N1,000-1,200 Swallow: Semo, Apu, garri, Wheat Soup: Egusi, okro bitter leaf, oha, ogbono bitter leaf soup, vegetable and white soup.N1,000-1500', null, true
from public.vendors as vendor
where vendor.id = '4c5768ea-c80b-4f32-9b7b-96f355441472'
  and vendor.slug = 'madam-cash';

-- Madam CoCo (madam-coco)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 72; match=source_evidence_row
-- Current: Rice, beans yam and poundo | Rice, beans yam and poundo | Rice, beans yam and poundo
-- Proposed: Rice, beans yam and poundo |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '9bd01573-1406-46df-979d-33e1ad618059'
  and vendor.slug = 'madam-coco';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans yam and poundo', 'Rice and stew, plantain, fish , goat head, beef, pounded yam, garri, Apu, Semo. Egusi Afang, okro, vegetable etc.', null, true
from public.vendors as vendor
where vendor.id = '9bd01573-1406-46df-979d-33e1ad618059'
  and vendor.slug = 'madam-coco';

-- Madam Franka (madam-franka)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 65; match=source_evidence_row
-- Current: Tea, bread, indomie,egg, pap, beans and custard etc | Tea, bread, indomie,egg, pap, beans and custard etc | Tea, bread, indomie,egg, pap, beans and custard etc
-- Proposed: Tea, bread, indomie,egg, pap, beans and custard etc |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'ff323a26-75cf-4a67-b7e6-fcc06bba7a78'
  and vendor.slug = 'madam-franka';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Tea, bread, indomie,egg, pap, beans and custard etc', 'She sells, Indomie and egg N11500-1800 Custard and bread with Milk N1,000 pap N500, beans and bread N 1,000 garri, Sugar, and groundnut N300.', null, true
from public.vendors as vendor
where vendor.id = 'ff323a26-75cf-4a67-b7e6-fcc06bba7a78'
  and vendor.slug = 'madam-franka';

-- Madam Jos (madam-jos)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 30; match=source_evidence_row
-- Current: plantain, and beans, Rice and stew, swallow and soup | plantain, and beans, Rice and stew, swallow and soup | plantain, and beans, Rice and stew, swallow and soup
-- Proposed: plantain, and beans, Rice and stew, swallow and soup |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'e0a74b14-2ecd-4509-928b-c5435806b91f'
  and vendor.slug = 'madam-jos';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'plantain, and beans, Rice and stew, swallow and soup', 'Rice and stew with meat N1500 Jollof rice, salad and meat N2,000 porridge beans with yam N1,000 Swallow: Apu, Semo and garri Soup: Egusi,oha, vegetable Okro N1500 fried plantain N500', null, true
from public.vendors as vendor
where vendor.id = 'e0a74b14-2ecd-4509-928b-c5435806b91f'
  and vendor.slug = 'madam-jos';

-- Madam leaky finger (madam-leaky-finger)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 24; match=source_evidence_row
-- Current: Pot of varities of Soup on Order. | Pot of varities of Soup on Order. | Pot of varities of Soup on Order.
-- Proposed: Pot of varities of Soup on Order. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '86a8b7cc-c727-4cdb-9fbf-d2e8ad12eaef'
  and vendor.slug = 'madam-leaky-finger';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Pot of varities of Soup on Order.', 'Rice and stew, with beans and meat N2,300 jollof rice with Chicken N3,500 Swallow: Semo, Apu, garri and what Soup: Vegetable soup with Semo N4,300 Egusi soup with garri or Apu N2,800 Oha soup and garri N3,000 Okro Soup N2,800', null, true
from public.vendors as vendor
where vendor.id = '86a8b7cc-c727-4cdb-9fbf-d2e8ad12eaef'
  and vendor.slug = 'madam-leaky-finger';

-- Madam Mbpodium plantain (madam-mbpodium-plantain)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 66; match=source_evidence_row
-- Current: Roasted yam, plantain, porridge beans and kpomo | Roasted yam, plantain, porridge beans and kpomo | Roasted yam, plantain, porridge beans and kpomo
-- Proposed: Roasted yam, plantain, porridge beans and kpomo |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '22f671d8-7387-4856-8b2b-dd351cb2bd2c'
  and vendor.slug = 'madam-mbpodium-plantain';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, porridge beans and kpomo', 'Brown porridge beans either with roasted yam or plantain with kpomo N1200-1500', null, true
from public.vendors as vendor
where vendor.id = '22f671d8-7387-4856-8b2b-dd351cb2bd2c'
  and vendor.slug = 'madam-mbpodium-plantain';

-- Madam No be lie (madam-no-be-lie)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 59; match=source_evidence_row
-- Current: yam, plantain, cooked corn, Apu and swallow | yam, plantain, cooked corn, Apu and swallow | yam, plantain, cooked corn, Apu and swallow
-- Proposed: yam, plantain, cooked corn, Apu and swallow |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '65b0d046-4501-4809-a3aa-b63b22ee31da'
  and vendor.slug = 'madam-no-be-lie';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, plantain, cooked corn, Apu and swallow', 'Roasted and cooked Corn,N300-500 ,Roasted yam and roasted plantain with kpomo(2)N2,500 porridge beans with bread N1,300-1700 Kunu Nzaki, N300-500 Soyabean drink N1000, kunuAya N1,000 Zobo, Apu and Soup N1500', null, true
from public.vendors as vendor
where vendor.id = '65b0d046-4501-4809-a3aa-b63b22ee31da'
  and vendor.slug = 'madam-no-be-lie';

-- Madam put more (madam-put-more)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 94; match=source_evidence_row
-- Current: Salad, plantain, jollof rice, porridge beans, meat, fish etc. | Salad, plantain, jollof rice, porridge beans, meat, fish etc. | Salad, plantain, jollof rice, porridge beans, meat, fish etc.
-- Proposed: Salad, plantain, jollof rice, porridge beans, meat, fish etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '73ec1339-01dc-47cf-b825-776f6248bd66'
  and vendor.slug = 'madam-put-more';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Salad, plantain, jollof rice, porridge beans, meat, fish etc.', 'Jollof rice with meat is N1500 without salad and plantain, with salad and plantain is N2,000, White Rice and porridge beans with meat is N1700, plantain and Salad N1,000', null, true
from public.vendors as vendor
where vendor.id = '73ec1339-01dc-47cf-b825-776f6248bd66'
  and vendor.slug = 'madam-put-more';

-- Madam TIV (madam-tiv)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 10; match=source_evidence_row
-- Current: Rice and stew,beans, Meat and Varities of Soup. | Rice and stew,beans, Meat and Varities of Soup. | Rice and stew,beans, Meat and Varities of Soup.
-- Proposed: Rice and stew,beans, Meat and Varities of Soup. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '2e424cd9-e881-4491-92bf-60ed1037fe00'
  and vendor.slug = 'madam-tiv';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew,beans, Meat and Varities of Soup.', 'Indomie and 2egg N1,500 white Rice, stew and beans with meat N1,500 Swallow: Semo, Apu, garri Soup: okro Egusi, vegetable, oha, N1,500-N2,000,white soup N2,500, Afang soup N1,500', null, true
from public.vendors as vendor
where vendor.id = '2e424cd9-e881-4491-92bf-60ed1037fe00'
  and vendor.slug = 'madam-tiv';

-- madam yam (madam-yam)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 13; match=source_evidence_row
-- Current: roasted yam, porridge beans, jollof rice, kpomo, fried fish, roasted plantain, roasted potatoes. | roasted yam, porridge beans, jollof rice, kpomo, fried fish, roasted plantain, roasted potatoes. | roasted yam, porridge beans, jollof rice, kpomo, fried fish, roasted plantain, roasted potatoes.
-- Proposed: roasted yam, porridge beans, jollof rice, kpomo, fried fish, roasted plantain, roasted potatoes. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '48a6f86f-18d0-4111-bfb7-2133549edff2'
  and vendor.slug = 'madam-yam';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'roasted yam, porridge beans, jollof rice, kpomo, fried fish, roasted plantain, roasted potatoes.', 'Yam and beans with kpomo N1500,with fish N2000, with potatoes N1300, jellof rice a plate N1,000.', null, true
from public.vendors as vendor
where vendor.id = '48a6f86f-18d0-4111-bfb7-2133549edff2'
  and vendor.slug = 'madam-yam';

-- Magdalene (magdalene)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 33; match=source_evidence_row
-- Current: Pap and Akara | Pap and Akara | Pap and Akara
-- Proposed: Pap and Akara |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '13c66485-8ce1-41d4-8d61-98a8ed002502'
  and vendor.slug = 'magdalene';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Pap and Akara', 'KoKo(pap) N300-500 Akara N50', null, true
from public.vendors as vendor
where vendor.id = '13c66485-8ce1-41d4-8d61-98a8ed002502'
  and vendor.slug = 'magdalene';

-- mai Awara (mai-awara)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 3; match=source_evidence_row
-- Current: Awara and Corn | Awara and Corn | Awara and Corn
-- Proposed: Awara and Corn |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '48b82c73-74bd-4e63-a6ca-c419c200ada7'
  and vendor.slug = 'mai-awara';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Awara and Corn', 'Awara N50 upward and cooked Corn N200-300 upward.', null, true
from public.vendors as vendor
where vendor.id = '48b82c73-74bd-4e63-a6ca-c419c200ada7'
  and vendor.slug = 'mai-awara';

-- Mai kilishi (mai-kilishi)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 10; match=source_evidence_row
-- Current: Kilishi | kilishi | kilishi
-- Proposed: Kilishi |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '8fee2e69-7436-49e1-9cf9-0a0de620ddbf'
  and vendor.slug = 'mai-kilishi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Kilishi', 'kilishi and above.', null, true
from public.vendors as vendor
where vendor.id = '8fee2e69-7436-49e1-9cf9-0a0de620ddbf'
  and vendor.slug = 'mai-kilishi';

-- Mai Nama (mai-nama)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 20; match=source_evidence_row
-- Current: Roasted Ram Suya | Roasted Ram Suya | Roasted Ram Suya
-- Proposed: Roasted Ram Suya |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'debb3a6e-1f95-4ab8-bc2d-c1eeab12e42e'
  and vendor.slug = 'mai-nama';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted Ram Suya', 'Ram Roasted Suya 1kilo N12,000', null, true
from public.vendors as vendor
where vendor.id = 'debb3a6e-1f95-4ab8-bc2d-c1eeab12e42e'
  and vendor.slug = 'mai-nama';

-- Mai Suya (mai-suya)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 2; match=source_evidence_row
-- Current: Suya | Suya | Suya
-- Proposed: Suya |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '7f2bf2df-484f-4196-9d0b-337c6a43bb0f'
  and vendor.slug = 'mai-suya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Suya', 'Suya', null, true
from public.vendors as vendor
where vendor.id = '7f2bf2df-484f-4196-9d0b-337c6a43bb0f'
  and vendor.slug = 'mai-suya';

-- Mama Ada (mama-ada)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 90; match=source_evidence_row
-- Current: fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup. | fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup. | fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup.
-- Proposed: fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '160140ab-32d9-4869-a333-6d72e8876cbe'
  and vendor.slug = 'mama-ada';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup.', 'She sells, Rice and stew,cooked beans, Jollof rice and salad with fish and meat, all kinds of swallow,Semo, Apu, garri,wheat, Soup; Egusi,okro, Bitter leaf, oha, all', null, true
from public.vendors as vendor
where vendor.id = '160140ab-32d9-4869-a333-6d72e8876cbe'
  and vendor.slug = 'mama-ada';

-- Mama Amira (mama-amira)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 81; match=source_evidence_row
-- Current: Rice and stew, Masa, tuwoshinkafa etc. | Rice and stew, Masa, tuwoshinkafa etc. | Rice and stew, Masa, tuwoshinkafa etc.
-- Proposed: Rice and stew, Masa, tuwoshinkafa etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'dc03e05d-6850-4d8f-bec6-b2051bdddb6f'
  and vendor.slug = 'mama-amira';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew, Masa, tuwoshinkafa etc.', 'Masa, N100 white rice and stew with meat N900 Dawanki N600-1,000 jollof rice N900 pepper soup N1,000 Tuwoshinkafa N250-300 Goat head N1,000 fried cow meat N200', null, true
from public.vendors as vendor
where vendor.id = 'dc03e05d-6850-4d8f-bec6-b2051bdddb6f'
  and vendor.slug = 'mama-amira';

-- Mama Awara (mama-awara)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 85; match=source_evidence_row
-- Current: Awara, yam, kpomo, plantain potatoe,tec. | Awara, yam, kpomo, plantain potatoe,tec. | Awara, yam, kpomo, plantain potatoe,tec.
-- Proposed: Awara, yam, kpomo, plantain potatoe,tec. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '6fcc6730-19df-4278-a56f-9651d2c75d5c'
  and vendor.slug = 'mama-awara';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Awara, yam, kpomo, plantain potatoe,tec.', 'Awara, yam, potatoes, plantain, Akara, Dankwaua, and peppered kpomo and kunungeda.', null, true
from public.vendors as vendor
where vendor.id = '6fcc6730-19df-4278-a56f-9651d2c75d5c'
  and vendor.slug = 'mama-awara';

-- mama blessing (mama-blessing)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 10; match=source_evidence_row
-- Current: Roasted yam, plantain, porridge beans. | Roasted yam, plantain, porridge beans. | Roasted yam, plantain, porridge beans.
-- Proposed: Roasted yam, plantain, porridge beans. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'c03a6d02-dc60-496d-937b-c39f88bc6e7b'
  and vendor.slug = 'mama-blessing';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, porridge beans.', 'plantain ,beans and yam and above.', null, true
from public.vendors as vendor
where vendor.id = 'c03a6d02-dc60-496d-937b-c39f88bc6e7b'
  and vendor.slug = 'mama-blessing';

-- Mama Bole (mama-bole)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 95; match=source_evidence_row
-- Current: Yam, kpomo, porridge beans, plantain,and fish | Yam, kpomo, porridge beans, plantain,and fish | Yam, kpomo, porridge beans, plantain,and fish
-- Proposed: Yam, kpomo, porridge beans, plantain,and fish |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'c6fd0f21-e8c1-4c3c-87e2-783e8c7c0699'
  and vendor.slug = 'mama-bole';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Yam, kpomo, porridge beans, plantain,and fish', 'Kpomo N200, Fish N700-1,000 Roasted yam, porridge Beans and Kpomo N1500, plantain N1,000 upward.', null, true
from public.vendors as vendor
where vendor.id = 'c6fd0f21-e8c1-4c3c-87e2-783e8c7c0699'
  and vendor.slug = 'mama-bole';

-- Mama Daniel (mama-daniel)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 24; match=source_evidence_row
-- Current: fried potatoes,fried plantain, spaghetti, Rice and stew with swallow | fried potatoes,fried plantain, spaghetti, Rice and stew with swallow | fried potatoes,fried plantain, spaghetti, Rice and stew with swallow
-- Proposed: fried potatoes,fried plantain, spaghetti, Rice and stew with swallow |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '101253d4-8c0b-41bc-89c3-e6bd20b374c0'
  and vendor.slug = 'mama-daniel';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'fried potatoes,fried plantain, spaghetti, Rice and stew with swallow', 'Rice, porridge Bean with meat N1500, fried plantain N100, spaghetti a plate is N500, Swallow with soup N1500 pounded yam with white soup N2,000.', null, true
from public.vendors as vendor
where vendor.id = '101253d4-8c0b-41bc-89c3-e6bd20b374c0'
  and vendor.slug = 'mama-daniel';

-- Mama Edo (mama-edo)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 7; match=source_evidence_row
-- Current: Rice, beans, meat, swallow and soup | Rice, beans, meat, swallow and soup | Rice, beans, meat, swallow and soup
-- Proposed: Rice, beans, meat, swallow and soup |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '908e3651-4fad-4ee4-8e3a-3d9de234b0e3'
  and vendor.slug = 'mama-edo';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans, meat, swallow and soup', 'Rice and beans with stew and meat N1,500 Swallow: Apu, garri,Semo, poundo Soup: Egusi,Okro, ogbono,and Vegetable -2,000', null, true
from public.vendors as vendor
where vendor.id = '908e3651-4fad-4ee4-8e3a-3d9de234b0e3'
  and vendor.slug = 'mama-edo';

-- Mama Ezikel (mama-ezikel)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 57; match=source_evidence_row
-- Current: Rice, beans, spaghetti, and swallow | Rice, beans, spaghetti, and swallow | Rice, beans, spaghetti, and swallow
-- Proposed: Rice, beans, spaghetti, and swallow |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '1ca638ca-a6e4-4cb1-96f8-646ff7c83534'
  and vendor.slug = 'mama-ezikel';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans, spaghetti, and swallow', 'Rice and stew with Beans, Meat and fish N1,500 Swallow: Apu, Semo and garri Soup Egusi, bitter leaf, vegetable and okro soup', null, true
from public.vendors as vendor
where vendor.id = '1ca638ca-a6e4-4cb1-96f8-646ff7c83534'
  and vendor.slug = 'mama-ezikel';

-- Mama food (mama-food)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 16; match=source_evidence_row
-- Current: Rice and stew, jollof, beans, Soup and Eba | Rice and stew, jollof, beans, Soup and Eba | Rice and stew, jollof, beans, Soup and Eba
-- Proposed: Rice and stew, jollof, beans, Soup and Eba |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '1b1791f7-2ba7-434c-8813-c8349ade8210'
  and vendor.slug = 'mama-food';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew, jollof, beans, Soup and Eba', 'Apu with beef is N1500, with goat meat is N1700, with cow leg,N3500,N3,000 Rice and beans with meat is N1500, N1700, jollof rice and meat is N1500, N1700, Banger and white N1500,N1700', null, true
from public.vendors as vendor
where vendor.id = '1b1791f7-2ba7-434c-8813-c8349ade8210'
  and vendor.slug = 'mama-food';

-- Mama Hassan (mama-hassan)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 31; match=source_evidence_row
-- Current: Tuwoshinkafa, Tuwomasara Masa with Soup, and yaji pepper etc. | Tuwoshinkafa, Tuwomasara Masa with Soup, and yaji pepper etc. | Tuwoshinkafa, Tuwomasara Masa with Soup, and yaji pepper etc.
-- Proposed: Tuwoshinkafa, Tuwomasara Masa with Soup, and yaji pepper etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '376fe8a3-abba-4d46-82ba-e7fa1292b8f6'
  and vendor.slug = 'mama-hassan';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Tuwoshinkafa, Tuwomasara Masa with Soup, and yaji pepper etc.', 'Tuwo ndawa N300, Shinkafa Jollof N1500,Tuwoshinkafa N500, Masa and Soup N100-500,1,000 and Yaji pepper, yaji kuli Kuli, Rice and stew with meat,N1,500, ARABIAN TEA N500-1500 pepper with assorted intestines N1,000', null, true
from public.vendors as vendor
where vendor.id = '376fe8a3-abba-4d46-82ba-e7fa1292b8f6'
  and vendor.slug = 'mama-hassan';

-- Mama Lovina (mama-lovina)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 18; match=source_evidence_row
-- Current: Moi Moi, Rice and stew, jollof rice, swallow and soup. | Moi Moi, Rice and stew, jollof rice, swallow and soup. | Moi Moi, Rice and stew, jollof rice, swallow and soup.
-- Proposed: Moi Moi, Rice and stew, jollof rice, swallow and soup. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '3dff637b-7b45-48f6-8587-fc059cde44da'
  and vendor.slug = 'mama-lovina';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Moi Moi, Rice and stew, jollof rice, swallow and soup.', 'White Rice and stew with meat and beans N1,300 jollof rice with salad and meat N1800, with fish and Salad N2,500 Moi Moi 2 N500 Swallow: Apu, garri,Semo, Soup: Egusi, Biterleaf,Oha, okro, All kinds of Soft drinks N500-600.', null, true
from public.vendors as vendor
where vendor.id = '3dff637b-7b45-48f6-8587-fc059cde44da'
  and vendor.slug = 'mama-lovina';

-- Mama mary (mama-mary)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 7; match=source_evidence_row
-- Current: Roasted yam, plantain, fish porridge beans, etc | Roasted yam, plantain, fish porridge beans, etc | Roasted yam, plantain, fish porridge beans, etc
-- Proposed: Roasted yam, plantain, fish porridge beans, etc |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '5bce2e48-5310-4029-bf23-5ab7730eef5a'
  and vendor.slug = 'mama-mary';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, fish porridge beans, etc', 'Yam, porridge, fried plantain, roasted plantain, porridge beans, white rice and stew, goat meat, beef, kpomo, fish, swallow and SoupN1200-1700.', null, true
from public.vendors as vendor
where vendor.id = '5bce2e48-5310-4029-bf23-5ab7730eef5a'
  and vendor.slug = 'mama-mary';

-- Mama mimi (mama-mimi)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 9; match=source_evidence_row
-- Current: porridge beans, Roasted yam, plantain and stew | porridge beans, Roasted yam, plantain and stew | porridge beans, Roasted yam, plantain and stew
-- Proposed: porridge beans, Roasted yam, plantain and stew |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'a79c761a-53de-4c61-b3a1-43caafdc44f9'
  and vendor.slug = 'mama-mimi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'porridge beans, Roasted yam, plantain and stew', 'porridge beans and Roasted yam with Kpomo N1,300 and stew porridge beans with plantain and kpomo N1,500', null, true
from public.vendors as vendor
where vendor.id = 'a79c761a-53de-4c61-b3a1-43caafdc44f9'
  and vendor.slug = 'mama-mimi';

-- mama miracle (mama-miracle)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 1 workbook row 14; match=source_evidence_row
-- Current: Rice and stew , beans, yam, moi moi etc. | Rice and stew , beans, yam, moi moi etc. | Rice and stew , beans, yam, moi moi etc.
-- Proposed: Rice and stew , beans, yam, moi moi etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'cffff5cf-f8d5-4245-9281-31c1be6dcf34'
  and vendor.slug = 'mama-miracle';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew , beans, yam, moi moi etc.', 'mama put like rice and stew, beans and yam, moi moi and swallow, like vegetable soup, white soup, Egusi and ogbono, with garri, Apu and semo.', null, true
from public.vendors as vendor
where vendor.id = 'cffff5cf-f8d5-4245-9281-31c1be6dcf34'
  and vendor.slug = 'mama-miracle';

-- Mama moi moi (mama-moi-moi)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 88; match=source_evidence_row
-- Current: yam Akara, pap, plantain, potatoe etc. | yam Akara, pap, plantain, potatoe etc. | yam Akara, pap, plantain, potatoe etc.
-- Proposed: yam Akara, pap, plantain, potatoe etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '377c6964-5a1b-4096-92aa-a899a57622cd'
  and vendor.slug = 'mama-moi-moi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam Akara, pap, plantain, potatoe etc.', 'gongoni moi moi price', null, true
from public.vendors as vendor
where vendor.id = '377c6964-5a1b-4096-92aa-a899a57622cd'
  and vendor.slug = 'mama-moi-moi';

-- Mama Nde (mama-nde)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 100; match=source_evidence_row
-- Current: Pap, kunu ngeda, yam, potatoe, Akara. | Pap, kunu ngeda, yam, potatoe, Akara. | Pap, kunu ngeda, yam, potatoe, Akara.
-- Proposed: Pap, kunu ngeda, yam, potatoe, Akara. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '7a7bcb57-ded3-4f78-8e73-23bb120fec3c'
  and vendor.slug = 'mama-nde';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Pap, kunu ngeda, yam, potatoe, Akara.', 'Akara N50, pap N200-300, kunu ngeda N300-500 yam N100,potato N50', null, true
from public.vendors as vendor
where vendor.id = '7a7bcb57-ded3-4f78-8e73-23bb120fec3c'
  and vendor.slug = 'mama-nde';

-- mama Obaje (mama-obaje)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 11; match=source_evidence_row
-- Current: Pap, Akara, yam, potato, plantain and fish. | Pap, Akara, yam, potato, plantain and fish. | Pap, Akara, yam, potato, plantain and fish.
-- Proposed: Pap, Akara, yam, potato, plantain and fish. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '2fb37017-d1ae-46b8-90ca-5db94a87b6dc'
  and vendor.slug = 'mama-obaje';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Pap, Akara, yam, potato, plantain and fish.', 'Akara, fried potatoes, fried yam, fried plantain, fried fish and pap', null, true
from public.vendors as vendor
where vendor.id = '2fb37017-d1ae-46b8-90ca-5db94a87b6dc'
  and vendor.slug = 'mama-obaje';

-- MaMa Ola (mama-ola)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 12; match=source_evidence_row
-- Current: Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi.
-- Proposed: Jollof rice, rice and stew, swallow and soup, Moi Moi. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '8357ccf9-ea3a-449c-aff4-9380cfee2c69'
  and vendor.slug = 'mama-ola';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Jollof rice, rice and stew, swallow and soup, Moi Moi.', 'Rice and stew with meat N1,500 Jollof rice with Salad and Meat N2,000 Swallow like: Garri,Semo,Amala,Apu and Pounded yam. Soup like: Egusi,okro, Ewedu, Ogbono, gbegiri and Vegetable soup fried plantain,and Moi- Moi', null, true
from public.vendors as vendor
where vendor.id = '8357ccf9-ea3a-449c-aff4-9380cfee2c69'
  and vendor.slug = 'mama-ola';

-- Mama princess (mama-princess)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 8; match=source_evidence_row
-- Current: Rice and stew , beans, yam, moi moi etc. | Rice and stew , beans, yam, moi moi etc. | Rice and stew , beans, yam, moi moi etc.
-- Proposed: Rice and stew , beans, yam, moi moi etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '1c473ee0-9a2d-4365-9f46-1c8dd4b04793'
  and vendor.slug = 'mama-princess';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew , beans, yam, moi moi etc.', 'Rice and stew with beans,N2,000 jollof rice N2,000 Swallow Apu, semo garri wheat soup: Egusi water leaf, ogbono Banger Vegetable,Afang etc. plantain, fried fish, meat, kpomo etc Her price from N2,000 upward.', null, true
from public.vendors as vendor
where vendor.id = '1c473ee0-9a2d-4365-9f46-1c8dd4b04793'
  and vendor.slug = 'mama-princess';

-- Mama Shilo (mama-shilo)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 69; match=source_evidence_row
-- Current: Akara, pap, potatoe, yam, and plantain. | Akara, pap, potatoe, yam, and plantain. | Akara, pap, potatoe, yam, and plantain.
-- Proposed: Akara, pap, potatoe, yam, and plantain. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '14fdb21d-5f38-462f-b8be-a10b6369a9ca'
  and vendor.slug = 'mama-shilo';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Akara, pap, potatoe, yam, and plantain.', 'Sweet a freshly Made Akara, fried yam, sweet potato, Pap and plantain, price', null, true
from public.vendors as vendor
where vendor.id = '14fdb21d-5f38-462f-b8be-a10b6369a9ca'
  and vendor.slug = 'mama-shilo';

-- Mama sunny (mama-sunny)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 62; match=source_evidence_row
-- Current: garri, groundnut, porridge beans, yam, plantain, and Rice. | garri, groundnut, porridge beans, yam, plantain, and Rice. | garri, groundnut, porridge beans, yam, plantain, and Rice.
-- Proposed: garri, groundnut, porridge beans, yam, plantain, and Rice. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '965c4d75-58b7-4dcd-87f8-662414e8b5a8'
  and vendor.slug = 'mama-sunny';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'garri, groundnut, porridge beans, yam, plantain, and Rice.', 'Roasted yam,and porridge beans N1,000 plantain and porridge Beans with kpomo N1,200 white rice and stew N1,000 dry garri and ground nut N400', null, true
from public.vendors as vendor
where vendor.id = '965c4d75-58b7-4dcd-87f8-662414e8b5a8'
  and vendor.slug = 'mama-sunny';

-- Mama thank God (mama-thank-god)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 99; match=source_evidence_row
-- Current: Awara, Soya beans drink, bones egg rolls etc | Awara, Soya beans drink, bones egg rolls etc | Awara, Soya beans drink, bones egg rolls etc
-- Proposed: Awara, Soya beans drink, bones egg rolls etc |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '63702f7f-cc76-4f62-82ed-00ef27967140'
  and vendor.slug = 'mama-thank-god';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Awara, Soya beans drink, bones egg rolls etc', 'Awara N100, Bones,N100, Egg Roll N500,Mineral N400-500,Soya beans drink N200-500 etc.', null, true
from public.vendors as vendor
where vendor.id = '63702f7f-cc76-4f62-82ed-00ef27967140'
  and vendor.slug = 'mama-thank-god';

-- Mandy's signature (mandy-s-signature)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 91; match=source_evidence_row
-- Current: Moi moi, Swallow, soup, Rice and beans. | Moi moi, Swallow, soup, Rice and beans. | Moi moi, Swallow, soup, Rice and beans.
-- Proposed: Moi moi, Swallow, soup, Rice and beans. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '1e43e24b-b524-467c-af18-131f7bcf4ecc'
  and vendor.slug = 'mandy-s-signature';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Moi moi, Swallow, soup, Rice and beans.', 'She sells, Jollof Rice, porridge beans, cooked yam, Rice and stew Moi moi, Meat, Kpomo, Fish etc. Soup: Banger, Egusi, oha, Okro, vegetable, bitter leaf, Afang and white soup, Swallow: Garri, wheat, Apu, Semo.', null, true
from public.vendors as vendor
where vendor.id = '1e43e24b-b524-467c-af18-131f7bcf4ecc'
  and vendor.slug = 'mandy-s-signature';

-- Medoya /Mme yam (medoya-mme-yam)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 89; match=source_evidence_row
-- Current: Yam Akara, pap, plantain, potatoe etc. | Yam Akara, pap, plantain, potatoe etc. | Yam Akara, pap, plantain, potatoe etc.
-- Proposed: Yam Akara, pap, plantain, potatoe etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '3abd5c9b-c1a1-4eb7-a612-aa78ec659387'
  and vendor.slug = 'medoya-mme-yam';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Yam Akara, pap, plantain, potatoe etc.', 'Roasted yam, Akara, potato, plantain etc', null, true
from public.vendors as vendor
where vendor.id = '3abd5c9b-c1a1-4eb7-a612-aa78ec659387'
  and vendor.slug = 'medoya-mme-yam';

-- Mma Afam (mma-afam)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 53; match=source_evidence_row
-- Current: Bons, puff,puff, egg roll, mineral and Zobo. | Bons, puff,puff, egg roll, mineral and Zobo. | Bons, puff,puff, egg roll, mineral and Zobo.
-- Proposed: Bons, puff,puff, egg roll, mineral and Zobo. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '7f789021-53dd-4698-9e42-d5869631a36d'
  and vendor.slug = 'mma-afam';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Bons, puff,puff, egg roll, mineral and Zobo.', 'BonesN100, Egg Roll N500, Fish roll N400, Bread Bones N300, Apu,N200, Bread,N300-500 Zobo drink N200, Kunu,N300, Bottle Mineral N400, plastic Mineral N500, Bottle water N200.', null, true
from public.vendors as vendor
where vendor.id = '7f789021-53dd-4698-9e42-d5869631a36d'
  and vendor.slug = 'mma-afam';

-- Mme Doya (mme-doya)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 17; match=source_evidence_row
-- Current: Roasted yam, plantain, porridge beans. | Roasted yam, plantain, porridge beans. | Roasted yam, plantain, porridge beans.
-- Proposed: Roasted yam, plantain, porridge beans. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '5e331d43-e129-4cdf-9dd5-b91ce6aa7c76'
  and vendor.slug = 'mme-doya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, porridge beans.', 'Roasted plantain, yam and porridge beans, potatoes, kpomo, fish etc upward.', null, true
from public.vendors as vendor
where vendor.id = '5e331d43-e129-4cdf-9dd5-b91ce6aa7c76'
  and vendor.slug = 'mme-doya';

-- Mme kunu (mme-kunu)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 22; match=source_evidence_row
-- Current: kunu ngeda, bones and Egg rolls | kunu ngeda, bones and Egg rolls | kunu ngeda, bones and Egg rolls
-- Proposed: kunu ngeda, bones and Egg rolls |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '86b86e50-7c64-4abc-953f-9c1beabbeb7c'
  and vendor.slug = 'mme-kunu';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'kunu ngeda, bones and Egg rolls', 'kunu ngeda and egg rolls with Puff puff.', null, true
from public.vendors as vendor
where vendor.id = '86b86e50-7c64-4abc-953f-9c1beabbeb7c'
  and vendor.slug = 'mme-kunu';

-- mme Masa (mme-masa)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 1 workbook row 16; match=source_evidence_row
-- Current: Masa with yaji pepper, and Tuwoshinkafa | Masa with yaji pepper, and Tuwoshinkafa | Masa with yaji pepper, and Tuwoshinkafa
-- Proposed: Masa with yaji pepper, and Tuwoshinkafa |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'f053aa03-43c0-4aca-9d28-31642965a2b9'
  and vendor.slug = 'mme-masa';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Masa with yaji pepper, and Tuwoshinkafa', 'Masa with yaji pepper and sauce with Tuwoshinkafa.', null, true
from public.vendors as vendor
where vendor.id = 'f053aa03-43c0-4aca-9d28-31642965a2b9'
  and vendor.slug = 'mme-masa';

-- Mme Yam (mme-yam)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 54; match=source_evidence_row
-- Current: porridge beans, Roasted yam and plantain with kpomo | porridge beans, Roasted yam and plantain with kpomo | porridge beans, Roasted yam and plantain with kpomo
-- Proposed: porridge beans, Roasted yam and plantain with kpomo |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '0f43d489-a610-424e-b3d3-d43bec0b3e25'
  and vendor.slug = 'mme-yam';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'porridge beans, Roasted yam and plantain with kpomo', 'Roasted yam and porridge beans with kpomo N1500 Beans and plantain with kpomo N1,500', null, true
from public.vendors as vendor
where vendor.id = '0f43d489-a610-424e-b3d3-d43bec0b3e25'
  and vendor.slug = 'mme-yam';

-- mummy Dominic (mummy-dominic)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 13; match=source_evidence_row
-- Current: Smoothie, fruit juice and orange juice etc. | Smoothie, fruit juice and orange juice etc. | Smoothie, fruit juice and orange juice etc.
-- Proposed: Smoothie, fruit juice and orange juice etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'b5736ca4-5691-4763-b9ce-9325d95d61bf'
  and vendor.slug = 'mummy-dominic';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Smoothie, fruit juice and orange juice etc.', 'She makes and sells Smoothy, Tigernut, Banana smoothy watermelon plane, watermelon smoothie, carrot juice, Avocado juice', null, true
from public.vendors as vendor
where vendor.id = 'b5736ca4-5691-4763-b9ce-9325d95d61bf'
  and vendor.slug = 'mummy-dominic';

-- Mummy Emma (mummy-emma)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 15; match=source_evidence_row
-- Current: Roasted yam,plantain, porridge beans etc. | Roasted yam,plantain, porridge beans etc. | Roasted yam,plantain, porridge beans etc.
-- Proposed: Roasted yam,plantain, porridge beans etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'aff8c5f9-53ce-4db1-a3cf-d908a8f8dabb'
  and vendor.slug = 'mummy-emma';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam,plantain, porridge beans etc.', 'Sells Roasted yam and porridge beans with Kpomo N2,000-5,000 porridge beans and plantain with Upaka and Fish N5,000.', null, true
from public.vendors as vendor
where vendor.id = 'aff8c5f9-53ce-4db1-a3cf-d908a8f8dabb'
  and vendor.slug = 'mummy-emma';

-- Mummy Samuel (mummy-samuel)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 27; match=source_evidence_row
-- Current: Rice and stew with beans, Swallow,and Soup. | Rice and stew with beans, Swallow,and Soup. | Rice and stew with beans, Swallow,and Soup.
-- Proposed: Rice and stew with beans, Swallow,and Soup. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '51564a19-92d0-4609-90f4-49535c75c425'
  and vendor.slug = 'mummy-samuel';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew with beans, Swallow,and Soup.', 'Rice and stew with beans N1,200-1,500 Swallow:Apu, Eba, Tuwomasara, garri Soup: Biterleaf soup, Egusi,Oha,okro, Ogbono, etc.', null, true
from public.vendors as vendor
where vendor.id = '51564a19-92d0-4609-90f4-49535c75c425'
  and vendor.slug = 'mummy-samuel';

-- Mummy Twins (mummy-twins)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 63; match=source_evidence_row
-- Current: Rice and stew, beans jollof, swallow and soup | Rice and stew, beans jollof, swallow and soup | Rice and stew, beans jollof, swallow and soup
-- Proposed: Rice and stew, beans jollof, swallow and soup |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'ad297106-0413-4f94-90ce-a861337fc063'
  and vendor.slug = 'mummy-twins';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew, beans jollof, swallow and soup', 'Rice and stew with beans N800, Jollof rice,N800, Apu, semo and garri,with oha, okro, Egusi, bitter leaf, vegetable prices are N1,500', null, true
from public.vendors as vendor
where vendor.id = 'ad297106-0413-4f94-90ce-a861337fc063'
  and vendor.slug = 'mummy-twins';

-- NATIONS EAT PLATE FAST FOOD (nations-eat-plate-fast-food)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 4; match=source_evidence_row
-- Current: Sharwama,Burger, Meatpie, Egg roll, indomie and egg etc. | Sharwama,Burger, Meatpie, Egg roll, indomie and egg etc. | Sharwama,Burger, Meatpie, Egg roll, indomie and egg etc.
-- Proposed: Sharwama,Burger, Meatpie, Egg roll, indomie and egg etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '44e49ce9-1480-4626-85fc-66efed72b464'
  and vendor.slug = 'nations-eat-plate-fast-food';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Sharwama,Burger, Meatpie, Egg roll, indomie and egg etc.', 'Meatpie N600, Chin chin from N500-2,000 Egg roll N700, Bons N100, Sharwama Indomie and 2eggs N1400-2,000 Burger N3,700 Party jollof rice on Order All kinds of drinks N400-500', null, true
from public.vendors as vendor
where vendor.id = '44e49ce9-1480-4626-85fc-66efed72b464'
  and vendor.slug = 'nations-eat-plate-fast-food';

-- NIKIS SPECIAL (nikis-special)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 21; match=source_evidence_row
-- Current: fried fish, fried meat, fried plantain, yam, swallow and Rice | fried fish, fried meat, fried plantain, yam, swallow and Rice | fried fish, fried meat, fried plantain, yam, swallow and Rice
-- Proposed: fried fish, fried meat, fried plantain, yam, swallow and Rice |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '50e1fddc-b069-4d07-a955-9d7f199c99f0'
  and vendor.slug = 'nikis-special';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'fried fish, fried meat, fried plantain, yam, swallow and Rice', 'fried fish N500,1500,2000. chicken N1500, 2000, fried rice chicken and Salad N5000, Rice and stew with beans N1,500, porridge beans N700, plantain 3 for N500 Swallow: Semo Apu and garri, wheat. Soup: Vegetable soupN2,000,bitter leaf, oha, Egusi with pack N2,00', null, true
from public.vendors as vendor
where vendor.id = '50e1fddc-b069-4d07-a955-9d7f199c99f0'
  and vendor.slug = 'nikis-special';

-- Nikxy nice (nikxy-nice)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 32; match=source_evidence_row
-- Current: Samosa,spring rolls, Puff puff, Meatpie etc. | Samosa,spring rolls, Puff puff, Meatpie etc. | Samosa,spring rolls, Puff puff, Meatpie etc.
-- Proposed: Samosa,spring rolls, Puff puff, Meatpie etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'fa5256ab-6714-4552-91f4-1bec3fc27d5a'
  and vendor.slug = 'nikxy-nice';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Samosa,spring rolls, Puff puff, Meatpie etc.', 'Egg roll N700, mearpie, N1,200, sausage roll N1,000, Slice Cake, N1,000, Doghnut N400, Chin chin N1,000-35,000(25kg), Puff puff 5 for N400, Bons N100, Fish roll N1,000, Samosa,and Spring rolls both fried And fresh and above.', null, true
from public.vendors as vendor
where vendor.id = 'fa5256ab-6714-4552-91f4-1bec3fc27d5a'
  and vendor.slug = 'nikxy-nice';

-- Potable kitchen (potable-kitchen)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 68; match=source_evidence_row
-- Current: Jollof Rice, Rice and stew, yam and beans. | Jollof Rice, Rice and stew, yam and beans. | Jollof Rice, Rice and stew, yam and beans.
-- Proposed: Jollof Rice, Rice and stew, yam and beans. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '356a0954-e41d-44ed-87b4-8fe5d982d6d6'
  and vendor.slug = 'potable-kitchen';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Jollof Rice, Rice and stew, yam and beans.', 'Jollof rice N1500 white rice and stew N1500, yam and beans N1500 Banger soup N2500 Egusi soup N1500 Okro soup N1500 biterleaf soup N1500 Afang soupN2,000 vegetable soup N2,000', null, true
from public.vendors as vendor
where vendor.id = '356a0954-e41d-44ed-87b4-8fe5d982d6d6'
  and vendor.slug = 'potable-kitchen';

-- Precious Indomie (precious-indomie)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 11; match=source_evidence_row
-- Current: Indomie and eggs, with soft drinks | Indomie and eggs, with soft drinks | Indomie and eggs, with soft drinks
-- Proposed: Indomie and eggs, with soft drinks |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '73b9a612-43ac-455e-8132-a0a530cb8aa7'
  and vendor.slug = 'precious-indomie';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Indomie and eggs, with soft drinks', 'Indomie and 2eggs N1,300-1,600 Soft Drinks like : Fearless N600, Malt, N700,Coke ,fanta,7up, Sweepes, Pepsi from N400-500.', null, true
from public.vendors as vendor
where vendor.id = '73b9a612-43ac-455e-8132-a0a530cb8aa7'
  and vendor.slug = 'precious-indomie';

-- Samira (samira)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 19; match=source_evidence_row
-- Current: Akara,Pap, kunungeda, kpomo,fried yam and potatoes | Akara,Pap, kunungeda, kpomo,fried yam and potatoes | Akara,Pap, kunungeda, kpomo,fried yam and potatoes
-- Proposed: Akara,Pap, kunungeda, kpomo,fried yam and potatoes |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '7eb37f2f-27dd-467f-b4f7-c1a440ea430a'
  and vendor.slug = 'samira';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Akara,Pap, kunungeda, kpomo,fried yam and potatoes', 'Pap N300-500, Kunungeda N500-1,000 ,Akara N50 , potato N50 and Yam N50 with Kpomo N1,00.', null, true
from public.vendors as vendor
where vendor.id = '7eb37f2f-27dd-467f-b4f7-c1a440ea430a'
  and vendor.slug = 'samira';

-- SANA'S FOOD COMBO (sana-s-food-combo)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 26; match=source_evidence_row
-- Current: jollof rice and meat with Salad, indomie and egg | jollof rice and meat with Salad, indomie and egg | jollof rice and meat with Salad, indomie and egg
-- Proposed: jollof rice and meat with Salad, indomie and egg |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '3355a533-cf8c-4dfa-9ca7-7e290fd154f1'
  and vendor.slug = 'sana-s-food-combo';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'jollof rice and meat with Salad, indomie and egg', 'Indomie and 2eggs for N1200-1500. Jollof rice and meat with Salad N1500-1700 Fried rice and meat with Salad for N1500-1700', null, true
from public.vendors as vendor
where vendor.id = '3355a533-cf8c-4dfa-9ca7-7e290fd154f1'
  and vendor.slug = 'sana-s-food-combo';

-- Special (special)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 1 workbook row 15; match=source_evidence_row
-- Current: Okpa | Okpa | Okpa
-- Proposed: Okpa |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '2287a6c1-894a-4db0-894e-8c3ea1a68d54'
  and vendor.slug = 'special';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Okpa', 'special Okpa', null, true
from public.vendors as vendor
where vendor.id = '2287a6c1-894a-4db0-894e-8c3ea1a68d54'
  and vendor.slug = 'special';

-- special Abacha (special-abacha)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 2 workbook row 6; match=source_evidence_row
-- Current: Abacha and Ugba. | Abacha and Ugba. | Abacha and Ugba.
-- Proposed: Abacha and Ugba. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '69887aaf-3ac9-496b-98a6-8b3d50edfda5'
  and vendor.slug = 'special-abacha';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Abacha and Ugba.', 'Abacha , fried fish, kpomo ugba, garden Egg, etc ranging N1,000 and above.', null, true
from public.vendors as vendor
where vendor.id = '69887aaf-3ac9-496b-98a6-8b3d50edfda5'
  and vendor.slug = 'special-abacha';

-- Success Snacks and Drinks (success-snacks-and-drinks)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 77; match=source_evidence_row
-- Current: Egg rolls, kunu, bons, cooked eggs, bottle water | Egg rolls, kunu, bons, cooked eggs, bottle water | Egg rolls, kunu, bons, cooked eggs, bottle water
-- Proposed: Egg rolls, kunu, bons, cooked eggs, bottle water |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'ea977425-93cc-4573-942f-d6a86ac481a3'
  and vendor.slug = 'success-snacks-and-drinks';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Egg rolls, kunu, bons, cooked eggs, bottle water', 'Egg Roll N6000, Bons N100 cooked eggs N300, Kunu N300, Zobo N300, and pure water N300', null, true
from public.vendors as vendor
where vendor.id = 'ea977425-93cc-4573-942f-d6a86ac481a3'
  and vendor.slug = 'success-snacks-and-drinks';

-- Theresa fish (theresa-fish)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 70; match=source_evidence_row
-- Current: Catfish, Irish potato, sweet potatoe, and plantain. | Catfish, Irish potato, sweet potatoe, and plantain. | Catfish, Irish potato, sweet potatoe, and plantain.
-- Proposed: Catfish, Irish potato, sweet potatoe, and plantain. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'fd297048-f281-4a32-9796-3c49278649e6'
  and vendor.slug = 'theresa-fish';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Catfish, Irish potato, sweet potatoe, and plantain.', 'Roasted catfish with pepper sauce and salad N5000-10,000 Irish potatoN3,000, Sweet potato N2,000', null, true
from public.vendors as vendor
where vendor.id = 'fd297048-f281-4a32-9796-3c49278649e6'
  and vendor.slug = 'theresa-fish';

-- Tina Rimke dada (tina-rimke-dada)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 96; match=source_evidence_row
-- Current: Fruit juice, Tigernut, Pineapple, and Zobo drink | Fruit juice, Tigernut, Pineapple, and Zobo drink | Fruit juice, Tigernut, Pineapple, and Zobo drink
-- Proposed: Fruit juice, Tigernut, Pineapple, and Zobo drink |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '6e95a22a-bb3f-4e68-9ee0-f8c73518b4f1'
  and vendor.slug = 'tina-rimke-dada';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fruit juice, Tigernut, Pineapple, and Zobo drink', 'Smothie like Orange juice N500-100, Tiger nutN500-1000, Banana and groundnut SmothieN500-1,000, pawpaw, pineapple,carrots Smothie N500-1,000, Zobo N200-N500, Bones, N100,Egg Roll N500', null, true
from public.vendors as vendor
where vendor.id = '6e95a22a-bb3f-4e68-9ee0-f8c73518b4f1'
  and vendor.slug = 'tina-rimke-dada';

-- UCHE BEST TASTY MEAL (uche-best-tasty-meal)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 18; match=source_evidence_row
-- Current: white rice, jollof rice, porridge beans, indomie and egg, chicken, bread, white soup, toasted bread and tea etc. | white rice, jollof rice, porridge beans, indomie and egg, chicken, bread, white soup, toasted bread and tea etc. | white rice, jollof rice, porridge beans, indomie and egg, chicken, bread, white soup, toasted bread and tea etc.
-- Proposed: white rice, jollof rice, porridge beans, indomie and egg, chicken, bread, white soup, toasted bread and tea etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '3f1bba0f-b058-4808-98a6-4eecdd4b1c76'
  and vendor.slug = 'uche-best-tasty-meal';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'white rice, jollof rice, porridge beans, indomie and egg, chicken, bread, white soup, toasted bread and tea etc.', 'indomie and egg bread 1000, toasted bread and egg is N1500, toasted bread and Tea for N2,000, Chicken N3000-3500, fried rice, ofada rice jollof rice, White soup and pounded yam N3500. Rice and stew with beans is N2,000 a plate etc.Adeog', null, true
from public.vendors as vendor
where vendor.id = '3f1bba0f-b058-4808-98a6-4eecdd4b1c76'
  and vendor.slug = 'uche-best-tasty-meal';

-- Ultimate ontop (ultimate-ontop)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 101; match=source_evidence_row
-- Current: Kunu, Zono, egg rolls, meat pie, puff puff etc. | Kunu, Zono, egg rolls, meat pie, puff puff etc. | Kunu, Zono, egg rolls, meat pie, puff puff etc.
-- Proposed: Kunu, Zono, egg rolls, meat pie, puff puff etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '92e104e6-dcb2-4f53-82b2-5b00cdd1707a'
  and vendor.slug = 'ultimate-ontop';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Kunu, Zono, egg rolls, meat pie, puff puff etc.', 'kunu N300-500,Zono N1,000, puff puff N100,meat pie N800, Fish pie N600,Egg roll N600,Minerals N500, Malt 700.', null, true
from public.vendors as vendor
where vendor.id = '92e104e6-dcb2-4f53-82b2-5b00cdd1707a'
  and vendor.slug = 'ultimate-ontop';

-- Favour (favour-row-022)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 22; match=suffix_row_number
-- Current: Fried yam, potato, plantain, fish, Chicken, pap, Akara etc. | Fried yam, potato, plantain, fish, Chicken, pap, Akara etc. | Fried yam, potato, plantain, fish, Chicken, pap, Akara etc.
-- Proposed: Fried yam, potato, plantain, fish, Chicken, pap, Akara etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '2e279a32-b537-4beb-834e-c0cb8177244a'
  and vendor.slug = 'favour-row-022';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fried yam, potato, plantain, fish, Chicken, pap, Akara etc.', 'Akara N100,Yam N100, potatoes N100, Fish N500-1,000, pap 500, plantain (3) N500 and Fried chicken N1,200-1,500', null, true
from public.vendors as vendor
where vendor.id = '2e279a32-b537-4beb-834e-c0cb8177244a'
  and vendor.slug = 'favour-row-022';

-- Favour (favour-row-021)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 21; match=suffix_row_number
-- Current: Fried yam, potato, plantain, fish, Chicken, pap, Akara etc. | Fried yam, potato, plantain, fish, Chicken, pap, Akara etc. | Fried yam, potato, plantain, fish, Chicken, pap, Akara etc.
-- Proposed: Fried yam, potato, plantain, fish, Chicken, pap, Akara etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '6d9ca0f7-3ea6-4792-a2dc-4f44705425db'
  and vendor.slug = 'favour-row-021';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fried yam, potato, plantain, fish, Chicken, pap, Akara etc.', 'Akara N100,Yam N100, potatoes N100, Fish N500-1,000, pap 500, plantain (3) N500 and Fried chicken N1,200-1,500', null, true
from public.vendors as vendor
where vendor.id = '6d9ca0f7-3ea6-4792-a2dc-4f44705425db'
  and vendor.slug = 'favour-row-021';

-- Madam Indomie (madam-indomie-row-016)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 16; match=suffix_row_number
-- Current: Indomie,egg,drinks | Indomie,egg,drinks | Indomie,egg,drinks
-- Proposed: Indomie,egg,drinks |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '7669ff47-871d-45a0-a52f-2f57a9e3e1a6'
  and vendor.slug = 'madam-indomie-row-016';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Indomie,egg,drinks', 'All sort of Soft drinks Indomie and 2eggs N1,500', null, true
from public.vendors as vendor
where vendor.id = '7669ff47-871d-45a0-a52f-2f57a9e3e1a6'
  and vendor.slug = 'madam-indomie-row-016';

-- Madam Indomie (madam-indomie-row-067)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 67; match=suffix_row_number
-- Current: Toasted bread and Tea, indomie and egg | Toasted bread and Tea, indomie and egg | Toasted bread and Tea, indomie and egg
-- Proposed: Toasted bread and Tea, indomie and egg |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '8ffa3022-f619-4bb5-98de-cf976e28d2b3'
  and vendor.slug = 'madam-indomie-row-067';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Toasted bread and Tea, indomie and egg', 'Indomie and egg for N1800-2500. Toasted bread and Tea N2500', null, true
from public.vendors as vendor
where vendor.id = '8ffa3022-f619-4bb5-98de-cf976e28d2b3'
  and vendor.slug = 'madam-indomie-row-067';

-- Mama mary (mama-mary-2)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 3 workbook row 14; match=generated_csv_row_to_workbook_row
-- Current: roasted plantain, porridge beans, roasted yam roasted fish, and kpomo with Stew. | roasted plantain, porridge beans, roasted yam roasted fish, and kpomo with Stew. | roasted plantain, porridge beans, roasted yam roasted fish, and kpomo with Stew.
-- Proposed: roasted plantain, porridge beans, roasted yam roasted fish, and kpomo with Stew. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'c867df5c-497d-4b9f-b4a1-3c66622c8d5d'
  and vendor.slug = 'mama-mary-2';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'roasted plantain, porridge beans, roasted yam roasted fish, and kpomo with Stew.', 'plantain and porridge beans with kpomo for N1700, same with plantain and beans with kpomo, roasted fish for N1,000 and above.', null, true
from public.vendors as vendor
where vendor.id = 'c867df5c-497d-4b9f-b4a1-3c66622c8d5d'
  and vendor.slug = 'mama-mary-2';

-- Mama Obinna (mama-obinna-row-061)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 61; match=suffix_row_number
-- Current: yam, plantain and porridge beans with bread. | yam, plantain and porridge beans with bread. | yam, plantain and porridge beans with bread.
-- Proposed: yam, plantain and porridge beans with bread. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '59de3569-ac47-435f-8f62-198740946c1d'
  and vendor.slug = 'mama-obinna-row-061';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, plantain and porridge beans with bread.', 'Roasted Yam and porridge beans with kpomo N2,000 Roasted plantain with porridge beans and kpomo N2,000', null, true
from public.vendors as vendor
where vendor.id = '59de3569-ac47-435f-8f62-198740946c1d'
  and vendor.slug = 'mama-obinna-row-061';

-- Mama Obinna (mama-obinna-row-035)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 35; match=suffix_row_number
-- Current: Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi. | Jollof rice, rice and stew, swallow and soup, Moi Moi.
-- Proposed: Jollof rice, rice and stew, swallow and soup, Moi Moi. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'bec25004-cc08-4db2-aeec-9cb153902e2d'
  and vendor.slug = 'mama-obinna-row-035';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Jollof rice, rice and stew, swallow and soup, Moi Moi.', 'Jollof rice, and meat N1,300, Rice and stew with meat N1,300 Beans and Yam with meat N1,500 Swallow: Apu, garri, Semo Soup: Egusi, ogbono, okro, oha. Moi Moi 2 for N500.', null, true
from public.vendors as vendor
where vendor.id = 'bec25004-cc08-4db2-aeec-9cb153902e2d'
  and vendor.slug = 'mama-obinna-row-035';

-- Mama sisi (mama-sisi-row-098)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 98; match=suffix_row_number
-- Current: Roasted yam, plantain, beans, potatoe | Roasted yam, plantain, beans, potatoe | Roasted yam, plantain, beans, potatoe
-- Proposed: Roasted yam, plantain, beans, potatoe |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '8e1ee3c4-c715-484e-816c-098e35bc881b'
  and vendor.slug = 'mama-sisi-row-098';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, beans, potatoe', 'Roasted yam N1000,Roasted potatoes, Roasted plantain, kpomo N200, Roasted fishN1,000, porridge beans,N700', null, true
from public.vendors as vendor
where vendor.id = '8e1ee3c4-c715-484e-816c-098e35bc881b'
  and vendor.slug = 'mama-sisi-row-098';

-- Mama Sisi (mama-sisi-row-097)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 97; match=suffix_row_number
-- Current: Roasted yam, plantain, porridge beans. | Roasted yam, plantain, porridge beans. | Roasted yam, plantain, porridge beans.
-- Proposed: Roasted yam, plantain, porridge beans. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '9956b23c-7ff4-40f9-aae1-639ea97920c0'
  and vendor.slug = 'mama-sisi-row-097';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, porridge beans.', 'Roasted yam and porridge beans for N1500, with fish is N2,000. plantain and beans N1500 potatoe and beans N1,000.', null, true
from public.vendors as vendor
where vendor.id = '9956b23c-7ff4-40f9-aae1-639ea97920c0'
  and vendor.slug = 'mama-sisi-row-097';

-- Mme Suya (mme-suya-row-092)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 92; match=suffix_row_number
-- Current: Suya and Masa | Suya and Masa | Suya and Masa
-- Proposed: Suya and Masa |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'ccc16e7b-4f57-4ae9-99f2-4f889751115f'
  and vendor.slug = 'mme-suya-row-092';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Suya and Masa', 'Suya from N3,000-5000 upward and Masa N500.', null, true
from public.vendors as vendor
where vendor.id = 'ccc16e7b-4f57-4ae9-99f2-4f889751115f'
  and vendor.slug = 'mme-suya-row-092';

-- Mme Suya (mme-suya-row-083)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 83; match=suffix_row_number
-- Current: Suya And Masa | Suya And Masa | Suya And Masa
-- Proposed: Suya And Masa |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '3ae998fa-ce56-4b06-8086-8c621ba9bcde'
  and vendor.slug = 'mme-suya-row-083';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Suya And Masa', 'Suya, and Masa, gurasa', null, true
from public.vendors as vendor
where vendor.id = '3ae998fa-ce56-4b06-8086-8c621ba9bcde'
  and vendor.slug = 'mme-suya-row-083';

-- Zoveno kitchen (zoveno-kitchen-row-028)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 28; match=suffix_row_number
-- Current: Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc. | Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc. | Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc.
-- Proposed: Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'd5d1058d-62aa-467c-ace8-8e4731a4d095'
  and vendor.slug = 'zoveno-kitchen-row-028';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc.', 'Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwoshinkafa N4,000, Afang soup and Tuwoshinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.', null, true
from public.vendors as vendor
where vendor.id = 'd5d1058d-62aa-467c-ace8-8e4731a4d095'
  and vendor.slug = 'zoveno-kitchen-row-028';

-- Zoveno kitchen (zoveno-kitchen-row-029)
-- Status: SOURCE_CONFIRMED | Correction: KEEP_SINGLE_DISH_ONLY | Evidence: Batch 4 workbook row 29; match=suffix_row_number
-- Current: Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc. | Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc. | Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc.
-- Proposed: Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc. |  | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'ef37cc4c-fa50-4dc6-834b-dd0a7fa85f8d'
  and vendor.slug = 'zoveno-kitchen-row-029';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc.', 'Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwoshinkafa N4,000, Afang soup and Tuwoshinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.', null, true
from public.vendors as vendor
where vendor.id = 'ef37cc4c-fa50-4dc6-834b-dd0a7fa85f8d'
  and vendor.slug = 'zoveno-kitchen-row-029';

-- Blessing (blessing)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 3 workbook row 9; match=source_evidence_row
-- Current: Indomie and fried egg | she cooks indomie and frys egg | she cooks indomie and frys egg
-- Proposed: Indomie and fried egg | she cooks indomie and frys egg | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '1de74c9a-7651-48c3-bf89-8d4af7231c81'
  and vendor.slug = 'blessing';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Indomie and fried egg', 'indomie and fried egg fromN1500 upward', null, true
from public.vendors as vendor
where vendor.id = '1de74c9a-7651-48c3-bf89-8d4af7231c81'
  and vendor.slug = 'blessing';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'she cooks indomie and frys egg', 'indomie and fried egg fromN1500 upward', null, true
from public.vendors as vendor
where vendor.id = '1de74c9a-7651-48c3-bf89-8d4af7231c81'
  and vendor.slug = 'blessing';

-- Madam Fish (madam-fish)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 3 workbook row 4; match=source_evidence_row
-- Current: Roasted Catfish and source, Salad, chips etc ranging from N5,000, N6,000 and N 10,000 | Roasted Catfish and source, Salad, chips etc ranging from N5,000, N6,000 and N 10,000 | Catfish and source with Salad and chips
-- Proposed: Roasted Catfish and source, Salad, chips etc ranging from N5,000, N6,000 and N 10,000 | Catfish and source with Salad and chips | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '078538ac-4280-4512-8fb8-e664b2087929'
  and vendor.slug = 'madam-fish';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted Catfish and source, Salad, chips etc ranging from N5,000, N6,000 and N 10,000', 'Roasted Catfish and source, Salad, chips etc , N6,000 and N 10,000', null, true
from public.vendors as vendor
where vendor.id = '078538ac-4280-4512-8fb8-e664b2087929'
  and vendor.slug = 'madam-fish';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Catfish and source with Salad and chips', 'Roasted Catfish and source, Salad, chips etc , N6,000 and N 10,000', null, true
from public.vendors as vendor
where vendor.id = '078538ac-4280-4512-8fb8-e664b2087929'
  and vendor.slug = 'madam-fish';

-- madam food (madam-food)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 4 workbook row 71; match=source_evidence_row
-- Current: fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup. | Jollof rice, white rice, porridge beans. | Jollof rice, white rice, porridge beans.
-- Proposed: Jollof rice, white rice, porridge beans. | fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup. | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '77401809-c482-4174-8491-b80bbab1c02d'
  and vendor.slug = 'madam-food';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Jollof rice, white rice, porridge beans.', 'Jollof rice, white rice, porridge beans, fish,meat, Swallow: Semo, poundo, Apu, garri Wheat Soup: Egusi, okro, bitter leaf, vegetable, oha etc.', null, true
from public.vendors as vendor
where vendor.id = '77401809-c482-4174-8491-b80bbab1c02d'
  and vendor.slug = 'madam-food';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'fried fish, Meat, kpomo, jollof rice, rice and stew, swallow and soup.', 'Jollof rice, white rice, porridge beans, fish,meat, Swallow: Semo, poundo, Apu, garri Wheat Soup: Egusi, okro, bitter leaf, vegetable, oha etc.', null, true
from public.vendors as vendor
where vendor.id = '77401809-c482-4174-8491-b80bbab1c02d'
  and vendor.slug = 'madam-food';

-- Madam Roasted yam (madam-roasted-yam)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 4 workbook row 84; match=source_evidence_row
-- Current: She sells Roasted yam, plantain, kpomo, roasted fish,and porridge beans. | Roasted yam, plantain, kpomo, fish etc. | She sells Roasted yam, plantain, kpomo, roasted fish,and porridge beans.
-- Proposed: She sells Roasted yam, plantain, kpomo, roasted fish,and porridge beans. | Roasted yam, plantain, kpomo, fish etc. | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'cd169e60-0813-4549-af9e-c5a6a8b2fffa'
  and vendor.slug = 'madam-roasted-yam';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'She sells Roasted yam, plantain, kpomo, roasted fish,and porridge beans.', 'Roasted yam, plantain, kpomo, roasted fish,and porridge beans.', null, true
from public.vendors as vendor
where vendor.id = 'cd169e60-0813-4549-af9e-c5a6a8b2fffa'
  and vendor.slug = 'madam-roasted-yam';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Roasted yam, plantain, kpomo, fish etc.', 'Roasted yam, plantain, kpomo, roasted fish,and porridge beans.', null, true
from public.vendors as vendor
where vendor.id = 'cd169e60-0813-4549-af9e-c5a6a8b2fffa'
  and vendor.slug = 'madam-roasted-yam';

-- Mama Akara (mama-akara)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 1 workbook row 11; match=source_evidence_row
-- Current: yam, jollof rice meat fish beans swallow etc. | yam, potato, Akara, pap and bread | yam, potato, Akara, pap and bread
-- Proposed: yam, potato, Akara, pap and bread | yam, jollof rice meat fish beans swallow etc. | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '1c36c12b-cef2-4ec4-a81c-9f5a26bf5b50'
  and vendor.slug = 'mama-akara';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, potato, Akara, pap and bread', 'She sells,poff poff Akaara, plantain, potato, yam, bread and pap.', null, true
from public.vendors as vendor
where vendor.id = '1c36c12b-cef2-4ec4-a81c-9f5a26bf5b50'
  and vendor.slug = 'mama-akara';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, jollof rice meat fish beans swallow etc.', 'She sells,poff poff Akaara, plantain, potato, yam, bread and pap.', null, true
from public.vendors as vendor
where vendor.id = '1c36c12b-cef2-4ec4-a81c-9f5a26bf5b50'
  and vendor.slug = 'mama-akara';

-- Mama Mmesoma (mama-mmesoma)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 4 workbook row 73; match=source_evidence_row
-- Current: Rice, jollof, beans, salad, yam ,fried plantain etc | Fish meat, yam, rice, swallow, jollof rice etc. | Fish meat, yam, rice, swallow, jollof rice etc.
-- Proposed: Rice, jollof, beans, salad, yam ,fried plantain etc | Fish meat, yam, rice, swallow, jollof rice etc. | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '309535d8-6a43-4673-8516-911566a8a414'
  and vendor.slug = 'mama-mmesoma';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, jollof, beans, salad, yam ,fried plantain etc', 'white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and Banger soup. Swallow, Apu semo garri wheat Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, lntestine, ro', null, true
from public.vendors as vendor
where vendor.id = '309535d8-6a43-4673-8516-911566a8a414'
  and vendor.slug = 'mama-mmesoma';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fish meat, yam, rice, swallow, jollof rice etc.', 'white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and Banger soup. Swallow, Apu semo garri wheat Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, lntestine, ro', null, true
from public.vendors as vendor
where vendor.id = '309535d8-6a43-4673-8516-911566a8a414'
  and vendor.slug = 'mama-mmesoma';

-- Mme Awara (mme-awara)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 4 workbook row 86; match=source_evidence_row
-- Current: Awara, Stew and yaji pepper | Awara, stew, Yaji pepper | Awara, Stew and yaji pepper
-- Proposed: Awara, stew, Yaji pepper | Awara, Stew and yaji pepper | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'bdfe5271-cbfc-495a-a2a5-0960547efebd'
  and vendor.slug = 'mme-awara';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Awara, stew, Yaji pepper', 'Awara, Stew and yaji pepper', null, true
from public.vendors as vendor
where vendor.id = 'bdfe5271-cbfc-495a-a2a5-0960547efebd'
  and vendor.slug = 'mme-awara';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Awara, Stew and yaji pepper', 'Awara, Stew and yaji pepper', null, true
from public.vendors as vendor
where vendor.id = 'bdfe5271-cbfc-495a-a2a5-0960547efebd'
  and vendor.slug = 'mme-awara';

-- Mme Fura (mme-fura)
-- Status: SOURCE_CONFIRMED | Correction: REMOVE_DUPLICATE_DISHES | Evidence: Batch 4 workbook row 82; match=source_evidence_row
-- Current: Fura and Nunu | Fura dinunu | Fura and Nunu
-- Proposed: Fura dinunu | Fura and Nunu | 
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '12b45144-d070-4a83-8bb9-4624cc93778f'
  and vendor.slug = 'mme-fura';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fura dinunu', 'Fura and Nunu', null, true
from public.vendors as vendor
where vendor.id = '12b45144-d070-4a83-8bb9-4624cc93778f'
  and vendor.slug = 'mme-fura';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Fura and Nunu', 'Fura, and Nunu', null, true
from public.vendors as vendor
where vendor.id = '12b45144-d070-4a83-8bb9-4624cc93778f'
  and vendor.slug = 'mme-fura';

-- Laraba (laraba)
-- Status: SOURCE_CONFIRMED | Correction: RESTORE_DISTINCT_DISHES | Evidence: Batch 2 workbook row 15; match=source_evidence_row
-- Current: yam, jollof rice meat fish beans swallow etc. | Rice and stew , beans, yam, moi moi etc. | Rice and stew, beans, swallow and all kinds of protein.
-- Proposed: Rice and stew, beans, swallow and all kinds of protein. | Rice and stew , beans, yam, moi moi etc. | yam, jollof rice meat fish beans swallow etc.
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '00311f1f-e756-4cd4-84ee-5257b805c90e'
  and vendor.slug = 'laraba';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew, beans, swallow and all kinds of protein.', 'fried plantain N100, Rice and stew (take away N2,200, garri, Apu, semo, pounded yam N2500 , egg N300, jollof rice N2500, etc.', null, true
from public.vendors as vendor
where vendor.id = '00311f1f-e756-4cd4-84ee-5257b805c90e'
  and vendor.slug = 'laraba';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice and stew , beans, yam, moi moi etc.', 'fried plantain N100, Rice and stew (take away N2,200, garri, Apu, semo, pounded yam N2500 , egg N300, jollof rice N2500, etc.', null, true
from public.vendors as vendor
where vendor.id = '00311f1f-e756-4cd4-84ee-5257b805c90e'
  and vendor.slug = 'laraba';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, jollof rice meat fish beans swallow etc.', 'fried plantain N100, Rice and stew (take away N2,200, garri, Apu, semo, pounded yam N2500 , egg N300, jollof rice N2500, etc.', null, true
from public.vendors as vendor
where vendor.id = '00311f1f-e756-4cd4-84ee-5257b805c90e'
  and vendor.slug = 'laraba';

-- madam Ekaette (madam-ekaette)
-- Status: SOURCE_CONFIRMED | Correction: RESTORE_DISTINCT_DISHES | Evidence: Batch 1 workbook row 13; match=source_evidence_row
-- Current: Rice, beans, Afang, Egusi, pap, and bread | Rice, beans, Afang, okro, Egusi, pap and bread. | Food like jellof rice,moi moi, beans pap and bread with Bole
-- Proposed: Rice, beans, Afang, Egusi, pap, and bread | Food like jellof rice,moi moi, beans pap and bread with Bole | Rice, beans, Afang, okro, Egusi, pap and bread.
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '8a0b70c2-3aff-4db9-9e88-2ac35f370cbb'
  and vendor.slug = 'madam-ekaette';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans, Afang, Egusi, pap, and bread', 'pap, porridge beans and bread, soups like Afang, oha, bitter leaf okro, Egusi etc. swallow: fufu, semo garri, wheat.', null, true
from public.vendors as vendor
where vendor.id = '8a0b70c2-3aff-4db9-9e88-2ac35f370cbb'
  and vendor.slug = 'madam-ekaette';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Food like jellof rice,moi moi, beans pap and bread with Bole', 'pap, porridge beans and bread, soups like Afang, oha, bitter leaf okro, Egusi etc. swallow: fufu, semo garri, wheat.', null, true
from public.vendors as vendor
where vendor.id = '8a0b70c2-3aff-4db9-9e88-2ac35f370cbb'
  and vendor.slug = 'madam-ekaette';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Rice, beans, Afang, okro, Egusi, pap and bread.', 'pap, porridge beans and bread, soups like Afang, oha, bitter leaf okro, Egusi etc. swallow: fufu, semo garri, wheat.', null, true
from public.vendors as vendor
where vendor.id = '8a0b70c2-3aff-4db9-9e88-2ac35f370cbb'
  and vendor.slug = 'madam-ekaette';

-- mummy good luck (mummy-good-luck)
-- Status: SOURCE_CONFIRMED | Correction: RESTORE_DISTINCT_DISHES | Evidence: Batch 1 workbook row 18; match=source_evidence_row
-- Current: Food like jellof rice,moi moi, beans etc. | yam, potato, Akara, pap and bread | yam, jollof rice meat fish beans swallow etc.
-- Proposed: yam, potato, Akara, pap and bread | Food like jellof rice,moi moi, beans etc. | yam, jollof rice meat fish beans swallow etc.
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and vendor.slug = 'mummy-good-luck';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, potato, Akara, pap and bread', 'yam for 50, potatoes 50, pap 300 and brea 300.', null, true
from public.vendors as vendor
where vendor.id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and vendor.slug = 'mummy-good-luck';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Food like jellof rice,moi moi, beans etc.', 'yam for 50, potatoes 50, pap 300 and brea 300.', null, true
from public.vendors as vendor
where vendor.id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and vendor.slug = 'mummy-good-luck';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, jollof rice meat fish beans swallow etc.', 'yam for 50, potatoes 50, pap 300 and brea 300.', null, true
from public.vendors as vendor
where vendor.id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and vendor.slug = 'mummy-good-luck';

-- quasi quasi (quasi-quasi)
-- Status: SOURCE_CONFIRMED | Correction: RESTORE_DISTINCT_DISHES | Evidence: Batch 2 workbook row 14; match=source_evidence_row
-- Current: yam, pap, potato, plantain,fish, kpomo | yam, pap, potato, plantain, fish, kpomo | plantain,yam, kpomo, fish, potato, and pap
-- Proposed: plantain,yam, kpomo, fish, potato, and pap | yam, pap, potato, plantain, fish, kpomo | yam, pap, potato, plantain,fish, kpomo
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = '811983fa-b3c3-4b82-9a70-4976d6925e99'
  and vendor.slug = 'quasi-quasi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'plantain,yam, kpomo, fish, potato, and pap', 'yam,N100 plantain N100, Akara N50, pap N300, potato N100, Fried fish N1,000, Kpomo N200.', null, true
from public.vendors as vendor
where vendor.id = '811983fa-b3c3-4b82-9a70-4976d6925e99'
  and vendor.slug = 'quasi-quasi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, pap, potato, plantain, fish, kpomo', 'yam,N100 plantain N100, Akara N50, pap N300, potato N100, Fried fish N1,000, Kpomo N200.', null, true
from public.vendors as vendor
where vendor.id = '811983fa-b3c3-4b82-9a70-4976d6925e99'
  and vendor.slug = 'quasi-quasi';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'yam, pap, potato, plantain,fish, kpomo', 'yam,N100 plantain N100, Akara N50, pap N300, potato N100, Fried fish N1,000, Kpomo N200.', null, true
from public.vendors as vendor
where vendor.id = '811983fa-b3c3-4b82-9a70-4976d6925e99'
  and vendor.slug = 'quasi-quasi';

-- Ui best suya (ui-best-suya)
-- Status: SOURCE_CONFIRMED | Correction: RESTORE_DISTINCT_DISHES | Evidence: Batch 1 workbook row 8; match=source_evidence_row
-- Current: Masa and Gizzard | Beef, ram and chicken Suya | Drinks and water
-- Proposed: Masa and Gizzard | Beef, ram and chicken Suya | Drinks and water
delete from public.vendor_featured_dishes as dish
using public.vendors as vendor
where dish.vendor_id = vendor.id
  and vendor.id = 'd5610832-98bb-4708-8d08-8cb9a95f0429'
  and vendor.slug = 'ui-best-suya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Masa and Gizzard', 'Sells beef , chicken, and ram suya with masa and gizzard', null, true
from public.vendors as vendor
where vendor.id = 'd5610832-98bb-4708-8d08-8cb9a95f0429'
  and vendor.slug = 'ui-best-suya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Beef, ram and chicken Suya', 'Sells beef , chicken, and ram suya with masa and gizzard', null, true
from public.vendors as vendor
where vendor.id = 'd5610832-98bb-4708-8d08-8cb9a95f0429'
  and vendor.slug = 'ui-best-suya';
insert into public.vendor_featured_dishes (vendor_id, dish_name, description, image_url, is_featured)
select vendor.id, 'Drinks and water', null, null, true
from public.vendors as vendor
where vendor.id = 'd5610832-98bb-4708-8d08-8cb9a95f0429'
  and vendor.slug = 'ui-best-suya';

rollback;
