-- Localman content quality corrections
-- Draft only. Review before execution.
-- Scope: human-readable vendor names/descriptions and featured dish names/descriptions only.
-- Does not update coordinates, phones, areas, categories, hours, ratings, analytics, search, discovery, map, or slugs.
begin;

-- 1. Ahjiah (ahjiah)
-- Field: Vendor description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendors
set short_description = 'she sells Akara pap white rice and stew , jollof rice,moi moi Awara sweet potatoes, Tuwo Shinkafa, kunu ngeda, yam etc.'
where id = '5a79d518-3ff9-4065-876f-0715955f4fe5'
  and slug = 'ahjiah'
  and short_description = 'she sells Akara pap white rice and stew , jollof rice,moi moi Awara sweet potatoes, Tuwoshinkafa, kunu ngeda, yam etc.';

-- 2. Mama Jemila Akara and pap (mama-jemila-akara-and-pap)
-- Field: Vendor description | Reason: local food canonicalization: masah -> Masa
update public.vendors
set short_description = 'Prepares and fries Beans cakes popularly known as Akara alongside with pap. Mama Jemila make Masa-- a popular northern cuisine. Here you can also get other fried foods like potatoes, and yams'
where id = '9baad873-2fc9-45fc-8b52-e8d4b2ce730a'
  and slug = 'mama-jemila-akara-and-pap'
  and short_description = 'Prepares and fries Beans cakes popularly known as Akara alongside with pap. Mama Jemila make masah-- a popular northern cuisine. Here you can also get other fried foods like potatoes, and yams';

-- 3. Madam Cynthia Roasted yams, plantains nd Beans (madam-cynthia-roasted-yams-plantains-nd-beans)
-- Field: Vendor name | Reason: obvious spelling: nd -> and
update public.vendors
set name = 'Madam Cynthia Roasted yams, plantains and Beans'
where id = '0b2c89c1-523b-4699-a1e7-114cc034ade3'
  and slug = 'madam-cynthia-roasted-yams-plantains-nd-beans'
  and name = 'Madam Cynthia Roasted yams, plantains nd Beans';

-- 4. mme Masa (mme-masa)
-- Field: Vendor description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendors
set short_description = 'She sells Masa with yaji pepper and sauce with Tuwo Shinkafa.'
where id = 'f053aa03-43c0-4aca-9d28-31642965a2b9'
  and slug = 'mme-masa'
  and short_description = 'She sells Masa with yaji pepper and sauce with Tuwoshinkafa.';

-- 5. Madam Fish (madam-fish)
-- Field: Vendor description | Reason: food-context spelling: source -> sauce
update public.vendors
set short_description = 'Roasted Catfish and sauce, Salad, chips etc ranging from N5,000, N6,000 and N 10,000'
where id = '078538ac-4280-4512-8fb8-e664b2087929'
  and slug = 'madam-fish'
  and short_description = 'Roasted Catfish and source, Salad, chips etc ranging from N5,000, N6,000 and N 10,000';

-- 6. Chizzy African food (chizzy-african-food)
-- Field: Vendor description | Reason: obvious spelling: biterleaf -> bitter leaf
update public.vendors
set short_description = 'She Sells Rice and stew with beans, Goat meat, oha soup Apu, Egusi, bitter leaf, Afang, white soup, Ofaku stew etc ranging N1500-3500'
where id = 'b3b720b7-738f-436f-b226-6df4abd2f29a'
  and slug = 'chizzy-african-food'
  and short_description = 'She Sells Rice and stew with beans, Goat meat, oha soup Apu, Egusi, biterleaf, Afang, white soup, Ofaku stew etc ranging N1500-3500';

-- 7. NIKIS SPECIAL (nikis-special)
-- Field: Vendor description | Reason: readability spacing
update public.vendors
set short_description = 'fried fish N500,1500,2000. chicken N1500, 2000, fried rice chicken and Salad N5000, Rice and stew with beans N1,500, porridge beans N700, plantain 3 for N500 Swallow: Semo Apu and garri, wheat. Soup: Vegetable soup N2,000,bitter leaf, oha, Egusi with pack N2,000and white soup N3500'
where id = '50e1fddc-b069-4d07-a955-9d7f199c99f0'
  and slug = 'nikis-special'
  and short_description = 'fried fish N500,1500,2000. chicken N1500, 2000, fried rice chicken and Salad N5000, Rice and stew with beans N1,500, porridge beans N700, plantain 3 for N500 Swallow: Semo Apu and garri, wheat. Soup: Vegetable soupN2,000,bitter leaf, oha, Egusi with pack N2,000and white soup N3500';

-- 8. NATIONS EAT PLATE FAST FOOD (nations-eat-plate-fast-food)
-- Field: Vendor description | Reason: obvious spelling: Sharwama -> Shawarma
update public.vendors
set short_description = 'He sells Meatpie N600, Chin chin from N500-2,000 Egg roll N700, Bons N100, Shawarma ranging from N2700-5500 Indomie and 2eggs N1400-2,000 Burger N3,700 Party jollof rice on Order All kinds of drinks N400-500'
where id = '44e49ce9-1480-4626-85fc-66efed72b464'
  and slug = 'nations-eat-plate-fast-food'
  and short_description = 'He sells Meatpie N600, Chin chin from N500-2,000 Egg roll N700, Bons N100, Sharwama ranging from N2700-5500 Indomie and 2eggs N1400-2,000 Burger N3,700 Party jollof rice on Order All kinds of drinks N400-500';

-- 9. Madam TIV (madam-tiv)
-- Field: Vendor description | Reason: readability: 2egg -> 2 eggs
update public.vendors
set short_description = 'She sells Indomie and 2 eggs N1,500 white Rice, stew  and beans with meat N1,500 Swallow: Semo, Apu, garri Soup: okro Egusi, vegetable, oha, N1,500-N2,000,white soup N2,500, Afang soup N1,500'
where id = '2e424cd9-e881-4491-92bf-60ed1037fe00'
  and slug = 'madam-tiv'
  and short_description = 'She sells Indomie and 2egg N1,500 white Rice, stew  and beans with meat N1,500 Swallow: Semo, Apu, garri Soup: okro Egusi, vegetable, oha, N1,500-N2,000,white soup N2,500, Afang soup N1,500';

-- 10. Iya (iya)
-- Field: Vendor description | Reason: obvious spelling: Doghnut -> Doughnut
update public.vendors
set short_description = 'She sells Meatpie N600, Sausage roll N600 ,Egg roll N600, Doughnut N100-300, Bons N100, Puff puff N100, peanut N100. All kinds of Soft Drinks ranging from N400-1,000'
where id = 'dacabe92-ac86-44fc-92cc-6cc29d0954b8'
  and slug = 'iya'
  and short_description = 'She sells Meatpie N600, Sausage roll N600 ,Egg roll N600, Doghnut N100-300, Bons N100, Puff puff N100, peanut N100. All kinds of Soft Drinks ranging from N400-1,000';

-- 11. Mama Lovina (mama-lovina)
-- Field: Vendor description | Reason: obvious spelling: Biterleaf -> Bitter leaf
update public.vendors
set short_description = 'She sells White Rice and stew with meat and beans N1,300 jollof rice with salad and meat N1800, with fish and Salad N2,500 Moi Moi 2 N500 Swallow: Apu, garri,Semo, Soup: Egusi, Bitter leaf,Oha, okro, ranging from N1,200-1,500 All kinds of Soft drinks N500-600.'
where id = '3dff637b-7b45-48f6-8587-fc059cde44da'
  and slug = 'mama-lovina'
  and short_description = 'She sells White Rice and stew with meat and beans N1,300 jollof rice with salad and meat N1800, with fish and Salad N2,500 Moi Moi 2 N500 Swallow: Apu, garri,Semo, Soup: Egusi, Biterleaf,Oha, okro, ranging from N1,200-1,500 All kinds of Soft drinks N500-600.';

-- 12. Mummy Samuel (mummy-samuel)
-- Field: Vendor description | Reason: obvious spelling: Biterleaf -> Bitter leaf
update public.vendors
set short_description = 'She sells Rice and stew with beans N1,200-1,500  Swallow:Apu, Eba, Tuwomasara, garri  Soup: Bitter leaf soup, Egusi,Oha,okro, Ogbono, etc.ranging from N1500-2,000.'
where id = '51564a19-92d0-4609-90f4-49535c75c425'
  and slug = 'mummy-samuel'
  and short_description = 'She sells Rice and stew with beans N1,200-1,500  Swallow:Apu, Eba, Tuwomasara, garri  Soup: Biterleaf soup, Egusi,Oha,okro, Ogbono, etc.ranging from N1500-2,000.';

-- 13. Zoveno kitchen (zoveno-kitchen-row-029)
-- Field: Vendor description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendors
set short_description = 'She sells Masa and Sauce N1500,  Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwo Shinkafa N4,000, Afang soup and Tuwo Shinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.'
where id = 'ef37cc4c-fa50-4dc6-834b-dd0a7fa85f8d'
  and slug = 'zoveno-kitchen-row-029'
  and short_description = 'She sells Masa and Sauce N1500,  Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwoshinkafa N4,000, Afang soup and Tuwoshinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.';

-- 14. Mama Hassan (mama-hassan)
-- Field: Vendor description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendors
set short_description = 'Tuwo ndawa N300, Shinkafa Jollof N1500,Tuwo Shinkafa N500, Masa and Soup N100-500,1,000 and Yaji pepper, yaji kuli Kuli, Rice and stew with meat,N1,500, ARABIAN TEA N500-1500 pepper with assorted intestines N1,000'
where id = '376fe8a3-abba-4d46-82ba-e7fa1292b8f6'
  and slug = 'mama-hassan'
  and short_description = 'Tuwo ndawa N300, Shinkafa Jollof N1500,Tuwoshinkafa N500, Masa and Soup N100-500,1,000 and Yaji pepper, yaji kuli Kuli, Rice and stew with meat,N1,500, ARABIAN TEA N500-1500 pepper with assorted intestines N1,000';

-- 15. Nikxy nice (nikxy-nice)
-- Field: Vendor description | Reason: obvious spelling: Doghnut -> Doughnut; obvious spelling: mearpie -> meat pie
update public.vendors
set short_description = 'She sells Egg roll N700, meat pie, N1,200, sausage roll N1,000, Slice Cake, N1,000, Doughnut N400, Chin chin N1,000-35,000(25kg), Puff puff 5 for N400, Bons N100, Fish roll N1,000, Samosa,and Spring rolls both fried And fresh ranging from N300 and above.'
where id = 'fa5256ab-6714-4552-91f4-1bec3fc27d5a'
  and slug = 'nikxy-nice'
  and short_description = 'She sells Egg roll N700, mearpie, N1,200, sausage roll N1,000, Slice Cake, N1,000, Doghnut N400, Chin chin N1,000-35,000(25kg), Puff puff 5 for N400, Bons N100, Fish roll N1,000, Samosa,and Spring rolls both fried And fresh ranging from N300 and above.';

-- 16. Mma Afam (mma-afam)
-- Field: Vendor description | Reason: readability spacing only; term left unchanged
update public.vendors
set short_description = 'Bones N100, Egg Roll N500, Fish roll N400, Bread Bones N300, Apu,N200, Bread,N300-500 Zobo drink N200, Kunu,N300, Bottle Mineral N400, plastic Mineral N500, Bottle water N200.'
where id = '7f789021-53dd-4698-9e42-d5869631a36d'
  and slug = 'mma-afam'
  and short_description = 'BonesN100, Egg Roll N500, Fish roll N400, Bread Bones N300, Apu,N200, Bread,N300-500 Zobo drink N200, Kunu,N300, Bottle Mineral N400, plastic Mineral N500, Bottle water N200.';

-- 17. Potable kitchen (potable-kitchen)
-- Field: Vendor description | Reason: obvious spelling: biterleaf -> bitter leaf; readability spacing
update public.vendors
set short_description = 'Jollof rice N1500  white rice and stew N1500, yam and beans N1500  Banger soup N2500   Egusi soup N1500   Okro soup N1500   bitter leaf soup N1500             Afang soup N2,000  vegetable soup N2,000'
where id = '356a0954-e41d-44ed-87b4-8fe5d982d6d6'
  and slug = 'potable-kitchen'
  and short_description = 'Jollof rice N1500  white rice and stew N1500, yam and beans N1500  Banger soup N2500   Egusi soup N1500   Okro soup N1500   biterleaf soup N1500             Afang soupN2,000  vegetable soup N2,000';

-- 18. Zoveno kitchen (zoveno-kitchen-row-028)
-- Field: Vendor description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendors
set short_description = 'She sells Masa and Sauce N1500,  Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwo Shinkafa N4,000, Afang soup and Tuwo Shinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.'
where id = 'd5d1058d-62aa-467c-ace8-8e4731a4d095'
  and slug = 'zoveno-kitchen-row-028'
  and short_description = 'She sells Masa and Sauce N1500,  Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwoshinkafa N4,000, Afang soup and Tuwoshinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.';

-- 19. G&G Restaurant (g-g-restaurant)
-- Field: Vendor description | Reason: obvious spelling: biterleaf -> bitter leaf
update public.vendors
set short_description = 'She sells, Rice and stew with meat N1,200 Jollof rice with meat and Fish N1,700-2000 Swallow: Apu, Semo Garri, Wheat pounded yam. Soup; Afang, Egusi, bitter leaf, vegetable soup and Ogbono.from N1,200-1700.'
where id = 'b922b3d2-8f30-4fe1-8df2-4c7231d55475'
  and slug = 'g-g-restaurant'
  and short_description = 'She sells, Rice and stew with meat N1,200 Jollof rice with meat and Fish N1,700-2000 Swallow: Apu, Semo Garri, Wheat pounded yam. Soup; Afang, Egusi, biterleaf, vegetable soup and Ogbono.from N1,200-1700.';

-- 20. Mama Mmesoma (mama-mmesoma)
-- Field: Vendor description | Reason: obvious spelling: lntestine -> intestine
update public.vendors
set short_description = 'She sells white rice and beans, jollof rice, white yam and stew with porridge beans,  white rice and Banger soup. Swallow, Apu semo garri wheat  Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, intestine, roundabout, liver etc. From N1200-2500.'
where id = '309535d8-6a43-4673-8516-911566a8a414'
  and slug = 'mama-mmesoma'
  and short_description = 'She sells white rice and beans, jollof rice, white yam and stew with porridge beans,  white rice and Banger soup. Swallow, Apu semo garri wheat  Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, lntestine, roundabout, liver etc. From N1200-2500.';

-- 21. Joy Cathering and outdoor services (joy-cathering-and-outdoor-services)
-- Field: Vendor name | Reason: obvious spelling: Cathering -> Catering
update public.vendors
set name = 'Joy Catering and outdoor services'
where id = 'cce1c7cf-7251-4327-a8d9-3193d4c2dec4'
  and slug = 'joy-cathering-and-outdoor-services'
  and name = 'Joy Cathering and outdoor services';

-- 22. Mama Amira (mama-amira)
-- Field: Vendor description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendors
set short_description = 'She sells Masa, N100 white rice and stew with meat N900 Dawanki N600-1,000   jollof rice N900     pepper soup N1,000  Tuwo Shinkafa N250-300    Goat head N1,000    fried cow meat N200'
where id = 'dc03e05d-6850-4d8f-bec6-b2051bdddb6f'
  and slug = 'mama-amira'
  and short_description = 'She sells Masa, N100 white rice and stew with meat N900 Dawanki N600-1,000   jollof rice N900     pepper soup N1,000  Tuwoshinkafa N250-300    Goat head N1,000    fried cow meat N200';

-- 23. Mama Sisi (mama-sisi-row-097)
-- Field: Vendor description | Reason: obvious spelling: potatoe -> potato
update public.vendors
set short_description = 'She sells Roasted yam and porridge beans for N1500, with fish is N2,000. plantain and beans N1500 potato and beans N1,000.'
where id = '9956b23c-7ff4-40f9-aae1-639ea97920c0'
  and slug = 'mama-sisi-row-097'
  and short_description = 'She sells Roasted yam and porridge beans for N1500, with fish is N2,000. plantain and beans N1500 potatoe and beans N1,000.';

-- 24. Mama sisi (mama-sisi-row-098)
-- Field: Vendor description | Reason: readability spacing
update public.vendors
set short_description = 'She sells Roasted yam N1000,Roasted potatoes,  Roasted plantain, kpomo N200, Roasted fish N1,000, porridge beans,N700'
where id = '8e1ee3c4-c715-484e-816c-098e35bc881b'
  and slug = 'mama-sisi-row-098'
  and short_description = 'She sells Roasted yam N1000,Roasted potatoes,  Roasted plantain, kpomo N200, Roasted fishN1,000, porridge beans,N700';

-- 25. Bianns Cuisine (bianns-cuisine)
-- Field: Vendor description | Reason: obvious spelling: bitter leave -> bitter leaf
update public.vendors
set short_description = 'Bianns Cuisine offers different types of African and Nigerian foods and drinks: White Rice, jollof rice fried rice, vegetable soup, Egusi, white soup, okra soup, bitter leaf soup, Vitamin soup and banga stew'
where id = '5476cbce-7481-4854-95f7-08e7b6197ae3'
  and slug = 'bianns-cuisine'
  and short_description = 'Bianns Cuisine offers different types of African and Nigerian foods and drinks: White Rice, jollof rice fried rice, vegetable soup, Egusi, white soup, okra soup, bitter leave soup, Vitamin soup and banga stew';

-- 26. madam yam (madam-yam)
-- Field: Vendor description | Reason: obvious spelling: jellof -> jollof
update public.vendors
set short_description = 'Yam and beans with kpomo N1500,with fish N2000, with potatoes N1300, jollof rice a plate N1,000.'
where id = '48a6f86f-18d0-4111-bfb7-2133549edff2'
  and slug = 'madam-yam'
  and short_description = 'Yam and beans with kpomo N1500,with fish N2000, with potatoes N1300, jellof rice a plate N1,000.';

-- 27. Tina Rimke dada (tina-rimke-dada)
-- Field: Vendor description | Reason: obvious spelling: Smothie -> Smoothie; readability spacing; obvious spelling and spacing
update public.vendors
set short_description = 'She sells Smoothie like Orange juice N500-100, Tiger nut N500-1000, Banana and groundnut Smoothie N500-1,000, pawpaw, pineapple,carrots Smoothie N500-1,000, Zobo N200-N500, Bones, N100,Egg Roll N500'
where id = '6e95a22a-bb3f-4e68-9ee0-f8c73518b4f1'
  and slug = 'tina-rimke-dada'
  and short_description = 'She sells Smothie like Orange juice N500-100, Tiger nutN500-1000, Banana and groundnut SmothieN500-1,000, pawpaw, pineapple,carrots Smothie N500-1,000, Zobo N200-N500, Bones, N100,Egg Roll N500';

-- 28. Mama Ejima home cooking restaurant (mama-ejima-home-cooking-restaurant)
-- Field: Featured dish | Reason: obvious spelling: Bitter leave -> Bitter leaf
update public.vendor_featured_dishes as dish
set dish_name = 'Bitter leaf soup and fufu'
where dish.id = '891a0d2b-8344-4dc1-8aaf-63173cc3ea0e'
  and dish.vendor_id = '64f58d1b-978b-4c9d-afe1-e7bbc2ccb828'
  and dish.dish_name = 'Bitter leave soup and fufu';

-- 29. Mama Ejima home cooking restaurant (mama-ejima-home-cooking-restaurant)
-- Field: Dish description | Reason: obvious spelling: bitter leave -> bitter leaf
update public.vendor_featured_dishes as dish
set description = 'Soup source from bitter leaf and fermented cassava that has been cooked, pounded to pasta'
where dish.id = '891a0d2b-8344-4dc1-8aaf-63173cc3ea0e'
  and dish.vendor_id = '64f58d1b-978b-4c9d-afe1-e7bbc2ccb828'
  and dish.description = 'Soup source from bitter leave and fermented cassava that has been cooked, pounded to pasta';

-- 30. Gub's Kitchen Ventures (gubs-kitchen-ventures)
-- Field: Dish description | Reason: obvious spelling: grinded -> ground
update public.vendor_featured_dishes as dish
set description = 'Semo with Egusi is a popular Nigerian Meals. A semolina pasta eaten with Egusi soup, a soup source from melon seeds, ground and garnished with some kinds of fish and assorted meat'
where dish.id = '64b10a59-74e2-4517-8319-42c4f6116031'
  and dish.vendor_id = '06ae1b2e-de0a-4b8d-a1a4-ed01533d2220'
  and dish.description = 'Semo with Egusi is a popular Nigerian Meals. A semolina pasta eaten with Egusi soup, a soup source from melon seeds, grinded and garnished with some kinds of fish and assorted meat';

-- 31. Gub's Kitchen Ventures (gubs-kitchen-ventures)
-- Field: Dish description | Reason: removed duplicated word
update public.vendor_featured_dishes as dish
set description = 'Pounded Yam is a paste from boiled and pounded Yam, eaten with soup source from okra. Okra is edible vegetable plant that is slimy in nature and very nutritious, chopped and cooked with leaves, some soups ingredients'
where dish.id = '79e8c6d2-ba24-45c6-8a56-d109bb7e3e6b'
  and dish.vendor_id = '06ae1b2e-de0a-4b8d-a1a4-ed01533d2220'
  and dish.description = 'Pounded Yam is a paste from boiled and pounded Yam, eaten with soup source from okra. Okra is edible vegetable plant plant that is slimy in nature and very nutritious, chopped and cooked with leaves, some soups ingredients';

-- 32. Mama Jemila Akara and pap (mama-jemila-akara-and-pap)
-- Field: Dish description | Reason: obvious grammar correction
update public.vendor_featured_dishes as dish
set description = 'Fried Yams are sliced Yams or chunked and fried in a deep hot vegetable oil until it softens'
where dish.id = '60eb089c-0c10-405d-8edc-3b5f5c11b7ae'
  and dish.vendor_id = '9baad873-2fc9-45fc-8b52-e8d4b2ce730a'
  and dish.description = 'Fried Yams are sliced Yams or chunked and fried in a deep hot vegetable oil till it softs';

-- 33. Mama Jemila Akara and pap (mama-jemila-akara-and-pap)
-- Field: Dish description | Reason: obvious grammar correction
update public.vendor_featured_dishes as dish
set description = 'Fried potatoes are sliced potatoes or chunked and fried in a deep hot vegetable oil until it softens'
where dish.id = '00ba74ae-3ee7-4cfb-b0a0-3fb0bb3f1a55'
  and dish.vendor_id = '9baad873-2fc9-45fc-8b52-e8d4b2ce730a'
  and dish.description = 'Fried potatoes are sliced potatoes or chunked and fried in a deep hot vegetable oil till it softs';

-- 34. NativePot (nativepot)
-- Field: Dish description | Reason: obvious spelling: grinded -> ground
update public.vendor_featured_dishes as dish
set description = 'Okpa: This is the proteinous cowpeas pudding. The cowpeas is ground and mixed ingredients like palm oil, pepper, onion, crayfish, seasoning, vegetable, etc,. Then wrapped either in a plastic bag or plate and cooked'
where dish.id = '5ab25f3d-42c2-4c8e-b926-52dea0cf48ab'
  and dish.vendor_id = 'f10eb8c6-2bf5-4772-a136-31eb1f84d33e'
  and dish.description = 'Okpa: This is the proteinous cowpeas pudding. The cowpeas is grinded and mixed ingredients like palm oil, pepper, onion, crayfish, seasoning, vegetable, etc,. Then wrapped either in a plastic bag or plate and cooked';

-- 35. Salisu Suya and grill Spot (salisu-suya-and-grill-spot)
-- Field: Dish description | Reason: obvious spelling: grilles chicken -> grilled chicken
update public.vendor_featured_dishes as dish
set description = 'Full or cut grilled chicken with peculiar Suya seasoned pepper Yaji, plus onions, cabbage and cucumber'
where dish.id = '2b59e2e8-0e20-44dd-b1b3-88e8e57a129a'
  and dish.vendor_id = '7df88690-efef-4855-ab41-2af840b49dc4'
  and dish.description = 'Full or cut grilles chicken with peculiar Suya seasoned pepper Yaji, plus onions, cabbage and cucumber';

-- 36. Ahjiah (ahjiah)
-- Field: Dish description | Reason: local food canonicalization: Tuwoshinkaf -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set description = 'Akara pap white rice and stew from 1,000 jollof rice 1,000 without meat, with meat is 1,300 moi moi 200 Awara N50 sweet potatoes N50 Tuwo Shinkafa N500 kunu ngeda N300 yam N100 etc.'
where dish.id = 'cccd2630-34d1-47f8-8ad8-754625ffbd95'
  and dish.vendor_id = '5a79d518-3ff9-4065-876f-0715955f4fe5'
  and dish.description = 'Akara pap white rice and stew from 1,000 jollof rice 1,000 without meat, with meat is 1,300 moi moi 200 Awara N50 sweet potatoes N50 Tuwoshinkaf N500 kunu ngeda N300 yam N100 etc.';

-- 37. Chizzy African food (chizzy-african-food)
-- Field: Featured dish | Reason: obvious spelling: biterleaf -> bitter leaf
update public.vendor_featured_dishes as dish
set dish_name = 'oha, Egusi, bitter leaf, okro, Afang, white soup, banker Stew etc'
where dish.id = '0750ce06-9a8d-497d-8119-918e9af6f8cc'
  and dish.vendor_id = 'b3b720b7-738f-436f-b226-6df4abd2f29a'
  and dish.dish_name = 'oha, Egusi, biterleaf, okro, Afang, white soup, banker Stew etc';

-- 38. Chizzy African food (chizzy-african-food)
-- Field: Dish description | Reason: obvious spelling: biterleaf -> bitter leaf
update public.vendor_featured_dishes as dish
set description = 'Rice and stew with beans, Goat meat, oha soup Apu, Egusi, bitter leaf, Afang, white soup, Ofaku stew etc ranging N1500-3500'
where dish.id = '0750ce06-9a8d-497d-8119-918e9af6f8cc'
  and dish.vendor_id = 'b3b720b7-738f-436f-b226-6df4abd2f29a'
  and dish.description = 'Rice and stew with beans, Goat meat, oha soup Apu, Egusi, biterleaf, Afang, white soup, Ofaku stew etc ranging N1500-3500';

-- 39. Diamond Gee global (diamond-gee-global)
-- Field: Featured dish | Reason: obvious spelling: Doghnut -> Doughnut
update public.vendor_featured_dishes as dish
set dish_name = 'Doughnut puff puff, Meatpie, fishpie, fish roll etc.'
where dish.id = 'fd37ee3c-1a3c-4581-9e2b-150277508ae7'
  and dish.vendor_id = '40d8b2b3-dd21-4f76-91e4-09107ac904ff'
  and dish.dish_name = 'Doghnut puff puff, Meatpie, fishpie, fish roll etc.';

-- 40. G&G Restaurant (g-g-restaurant)
-- Field: Dish description | Reason: obvious spelling: biterleaf -> bitter leaf
update public.vendor_featured_dishes as dish
set description = 'She sells, Rice and stew with meat N1,200 Jollof rice with meat and Fish N1,700-2000 Swallow: Apu, Semo Garri, Wheat pounded yam. Soup; Afang, Egusi, bitter leaf, vegetable soup and Ogbono.from N1,200-1700.'
where dish.id = '56d96d8a-db4b-4404-b0ae-31dbaec6f818'
  and dish.vendor_id = 'b922b3d2-8f30-4fe1-8df2-4c7231d55475'
  and dish.description = 'She sells, Rice and stew with meat N1,200 Jollof rice with meat and Fish N1,700-2000 Swallow: Apu, Semo Garri, Wheat pounded yam. Soup; Afang, Egusi, biterleaf, vegetable soup and Ogbono.from N1,200-1700.';

-- 41. Iya (iya)
-- Field: Featured dish | Reason: obvious spelling: Doghnut -> Doughnut
update public.vendor_featured_dishes as dish
set dish_name = 'Doughnut, Puff puff, Fish roll, drinks etc.'
where dish.id = '772da13b-323f-4c78-843c-38482de44512'
  and dish.vendor_id = 'dacabe92-ac86-44fc-92cc-6cc29d0954b8'
  and dish.dish_name = 'Doghnut, Puff puff, Fish roll, drinks etc.';

-- 42. Iya (iya)
-- Field: Dish description | Reason: obvious spelling: Doghnut -> Doughnut
update public.vendor_featured_dishes as dish
set description = 'Meatpie N600, Sausage roll N600 ,Egg roll N600, Doughnut N100-300, Bons N100, Puff puff N100, peanut N100. All kinds of Soft Drinks'
where dish.id = '772da13b-323f-4c78-843c-38482de44512'
  and dish.vendor_id = 'dacabe92-ac86-44fc-92cc-6cc29d0954b8'
  and dish.description = 'Meatpie N600, Sausage roll N600 ,Egg roll N600, Doghnut N100-300, Bons N100, Puff puff N100, peanut N100. All kinds of Soft Drinks';

-- 43. Madam leaky finger (madam-leaky-finger)
-- Field: Featured dish | Reason: obvious spelling: varities -> varieties
update public.vendor_featured_dishes as dish
set dish_name = 'Pot of varieties of Soup on Order.'
where dish.id = '79b0332b-61e1-4a9f-a98d-c9d2b3c8423e'
  and dish.vendor_id = '86a8b7cc-c727-4cdb-9fbf-d2e8ad12eaef'
  and dish.dish_name = 'Pot of varities of Soup on Order.';

-- 44. Madam TIV (madam-tiv)
-- Field: Featured dish | Reason: obvious spelling: Varities -> Varieties
update public.vendor_featured_dishes as dish
set dish_name = 'Rice and stew,beans, Meat and Varieties of Soup.'
where dish.id = 'b04fe7e9-3112-477f-93df-c9f70c74a4f1'
  and dish.vendor_id = '2e424cd9-e881-4491-92bf-60ed1037fe00'
  and dish.dish_name = 'Rice and stew,beans, Meat and Varities of Soup.';

-- 45. Madam TIV (madam-tiv)
-- Field: Dish description | Reason: readability: 2egg -> 2 eggs
update public.vendor_featured_dishes as dish
set description = 'Indomie and 2 eggs N1,500 white Rice, stew and beans with meat N1,500 Swallow: Semo, Apu, garri Soup: okro Egusi, vegetable, oha, N1,500-N2,000,white soup N2,500, Afang soup N1,500'
where dish.id = 'b04fe7e9-3112-477f-93df-c9f70c74a4f1'
  and dish.vendor_id = '2e424cd9-e881-4491-92bf-60ed1037fe00'
  and dish.description = 'Indomie and 2egg N1,500 white Rice, stew and beans with meat N1,500 Swallow: Semo, Apu, garri Soup: okro Egusi, vegetable, oha, N1,500-N2,000,white soup N2,500, Afang soup N1,500';

-- 46. madam yam (madam-yam)
-- Field: Dish description | Reason: obvious spelling: jellof -> jollof
update public.vendor_featured_dishes as dish
set description = 'Yam and beans with kpomo N1500,with fish N2000, with potatoes N1300, jollof rice a plate N1,000.'
where dish.id = '7ffd947e-d9fc-43a2-aae8-09317ba86bef'
  and dish.vendor_id = '48a6f86f-18d0-4111-bfb7-2133549edff2'
  and dish.description = 'Yam and beans with kpomo N1500,with fish N2000, with potatoes N1300, jellof rice a plate N1,000.';

-- 47. Mama Amira (mama-amira)
-- Field: Featured dish | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set dish_name = 'Rice and stew, Masa, Tuwo Shinkafa etc.'
where dish.id = '82fb5f01-72ed-498c-aba2-c4d785ba347d'
  and dish.vendor_id = 'dc03e05d-6850-4d8f-bec6-b2051bdddb6f'
  and dish.dish_name = 'Rice and stew, Masa, tuwoshinkafa etc.';

-- 48. Mama Amira (mama-amira)
-- Field: Dish description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set description = 'Masa, N100 white rice and stew with meat N900 Dawanki N600-1,000 jollof rice N900 pepper soup N1,000 Tuwo Shinkafa N250-300 Goat head N1,000 fried cow meat N200'
where dish.id = '82fb5f01-72ed-498c-aba2-c4d785ba347d'
  and dish.vendor_id = 'dc03e05d-6850-4d8f-bec6-b2051bdddb6f'
  and dish.description = 'Masa, N100 white rice and stew with meat N900 Dawanki N600-1,000 jollof rice N900 pepper soup N1,000 Tuwoshinkafa N250-300 Goat head N1,000 fried cow meat N200';

-- 49. Mama Awara (mama-awara)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'Awara, yam, kpomo, plantain potato,tec.'
where dish.id = '1a3dbbda-2cad-47a6-8ddb-d66e73cf60f5'
  and dish.vendor_id = '6fcc6730-19df-4278-a56f-9651d2c75d5c'
  and dish.dish_name = 'Awara, yam, kpomo, plantain potatoe,tec.';

-- 50. Mama Hassan (mama-hassan)
-- Field: Featured dish | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set dish_name = 'Tuwo Shinkafa, Tuwomasara Masa with Soup, and yaji pepper etc.'
where dish.id = 'b309821e-4cc1-4d25-bd38-636a8e749683'
  and dish.vendor_id = '376fe8a3-abba-4d46-82ba-e7fa1292b8f6'
  and dish.dish_name = 'Tuwoshinkafa, Tuwomasara Masa with Soup, and yaji pepper etc.';

-- 51. Mama Hassan (mama-hassan)
-- Field: Dish description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set description = 'Tuwo ndawa N300, Shinkafa Jollof N1500,Tuwo Shinkafa N500, Masa and Soup N100-500,1,000 and Yaji pepper, yaji kuli Kuli, Rice and stew with meat,N1,500, ARABIAN TEA N500-1500 pepper with assorted intestines N1,000'
where dish.id = 'b309821e-4cc1-4d25-bd38-636a8e749683'
  and dish.vendor_id = '376fe8a3-abba-4d46-82ba-e7fa1292b8f6'
  and dish.description = 'Tuwo ndawa N300, Shinkafa Jollof N1500,Tuwoshinkafa N500, Masa and Soup N100-500,1,000 and Yaji pepper, yaji kuli Kuli, Rice and stew with meat,N1,500, ARABIAN TEA N500-1500 pepper with assorted intestines N1,000';

-- 52. Mama Lovina (mama-lovina)
-- Field: Dish description | Reason: obvious spelling: Biterleaf -> Bitter leaf
update public.vendor_featured_dishes as dish
set description = 'White Rice and stew with meat and beans N1,300 jollof rice with salad and meat N1800, with fish and Salad N2,500 Moi Moi 2 N500 Swallow: Apu, garri,Semo, Soup: Egusi, Bitter leaf,Oha, okro, All kinds of Soft drinks N500-600.'
where dish.id = '0dc122d1-b31c-448f-84f1-80db1af3021b'
  and dish.vendor_id = '3dff637b-7b45-48f6-8587-fc059cde44da'
  and dish.description = 'White Rice and stew with meat and beans N1,300 jollof rice with salad and meat N1800, with fish and Salad N2,500 Moi Moi 2 N500 Swallow: Apu, garri,Semo, Soup: Egusi, Biterleaf,Oha, okro, All kinds of Soft drinks N500-600.';

-- 53. Mama moi moi (mama-moi-moi)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'yam Akara, pap, plantain, potato etc.'
where dish.id = 'cba68053-cc3a-4500-89a8-04179074c37b'
  and dish.vendor_id = '377c6964-5a1b-4096-92aa-a899a57622cd'
  and dish.dish_name = 'yam Akara, pap, plantain, potatoe etc.';

-- 54. Mama Nde (mama-nde)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'Pap, kunu ngeda, yam, potato, Akara.'
where dish.id = '6d3866ee-d7ec-48fd-be8b-fa7d8f0563b3'
  and dish.vendor_id = '7a7bcb57-ded3-4f78-8e73-23bb120fec3c'
  and dish.dish_name = 'Pap, kunu ngeda, yam, potatoe, Akara.';

-- 55. Mama Shilo (mama-shilo)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'Akara, pap, potato, yam, and plantain.'
where dish.id = '94e3043a-22b9-4615-a0d3-efa807d51d97'
  and dish.vendor_id = '14fdb21d-5f38-462f-b8be-a10b6369a9ca'
  and dish.dish_name = 'Akara, pap, potatoe, yam, and plantain.';

-- 56. Medoya /Mme yam (medoya-mme-yam)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'Yam Akara, pap, plantain, potato etc.'
where dish.id = '1df7a25e-c528-4e8a-917f-3881b6d26cd4'
  and dish.vendor_id = '3abd5c9b-c1a1-4eb7-a612-aa78ec659387'
  and dish.dish_name = 'Yam Akara, pap, plantain, potatoe etc.';

-- 57. Mma Afam (mma-afam)
-- Field: Dish description | Reason: readability spacing only; term left unchanged
update public.vendor_featured_dishes as dish
set description = 'Bones N100, Egg Roll N500, Fish roll N400, Bread Bones N300, Apu,N200, Bread,N300-500 Zobo drink N200, Kunu,N300, Bottle Mineral N400, plastic Mineral N500, Bottle water N200.'
where dish.id = '02bcaf2c-2dfd-4b7c-8996-eac75474808b'
  and dish.vendor_id = '7f789021-53dd-4698-9e42-d5869631a36d'
  and dish.description = 'BonesN100, Egg Roll N500, Fish roll N400, Bread Bones N300, Apu,N200, Bread,N300-500 Zobo drink N200, Kunu,N300, Bottle Mineral N400, plastic Mineral N500, Bottle water N200.';

-- 58. mme Masa (mme-masa)
-- Field: Featured dish | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set dish_name = 'Masa with yaji pepper, and Tuwo Shinkafa'
where dish.id = 'eed16328-305b-4629-b1d2-f5242ae9155f'
  and dish.vendor_id = 'f053aa03-43c0-4aca-9d28-31642965a2b9'
  and dish.dish_name = 'Masa with yaji pepper, and Tuwoshinkafa';

-- 59. mme Masa (mme-masa)
-- Field: Dish description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set description = 'Masa with yaji pepper and sauce with Tuwo Shinkafa.'
where dish.id = 'eed16328-305b-4629-b1d2-f5242ae9155f'
  and dish.vendor_id = 'f053aa03-43c0-4aca-9d28-31642965a2b9'
  and dish.description = 'Masa with yaji pepper and sauce with Tuwoshinkafa.';

-- 60. Mummy Samuel (mummy-samuel)
-- Field: Dish description | Reason: obvious spelling: Biterleaf -> Bitter leaf
update public.vendor_featured_dishes as dish
set description = 'Rice and stew with beans N1,200-1,500 Swallow:Apu, Eba, Tuwomasara, garri Soup: Bitter leaf soup, Egusi,Oha,okro, Ogbono, etc.'
where dish.id = '73c83834-92c0-4fd6-b27b-d78aa1627994'
  and dish.vendor_id = '51564a19-92d0-4609-90f4-49535c75c425'
  and dish.description = 'Rice and stew with beans N1,200-1,500 Swallow:Apu, Eba, Tuwomasara, garri Soup: Biterleaf soup, Egusi,Oha,okro, Ogbono, etc.';

-- 61. NATIONS EAT PLATE FAST FOOD (nations-eat-plate-fast-food)
-- Field: Featured dish | Reason: obvious spelling: Sharwama -> Shawarma
update public.vendor_featured_dishes as dish
set dish_name = 'Shawarma,Burger, Meatpie, Egg roll, indomie and egg etc.'
where dish.id = 'e539890b-c5f3-4feb-97d6-ef916577e65d'
  and dish.vendor_id = '44e49ce9-1480-4626-85fc-66efed72b464'
  and dish.dish_name = 'Sharwama,Burger, Meatpie, Egg roll, indomie and egg etc.';

-- 62. NATIONS EAT PLATE FAST FOOD (nations-eat-plate-fast-food)
-- Field: Dish description | Reason: obvious spelling: Sharwama -> Shawarma
update public.vendor_featured_dishes as dish
set description = 'Meatpie N600, Chin chin from N500-2,000 Egg roll N700, Bons N100, Shawarma Indomie and 2eggs N1400-2,000 Burger N3,700 Party jollof rice on Order All kinds of drinks N400-500'
where dish.id = 'e539890b-c5f3-4feb-97d6-ef916577e65d'
  and dish.vendor_id = '44e49ce9-1480-4626-85fc-66efed72b464'
  and dish.description = 'Meatpie N600, Chin chin from N500-2,000 Egg roll N700, Bons N100, Sharwama Indomie and 2eggs N1400-2,000 Burger N3,700 Party jollof rice on Order All kinds of drinks N400-500';

-- 63. NIKIS SPECIAL (nikis-special)
-- Field: Dish description | Reason: readability spacing
update public.vendor_featured_dishes as dish
set description = 'fried fish N500,1500,2000. chicken N1500, 2000, fried rice chicken and Salad N5000, Rice and stew with beans N1,500, porridge beans N700, plantain 3 for N500 Swallow: Semo Apu and garri, wheat. Soup: Vegetable soup N2,000,bitter leaf, oha, Egusi with pack N2,00'
where dish.id = '972b5261-4b1e-4a5d-b3d2-10b0369a425d'
  and dish.vendor_id = '50e1fddc-b069-4d07-a955-9d7f199c99f0'
  and dish.description = 'fried fish N500,1500,2000. chicken N1500, 2000, fried rice chicken and Salad N5000, Rice and stew with beans N1,500, porridge beans N700, plantain 3 for N500 Swallow: Semo Apu and garri, wheat. Soup: Vegetable soupN2,000,bitter leaf, oha, Egusi with pack N2,00';

-- 64. Nikxy nice (nikxy-nice)
-- Field: Dish description | Reason: obvious spelling: Doghnut -> Doughnut; obvious spelling: mearpie -> meat pie
update public.vendor_featured_dishes as dish
set description = 'Egg roll N700, meat pie, N1,200, sausage roll N1,000, Slice Cake, N1,000, Doughnut N400, Chin chin N1,000-35,000(25kg), Puff puff 5 for N400, Bons N100, Fish roll N1,000, Samosa,and Spring rolls both fried And fresh and above.'
where dish.id = 'ffd57150-54f0-4a60-85c6-c3b529285c80'
  and dish.vendor_id = 'fa5256ab-6714-4552-91f4-1bec3fc27d5a'
  and dish.description = 'Egg roll N700, mearpie, N1,200, sausage roll N1,000, Slice Cake, N1,000, Doghnut N400, Chin chin N1,000-35,000(25kg), Puff puff 5 for N400, Bons N100, Fish roll N1,000, Samosa,and Spring rolls both fried And fresh and above.';

-- 65. Potable kitchen (potable-kitchen)
-- Field: Dish description | Reason: obvious spelling: biterleaf -> bitter leaf; readability spacing
update public.vendor_featured_dishes as dish
set description = 'Jollof rice N1500 white rice and stew N1500, yam and beans N1500 Banger soup N2500 Egusi soup N1500 Okro soup N1500 bitter leaf soup N1500 Afang soup N2,000 vegetable soup N2,000'
where dish.id = '8db19136-ea5d-49c9-a845-909be5d3bb49'
  and dish.vendor_id = '356a0954-e41d-44ed-87b4-8fe5d982d6d6'
  and dish.description = 'Jollof rice N1500 white rice and stew N1500, yam and beans N1500 Banger soup N2500 Egusi soup N1500 Okro soup N1500 biterleaf soup N1500 Afang soupN2,000 vegetable soup N2,000';

-- 66. Theresa fish (theresa-fish)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'Catfish, Irish potato, sweet potato, and plantain.'
where dish.id = '23dc16fb-335f-47c5-bdf9-dd0994b4a698'
  and dish.vendor_id = 'fd297048-f281-4a32-9796-3c49278649e6'
  and dish.dish_name = 'Catfish, Irish potato, sweet potatoe, and plantain.';

-- 67. Tina Rimke dada (tina-rimke-dada)
-- Field: Dish description | Reason: obvious spelling: Smothie -> Smoothie; readability spacing; obvious spelling and spacing
update public.vendor_featured_dishes as dish
set description = 'Smoothie like Orange juice N500-100, Tiger nut N500-1000, Banana and groundnut Smoothie N500-1,000, pawpaw, pineapple,carrots Smoothie N500-1,000, Zobo N200-N500, Bones, N100,Egg Roll N500'
where dish.id = '59b62c44-c9ad-41af-9c00-9dab4400ad26'
  and dish.vendor_id = '6e95a22a-bb3f-4e68-9ee0-f8c73518b4f1'
  and dish.description = 'Smothie like Orange juice N500-100, Tiger nutN500-1000, Banana and groundnut SmothieN500-1,000, pawpaw, pineapple,carrots Smothie N500-1,000, Zobo N200-N500, Bones, N100,Egg Roll N500';

-- 68. Mama sisi (mama-sisi-row-098)
-- Field: Featured dish | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set dish_name = 'Roasted yam, plantain, beans, potato'
where dish.id = 'a31af0a9-9dd7-4975-80b0-63548880ea1f'
  and dish.vendor_id = '8e1ee3c4-c715-484e-816c-098e35bc881b'
  and dish.dish_name = 'Roasted yam, plantain, beans, potatoe';

-- 69. Mama sisi (mama-sisi-row-098)
-- Field: Dish description | Reason: readability spacing
update public.vendor_featured_dishes as dish
set description = 'Roasted yam N1000,Roasted potatoes, Roasted plantain, kpomo N200, Roasted fish N1,000, porridge beans,N700'
where dish.id = 'a31af0a9-9dd7-4975-80b0-63548880ea1f'
  and dish.vendor_id = '8e1ee3c4-c715-484e-816c-098e35bc881b'
  and dish.description = 'Roasted yam N1000,Roasted potatoes, Roasted plantain, kpomo N200, Roasted fishN1,000, porridge beans,N700';

-- 70. Mama Sisi (mama-sisi-row-097)
-- Field: Dish description | Reason: obvious spelling: potatoe -> potato
update public.vendor_featured_dishes as dish
set description = 'Roasted yam and porridge beans for N1500, with fish is N2,000. plantain and beans N1500 potato and beans N1,000.'
where dish.id = '59855615-9114-490f-a766-af523a82d180'
  and dish.vendor_id = '9956b23c-7ff4-40f9-aae1-639ea97920c0'
  and dish.description = 'Roasted yam and porridge beans for N1500, with fish is N2,000. plantain and beans N1500 potatoe and beans N1,000.';

-- 71. Zoveno kitchen (zoveno-kitchen-row-028)
-- Field: Featured dish | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set dish_name = 'Indomie and egg, Masa and Sauce, Tuwo Shinkafa and Afang soup etc.'
where dish.id = '099c1bff-4443-43eb-bec8-d0305ff903c0'
  and dish.vendor_id = 'd5d1058d-62aa-467c-ace8-8e4731a4d095'
  and dish.dish_name = 'Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc.';

-- 72. Zoveno kitchen (zoveno-kitchen-row-028)
-- Field: Dish description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set description = 'Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwo Shinkafa N4,000, Afang soup and Tuwo Shinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.'
where dish.id = '099c1bff-4443-43eb-bec8-d0305ff903c0'
  and dish.vendor_id = 'd5d1058d-62aa-467c-ace8-8e4731a4d095'
  and dish.description = 'Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwoshinkafa N4,000, Afang soup and Tuwoshinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.';

-- 73. Zoveno kitchen (zoveno-kitchen-row-029)
-- Field: Featured dish | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set dish_name = 'Indomie and egg, Masa and Sauce, Tuwo Shinkafa and Afang soup etc.'
where dish.id = '2b4c71b3-acf7-4997-8b5b-72419096d3ff'
  and dish.vendor_id = 'ef37cc4c-fa50-4dc6-834b-dd0a7fa85f8d'
  and dish.dish_name = 'Indomie and egg, Masa and Sauce, Tuwoshinkafa and Afang soup etc.';

-- 74. Zoveno kitchen (zoveno-kitchen-row-029)
-- Field: Dish description | Reason: local food canonicalization: Tuwoshinkafa -> Tuwo Shinkafa
update public.vendor_featured_dishes as dish
set description = 'Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwo Shinkafa N4,000, Afang soup and Tuwo Shinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.'
where dish.id = '2b4c71b3-acf7-4997-8b5b-72419096d3ff'
  and dish.vendor_id = 'ef37cc4c-fa50-4dc6-834b-dd0a7fa85f8d'
  and dish.description = 'Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and Tuwoshinkafa N4,000, Afang soup and Tuwoshinkafa N3,500, Egusi, vegetable or okro is N2,000 White soup and pounded yam N3,500.';

-- 75. Madam Fish (madam-fish)
-- Field: Featured dish | Reason: food-context spelling: source -> sauce
update public.vendor_featured_dishes as dish
set dish_name = 'Roasted Catfish and sauce, Salad, chips etc ranging from N5,000, N6,000 and N 10,000'
where dish.id = '7e68cc72-18ed-4ddc-bf3e-3cf52d367102'
  and dish.vendor_id = '078538ac-4280-4512-8fb8-e664b2087929'
  and dish.dish_name = 'Roasted Catfish and source, Salad, chips etc ranging from N5,000, N6,000 and N 10,000';

-- 76. Madam Fish (madam-fish)
-- Field: Dish description | Reason: food-context spelling: source -> sauce
update public.vendor_featured_dishes as dish
set description = 'Roasted Catfish and sauce, Salad, chips etc , N6,000 and N 10,000'
where dish.id = '7e68cc72-18ed-4ddc-bf3e-3cf52d367102'
  and dish.vendor_id = '078538ac-4280-4512-8fb8-e664b2087929'
  and dish.description = 'Roasted Catfish and source, Salad, chips etc , N6,000 and N 10,000';

-- 77. Madam Fish (madam-fish)
-- Field: Featured dish | Reason: food-context spelling: source -> sauce
update public.vendor_featured_dishes as dish
set dish_name = 'Catfish and sauce with Salad and chips'
where dish.id = 'b1da9d34-6bc2-4c00-90f6-39288c2ac95c'
  and dish.vendor_id = '078538ac-4280-4512-8fb8-e664b2087929'
  and dish.dish_name = 'Catfish and source with Salad and chips';

-- 78. Madam Fish (madam-fish)
-- Field: Dish description | Reason: food-context spelling: source -> sauce
update public.vendor_featured_dishes as dish
set description = 'Roasted Catfish and sauce, Salad, chips etc , N6,000 and N 10,000'
where dish.id = 'b1da9d34-6bc2-4c00-90f6-39288c2ac95c'
  and dish.vendor_id = '078538ac-4280-4512-8fb8-e664b2087929'
  and dish.description = 'Roasted Catfish and source, Salad, chips etc , N6,000 and N 10,000';

-- 79. Mama Mmesoma (mama-mmesoma)
-- Field: Dish description | Reason: obvious spelling: lntestine -> intestine
update public.vendor_featured_dishes as dish
set description = 'white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and Banger soup. Swallow, Apu semo garri wheat Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, intestine, ro'
where dish.id = '9ff1ad1e-8eac-4e2c-9f2f-9a1959977011'
  and dish.vendor_id = '309535d8-6a43-4673-8516-911566a8a414'
  and dish.description = 'white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and Banger soup. Swallow, Apu semo garri wheat Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, lntestine, ro';

-- 80. Mama Mmesoma (mama-mmesoma)
-- Field: Dish description | Reason: obvious spelling: lntestine -> intestine
update public.vendor_featured_dishes as dish
set description = 'white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and Banger soup. Swallow, Apu semo garri wheat Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, intestine, ro'
where dish.id = 'ceb753b9-a5b6-4216-8c95-45a687d0446b'
  and dish.vendor_id = '309535d8-6a43-4673-8516-911566a8a414'
  and dish.description = 'white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and Banger soup. Swallow, Apu semo garri wheat Soup Egusi okro bitter leaf,oha, vegetable,Afang soup Moi moi with plastic plates,Meat, Cow head, cow leg, kpomo, lntestine, ro';

-- 81. madam Ekaette (madam-ekaette)
-- Field: Featured dish | Reason: obvious spelling: jellof -> jollof
update public.vendor_featured_dishes as dish
set dish_name = 'Food like jollof rice,moi moi, beans pap and bread with Bole'
where dish.id = 'dd38cd39-0d1b-4b48-b082-21d322c8f22e'
  and dish.vendor_id = '8a0b70c2-3aff-4db9-9e88-2ac35f370cbb'
  and dish.dish_name = 'Food like jellof rice,moi moi, beans pap and bread with Bole';

-- 82. mummy good luck (mummy-good-luck)
-- Field: Dish description | Reason: obvious spelling: brea -> bread
update public.vendor_featured_dishes as dish
set description = 'yam for 50, potatoes 50, pap 300 and bread 300.'
where dish.id = 'e8783c6b-932e-4362-a81f-3db64c659b23'
  and dish.vendor_id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and dish.description = 'yam for 50, potatoes 50, pap 300 and brea 300.';

-- 83. mummy good luck (mummy-good-luck)
-- Field: Featured dish | Reason: obvious spelling: jellof -> jollof
update public.vendor_featured_dishes as dish
set dish_name = 'Food like jollof rice,moi moi, beans etc.'
where dish.id = 'e41bdf10-64b1-4fc2-b93e-192fc0ddfe60'
  and dish.vendor_id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and dish.dish_name = 'Food like jellof rice,moi moi, beans etc.';

-- 84. mummy good luck (mummy-good-luck)
-- Field: Dish description | Reason: obvious spelling: brea -> bread
update public.vendor_featured_dishes as dish
set description = 'yam for 50, potatoes 50, pap 300 and bread 300.'
where dish.id = 'e41bdf10-64b1-4fc2-b93e-192fc0ddfe60'
  and dish.vendor_id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and dish.description = 'yam for 50, potatoes 50, pap 300 and brea 300.';

-- 85. mummy good luck (mummy-good-luck)
-- Field: Dish description | Reason: obvious spelling: brea -> bread
update public.vendor_featured_dishes as dish
set description = 'yam for 50, potatoes 50, pap 300 and bread 300.'
where dish.id = '7893bf9a-1001-44f0-91dc-22852dcb1ed3'
  and dish.vendor_id = 'd6e7af44-aa18-4a34-8924-9ccfa79c6cff'
  and dish.description = 'yam for 50, potatoes 50, pap 300 and brea 300.';

rollback;
