# Localman Batch 4 Area Governance Trace Audit

Source workbook: `/Users/frankenstein/Desktop/Data collection and entry for LOCALMANAPP/5th - 16th June/Localman_app_second_acc2026-06-24_07_24_53.xlsx`

Important: this audit did not modify CSV files, did not regenerate CSV files, did not import data, did not modify the database, and did not change governance definitions.

## Executive Summary

- Corrected Batch 4 workbook rows audited: **100**.
- Distinct raw area values: **11**.
- Governed raw area values: **6**.
- Raw area values not in governance: **5**.
- Actual governance remaps detected by current importer rules: **4**.
- Potentially incorrect governance remaps: **0**.
- Geographic coordinate review findings: **2**.
- Suspicious address/locality consistency findings: **23**.
- Final verdict: **NOT SAFE FOR IMPORT**.

Key finding: the current Localman importer only canonicalizes values present in `ABUJA_AREA_DEFINITIONS`. It does **not** contain rules that map `Area 1`, `Area 2`, `Area 3`, `CBD`, or `Central Area` into `Garki`, `Wuse`, `Jabi`, or `Utako`. Unknown areas are preserved as submitted and flagged as `UNKNOWN_AREA`.

## Original Area Inventory

| Raw area value | Vendor count | Governance status | Current importer final area |
|---|---:|---|---|
| Area 1 | 13 | Unknown | Area 1 |
| Gaduwa | 2 | Unknown | Gaduwa |
| Gariki | 6 | Unknown | Gariki |
| Karimo | 17 | Unknown | Karimo |
| Lifecamp | 8 | Unknown | Lifecamp |
| Apo | 6 | Known | Apo |
| Asokoro | 20 | Known | Asokoro |
| Gudu | 7 | Known | Gudu |
| Jabi | 16 | Known | Jabi |
| Kado | 1 | Known | Kado |
| Life camp | 4 | Known | Life Camp |

### Location Text Inventory

| Row | Vendor | Area field | Address / landmark text | Location description snippet | Coordinates |
|---:|---|---|---|---|---|
| 2 | Mai Suya | Area 1 | Dunamis Market by Dunamis Junction | He sells Suya ranging from N500 -N5,000 | `9.0259712, 7.4700817` |
| 3 | Anambra Kitchen | Area 1 | Garage before Dunamis Church Area 1. | She sells Rice and stew with meat, jollof Rice and plantain with salad. Swallow Garri,Apu Semo, Whe… | `9.025545, 7.469465` |
| 4 | NATIONS EAT PLATE FAST FOOD | Area 1 | Area 1 before Dunamis Church by Dunamis Junction. | He sells Meatpie N600, Chin chin from N500-2,000 Egg roll N700, Bons N100, Sharwama ranging from N2… | `9.0248273, 7.4690103` |
| 5 | Ann's kitchen | Area 1 | Dagba Church village opposite police station Durumi Area 1. | She sells Indomie and 2eggs N1,500 cooked yam and porridge beans N1,500 Swallow: Apu, garri and Sem… | `9.0258168, 7.4637133` |
| 6 | Comfort Kitchen | Area 1 | Ayuba waba, Close to Sumabib indomie Factory. | She sells Rice and stew with meat N1,300-N1,500 Swallow and Soup with Meat N1,500, with pounded yam… | `9.0263632, 7.4639992` |
| 7 | Mama Edo | Area 1 | Dagba, Area 1 besides Ebeneza plaza | She sells Rice and beans with stew and meat N1,500 Swallow: Apu, garri,Semo, poundo Soup: Egusi,Okr… | `9.0260453, 7.4638509` |
| 8 | Christina Onishinu | Area 1 | Besides Ebeniza plaza, opposite a Mechanic. | She sells Roasted plantain and porridge beans with kpomo N2,000. Roasted Plantain, with porridge be… | `9.0260285, 7.4638563` |
| 9 | Mama mimi | Area 1 | Gwagwalada park Area 1 | She sells porridge beans and Roasted yam with Kpomo N1,300 porridge beans with plantain and kpomo N… | `9.0274517, 7.467905` |
| 10 | Madam TIV | Area 1 | Area 1 Gwagwalada park. | She sells Indomie and 2egg N1,500 white Rice, stew and beans with meat N1,500 Swallow: Semo, Apu, g… | `9.0278317, 7.4671867` |
| 11 | Precious Indomie | Area 1 | Area 1 opposite Gwagwalada park, VIO street. | She sells Indomie and 2eggs N1,300-1,600 Soft Drinks like : Fearless N600, Malt, N700,Coke ,fanta,7… | `9.0284875, 7.4663562` |
| 12 | MaMa Ola | Area 1 | Opposite Police Station, Shopping Complex Area1 | She sells Rice and stew with meat N1,500 Jollof rice with Salad and Meat N2,000 Swallow like: Garri… | `9.031401, 7.4698664` |
| 13 | ADAMU SPECIAL KILISHI | Area 1 | Area 1 Shopping Center, Gariki-Abuja | He sells Special dried Kilishi, Suya Dambu, Nama, Ram, Goat meat, and Chicken suya | `9.0310461, 7.4704132` |
| 14 | Adamu kilishi | Area 1 | Sokoto Street, Shagari plaza,by Traffic | He sells Neat and Sweet Kilishi ranging from N5,000 upward Danguru( grounded meat, Chicken and Beef… | `9.0304783, 7.4703117` |
| 15 | Mummy Emma | Gudu | Gudu District Market After Fcmb Bank, APO | She sells Sells Roasted yam and porridge beans with Kpomo N2,000-5,000 porridge beans and plantain … | `8.9980303, 7.4725915` |
| 16 | Madam Indomie | Gudu | Gudu District Market front of NB Plaza, APO | She sells All sort of Soft drinks ranging from N400-1,000 Indomie and 2eggs N1,500 | `8.998249, 7.4718152` |
| 17 | Iya | Gudu | First gate Gudu Market opposite Police Station. (APO) | She sells Meatpie N600, Sausage roll N600 ,Egg roll N600, Doghnut N100-300, Bons N100, Puff puff N1… | `8.9999369, 7.472287` |
| 18 | Mama Lovina | Gaduwa | Gaduwa junction beside MRS filling station, opposite AXIS Plaza. (Gudu) | She sells White Rice and stew with meat and beans N1,300 jollof rice with salad and meat N1800, wit… | `9.0035953, 7.4645591` |
| 19 | Samira | Gaduwa | Gaduwa opposite Toastpan Eatery, (Gudu) | Pap N300-500, Kunungeda N500-1,000 ,Akara N50 , potato N50 and Yam N50 with Kpomo N1,00. | `9.002836, 7.4648849` |
| 20 | Mai Nama | Gudu | opposite Gaduwa Estate, Gaduwa Gudu Apo. | Ram Roasted Suya 1kilo N12,000 | `9.002695, 7.4646465` |
| 21 | Favour | Gudu | Gudu park Apo Front of Eugols Kitchen | She sells Akara N100,Yam N100, potatoes N100, Fish N500-1,000, pap 500, plantain (3) N500 and Fried… | `8.9998887, 7.4711588` |
| 22 | Favour | Gudu | Gudu park Apo Front of Eugols Kitchen | She sells Akara N100,Yam N100, potatoes N100, Fish N500-1,000, pap 500, plantain (3) N500 and Fried… | `9.0006891, 7.4720249` |
| 23 | Ify plantain | Gudu | Gudu park Apo | She sells Roasted yam and Beans with kpomo N1,200 Roasted plantain and beans with kpomo N1,700 Bean… | `8.9998551, 7.4711794` |
| 24 | Madam leaky finger | Apo | Gudu park Apo | She sells Rice and stew, with beans and meat N2,300 jollof rice with Chicken N3,500 Swallow: Semo, … | `9.000146, 7.4717771` |
| 25 | Diamond Gee global | Apo | David Ejor street back of AP filling station, Apo | She sells Snacks like: Doughnuts,Egg roll, Meatpie, Chin Chin, Puff puff, Fish roll and peanut.rang… | `9.0113782, 7.4728413` |
| 26 | SANA'S FOOD COMBO | Apo | Legislative quarters No 2 IDRIS GARBA CLOSE Apo. | She sells Indomie and 2eggs for N1200-1500. Jollof rice and meat with Salad N1500-1700 Fried rice a… | `9.0121238, 7.4780563` |
| 27 | Mummy Samuel | Apo | Legislative quarters,Jim Nwobodo Street Apo | She sells Rice and stew with beans N1,200-1,500 Swallow:Apu, Eba, Tuwomasara, garri Soup: Biterleaf… | `9.0154183, 7.48145` |
| 28 | Zoveno kitchen | Apo | Legislative quarters Jim Nwobodo Street Apo. | She sells Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and … | `9.016075, 7.4809089` |
| 29 | Zoveno kitchen | Apo | Legislative quarters Jim Nwobodo Street Apo. | She sells Masa and Sauce N1500, Indomie and egg N1700, Local moi moi in a tin, Magirgi Special and … | `9.016075, 7.4809089` |
| 30 | Madam Jos | Gariki | Obiaja Close opposite Akintola Bulavad Along Gariki Market. | She sells Rice and stew with meat N1500 Jollof rice, salad and meat N2,000 porridge beans with yam … | `9.018934, 7.4920715` |
| 31 | Mama Hassan | Gariki | Enough stress By Lagos Street opposite H-medix | Tuwo ndawa N300, Shinkafa Jollof N1500,Tuwoshinkafa N500, Masa and Soup N100-500,1,000 and Yaji pep… | `9.0239963, 7.4874059` |
| 32 | Nikxy nice | Gariki | No 56 Sukka Street Gariki Abuja | She sells Egg roll N700, mearpie, N1,200, sausage roll N1,000, Slice Cake, N1,000, Doghnut N400, Ch… | `9.0224526, 7.4876739` |
| 33 | Magdalene | Gariki | Suka street opposite Correct place, Adjacent to Lagos Street. | She sells KoKo(pap) N300-500 Akara N50, | `9.0216288, 7.4872872` |
| 34 | G&G Restaurant | Gariki | Lagos Street Gariki village front of Police veterinary hospital. | She sells, Rice and stew with meat N1,200 Jollof rice with meat and Fish N1,700-2000 Swallow: Apu, … | `9.021222, 7.4854184` |
| 35 | Mama Obinna | Gariki | Akakuku street Gariki B4 H-medix pharmacy. | She sells Jollof rice, and meat N1,300, Rice and stew with meat N1,300 Beans and Yam with meat N1,5… | `9.0233273, 7.4855401` |
| 36 | Relax Delight | Karimo | Imprecit junction, Karimo Road | She sells Indomie and 2eggs N1,500 Meat pie N1,000, Egg roll N600, Fish roll N600, Bons N100, Puff … | `9.0652911, 7.3800676` |
| 37 | Mme Indomie | Karimo | Reke junction Along Karimo Road | She sells Indomie and 2eggs and plantain ranging from N2,000-2500 Jollof rice and Fish N2,000/2Meat… | `9.0671102, 7.3660052` |
| 38 | Madam yam and Beans | Karimo | Agura Road Old Karimo opposite One life pharmacy. | She sells yam and porridge beans with kpomo N1,500 plantain and porridge beans with kpomo N2000. | `9.0635308, 7.3716828` |
| 39 | CALABAR KITCHEN | Karimo | Agura Old Karimo opposite One life pharmacy. | Rice and stew with plantain and fish N2,000 jollof with salad with meat N1,500 Soup: Afang with any… | `9.0616413, 7.3730223` |
| 40 | MUNACHIMNSOO RESTAURANT. | Karimo | IDU industrial Area, behind back of NNPC filling station. | She sells Rice and stew With meat N1,500, porridge beans and yam N1500, Spaghetti with stew and mea… | `9.0705827, 7.348464` |
| 41 | Samuel Toluwani | Karimo | IDU Mechanic opposite Car wash | Egg roll N500, Bons N100, Puff puff N1,000, Chin Chin N200. Zobo N200, soft drinks,N300-500 Fearles… | `9.0708967, 7.3518383` |
| 42 | Dorathy | Karimo | Maryland Street After BB plaza, opposite Nepa office. | She sells Indomie with 2egg N1,500 Hungry man size with 2egg N2,000 Soft drinks from N350-500 Carn … | `9.0698894, 7.3523359` |
| 43 | Yargata Kitchen | Karimo | Idu Hakimi Street opposite police station Karimo . | She sells, Jollof rice with salad and meat N1,500, Rice and stew with 1 meat N1,200, porridge beans… | `9.0698183, 7.3540141` |
| 44 | Amis fresh and Hot | Karimo | IDu Hakimi Street opposite police station Karimo | She sells Small chips N300-25,000 with Beef etc. CupcakeN500-2000, Meatpie N1,000, fish roll N500, … | `9.0696838, 7.3540974` |
| 45 | Baby Fish Grills | Karimo | Behind queen Tobi's bar, opposite furniture garage, IDU, karimo | She does Barbecue N6500-7000, Roasted Fish N5,500, Grilled pepper chicken N5,000, Chicken and chips… | `9.0701183, 7.3574467` |
| 46 | Chilled Oasis Lizzy's place | Karimo | Behind queen Tobi's bar, opposite furniture garage, IDU, karimo | Sharwama N4,000 Indomie and egg N1,500, Fruit juice N 2,000, Fruit salad N2,000, Arabian tea N4,000… | `9.0699877, 7.357498` |
| 47 | Mama Sa | Karimo | Depper life junction (ldu) Karimo | She sells, Tuwoshinkafa N100-500 Masa and sauce with biscuits N100-500. | `9.0703281, 7.3595898` |
| 48 | Dora indomie Spot | Karimo | Karimo last gate opposite Sabo primary health Center. | She sells Indomie, fried plantain and egg well garnished N2,000 | `9.0697009, 7.3623044` |
| 49 | Madam popcorn | Karimo | Last gate behind Karimo Sabo primary health Center. | She sells Popcorn N500, Bons N100-200, Mineral 350-500, puff puff N100, Meatpie N500-1,000 Egg roll… | `9.0696824, 7.3623613` |
| 50 | Mama ofaku | Karimo | Last gate behind Karimo Sabo primary health Center. | White Rice and stew with meat N100, Banger with White Rice N1,200, beans and bread N800 with kpomo … | `9.0696819, 7.3623655` |
| 51 | Mama Taiye | Karimo | Karimo by Last gate front of Vinklin pharmacy | She sells Egg rolls N500, Bons N100, Doghnut N300, Fish roll N500, Meat pie N600, Drinks: Coke, 7up… | `9.069385, 7.3625633` |
| 52 | Mama Uche | Karimo | Last gate opposite Yoruba park Karimo | She sells Akara N100, potatoe N100 fried plantain N100, Yam N100, and pap N300-500. | `9.0691217, 7.3636517` |
| 53 | Mma Afam | Kado | Kado by Gwarimkpa plaza. | BonesN100, Egg Roll N500, Fish roll N400, Bread Bones N300, Apu,N200, Bread,N300-500 Zobo drink N20… | `9.0664762, 7.3964027` |
| 54 | Mme Yam | Lifecamp | Mr Bala kona street Kado life camp. | She sells Roasted yam and porridge beans with kpomo N1500 Beans and plantain with kpomo N1,500 | `9.067795, 7.4001182` |
| 55 | China | Lifecamp | Lifecamp Bella view phase 3 | Rice and stew beans and meat N1,200 jollof with salad and meat N1,500 Swallow; Semo, Apu, garri Sou… | `9.0682094, 7.4081856` |
| 56 | Aunty Indomie | Lifecamp | Lifecamp opposite Polaris bank front of Rufaidai Yoghurt | She sells Indomie and 2eggs N2,000-2500 Jollof spaghetti a plate with Beef N2,500 Drinks: Energy dr… | `9.0674206, 7.4045409` |
| 57 | Mama Ezikel | Lifecamp | Lifecamp opposite Melani wellness front of Rufaidai Yoghurt | Rice and stew with Beans, Meat and fish N1,500 Swallow: Apu, Semo and garri Soup Egusi, bitter leaf… | `9.0674361, 7.4042659` |
| 58 | Joy Fish Service | Lifecamp | Lifecamp T-shirt junction opposite AP filling station. | She sells Roasted catfish with Chips ranging from N3500-6,000 | `9.0676466, 7.4040284` |
| 59 | Madam No be lie | Lifecamp | Lifecamp by Berger Lifecamp | She sells Roasted and cooked Corn,N300-500 ,Roasted yam and roasted plantain with kpomo(2)N2,500 po… | `9.0785426, 7.3897845` |
| 60 | Calabar kitchen | Lifecamp | Lifecamp by Berger Lifecamp | She sells, Afang soup and Apu, semo or garri N2,200 Vegetable Soup N1800 White soup with pounded ya… | `9.0790368, 7.3872816` |
| 61 | Mama Obinna | Life camp | Life camp by 8 point Estate | Roasted Yam and porridge beans with kpomo N2,000 Roasted plantain with porridge beans and kpomo N2,… | `9.079551, 7.3861045` |
| 62 | Mama sunny | Life camp | Life camp Front of Chimex Bottling company. | She sells Roasted yam,and porridge beans N1,000 plantain and porridge Beans with kpomo N1,200 white… | `9.0687064, 7.4014437` |
| 63 | Mummy Twins | Lifecamp | Lifecamp by gwarimkpa junction | Rice and stew with beans N800, Jollof rice,N800, Apu, semo and garri,with oha, okro, Egusi, bitter … | `9.0685533, 7.4014767` |
| 64 | Blessing Smoothie | Life camp | Life camp opposite Kado fish market | She sells Orange juice, pineapple juice, watermelon juice, Tiger nut drink, strawberry( banana,show… | `9.0677749, 7.4025378` |
| 65 | Madam Franka | Life camp | Life camp junction opposite Submit Villa | She sells, Indomie and egg N11500-1800 Custard and bread with Milk N1,000 pap N500, beans and bread… | `9.067772, 7.4025096` |
| 66 | Madam Mbpodium plantain | Jabi | Jabi front of UOO plaza Aluminum plaza | Brown porridge beans either with roasted yam or plantain with kpomo N1200-1500 | `9.0618181, 7.4195524` |
| 67 | Madam Indomie | Jabi | Jabi opposite white plain British School, behind plastic collection center | She sells Indomie and egg for N1800-2500. Toasted bread and Tea N2500 | `9.0611876, 7.4214052` |
| 68 | Potable kitchen | Jabi | jabi back of FCDA quarters behind Recycling plastic center. | Jollof rice N1500 white rice and stew N1500, yam and beans N1500 Banger soup N2500 Egusi soup N1500… | `9.0605014, 7.4214052` |
| 69 | Mama Shilo | Jabi | Jabi opposite Sabondele before Mr Biggs | She sells Sweet a freshly Made Akara, fried yam, sweet potato, Pap and plantain, price ranging from… | `9.0624617, 7.4186817` |
| 70 | Theresa fish | Jabi | Jabi Opposite fresh Choice Eatery B4 Airport junction. | She sells Roasted catfish with pepper sauce and salad N5000-10,000 Irish potatoN3,000, Sweet potato… | `9.062329, 7.4183137` |
| 71 | madam food | Asokoro | Asokoro back of Foursquare church after the round about. | Jollof rice, white rice, porridge beans, fish,meat, Swallow: Semo, poundo, Apu, garri Wheat Soup: E… | `9.0534762, 7.5245344` |
| 72 | Madam CoCo | Asokoro | Asokoro by Police station | She sells Rice and stew, plantain, fish , goat head, beef, pounded yam, garri, Apu, Semo. Egusi Afa… | `9.0519221, 7.5247999` |
| 73 | Mama Mmesoma | Asokoro | Asokoro opposite platinum Mortgage Bank. | She sells white rice and beans, jollof rice, white yam and stew with porridge beans, white rice and… | `9.0489642, 7.5266493` |
| 74 | IVY KITCHEN | Asokoro | Asokoro opposite Ecowas by Yakubu Gowon street | She sells , White Rice and stew with meat N1500, jollof rice and meat N1500, Swallow: Apu, garri, P… | `9.0426935, 7.5251815` |
| 75 | Baba Suya | Asokoro | Asokoro opposite Ecowas by Yakubu Gowon street | Ram Suya N1,000 upward, Full roasted local chicken N7,500 | `9.042504, 7.5248981` |
| 76 | Madam Calabar | Asokoro | GNASSINGBE EYADEMA STREET OPPOSITE GOMBE STATE LIAISON OFFICE ASOKORO. | She sells Rice and stew with meat N1,000, yam and porridge beans with meat N1200 Titus fish N2,000 | `9.0406898, 7.5233262` |
| 77 | Success Snacks and Drinks | Asokoro | Kwame Nkruma Crescent Asokoro opposite Catholic Church. | She sells Egg Roll N6000, Bons N100 cooked eggs N300, Kunu N300, Zobo N300, and pure water N300 | `9.0432905, 7.5202339` |
| 78 | Joy Cathering and outdoor services | Asokoro | Asokoro by General hospital back gate | She sells Rice and stew with meat N1500 Swallow and soup, Apu, semo, garri with Egusi, okro, oha, o… | `9.0470049, 7.5243863` |
| 79 | Matan Mangu | Asokoro | Asokoro VIO office by the roundabout. | She Sells, Swallow: Apu, garri, Semo Wheat, pounded yam, Tuwoshinkafa, Tuwomasara,. Soup: Oha, whit… | `6.4541, 3.3947` |
| 80 | Madam Cash | Asokoro | Asokoro Village by Building Material . | She Sells jollof rice,N1,000 porridge beans N1,000, without meat N700, White rice and Ofaku N1,000-… | `9.0579, 7.4951` |
| 81 | Mama Amira | Asokoro | Asokoro Village Kpanduma 2 by pantaker. | She sells Masa, N100 white rice and stew with meat N900 Dawanki N600-1,000 jollof rice N900 pepper … | `9.0579, 7.4951` |
| 82 | Mme Fura | Asokoro | Asokoro Village Extension Pantaker by Mosque. | She sells Fura and Nunu and Speaks only Hausa language | `9.0579, 7.4951` |
| 83 | Mme Suya | Asokoro | Asokoro Village Extension Kurundumo 2 Mango tree. | He sells Suya, and Masa, gurasa,ranging from N3,000-5,000. | `9.0147332, 7.5168852` |
| 84 | Madam Roasted yam | Asokoro | Kpaguma 2 Asokoro Village Extension . | She sells Roasted yam, plantain, kpomo, roasted fish,and porridge beans. | `9.0160302, 7.5167711` |
| 85 | Mama Awara | Asokoro | Asokoro Village Extension by Apostolic church,Lawna Territory . | She Sells Awara, yam, potatoes, plantain, Akara, Dankwaua, peppered kpomo and kunungeda. | `9.0169855, 7.5148138` |
| 86 | Mme Awara | Asokoro | Angwua Yoruba Asokoro Village Extension | She sells Awara, Stew and yaji pepper ranging from N50-N500 | `9.0136923, 7.5137255` |
| 87 | lndomie woman | Asokoro | Asokoro Village Extension white house | Indomie and Egg well garnished a plate for super pack is N1500, while hungry man with 2 eggs is N2,… | `6.4541, 3.3947` |
| 88 | Mama moi moi | Asokoro | Asokoro Village Extension | She sells gongoni moi moi price ranging from N50-1000. | `9.0579, 7.4951` |
| 89 | Medoya /Mme yam | Asokoro | Asokoro Village Extension | She sells Roasted yam, Akara, potato, plantain etc ranging from N50-1,000 | `9.0579, 7.4951` |
| 90 | Mama Ada | Asokoro | Asokoro Garden by the round about | She sells, Rice and stew,cooked beans, Jollof rice and salad with fish and meat, all kinds of swall… | `9.0499955, 7.5272579` |
| 91 | Mandy's signature | Jabi | Jabi opposite ShopRite supermarket | She sells, Jollof Rice, porridge beans, cooked yam, Rice and stew Moi moi, Meat, Kpomo, Fish etc.ra… | `9.075363, 7.42624` |
| 92 | Mme Suya | Jabi | Jabi Ebitu Crescent by kpana junction | He sells Suya from N3,000-5000 upward and Masa N500. | `9.071592, 7.4328962` |
| 93 | God's Hand food vendor | Jabi | Jabi by Nigeria center for Diseases Control. | She sells Jollof rice and porridge beans with meat and disposable plates is N1500, Same as Rice and… | `9.0709583, 7.4321933` |
| 94 | Madam put more | Jabi | Jabi Wazobia back of Zenith bank | She sells Jollof rice with meat is N1500 without salad and plantain, with salad and plantain is N2,… | `9.0666231, 7.4311676` |
| 95 | Mama Bole | Jabi | Jabi Wazobia back of Zenith bank. | She sells Kpomo N200, Fish N700-1,000 Roasted yam, porridge Beans and Kpomo N1500, plantain N1,000 … | `9.0579, 7.4951` |
| 96 | Tina Rimke dada | Jabi | Jabi Wazobia by Zenith bank. | She sells Smothie like Orange juice N500-100, Tiger nutN500-1000, Banana and groundnut SmothieN500-… | `9.0579, 7.4951` |
| 97 | Mama Sisi | Jabi | Jabi better foundation Plaza by kpana road. | She sells Roasted yam and porridge beans for N1500, with fish is N2,000. plantain and beans N1500 p… | `9.0656116, 7.427056` |
| 98 | Mama sisi | Jabi | Jabi better foundation Plaza by kpana road. | She sells Roasted yam N1000,Roasted potatoes, Roasted plantain, kpomo N200, Roasted fishN1,000, por… | `9.0652368, 7.4269701` |
| 99 | Mama thank God | Jabi | Umaru Dikko Street by Nippco filling station. | She sells Awara N100, Bones,N100, Egg Roll N500,Mineral N400-500,Soya beans drink N200-500 etc. | `9.0649922, 7.4249045` |
| 100 | Mama Nde | Jabi | Akara N50, pap N200-300, kunu ngeda N300-500 yam N100,potato N50 | Akara N50, pap N200-300, kunu ngeda N300-500 yam N100,potato N50 | `9.0579, 7.4951` |
| 101 | Ultimate ontop | Jabi | 15 Audu Ogbeh street Jabi Abuja | He sells kunu N300-500,Zono N1,000, puff puff N100,meat pie N800, Fish pie N600,Egg roll N600,Miner… | `9.0648142, 7.4252123` |

## Vendor-by-Vendor Area Trace

| Row | Vendor Name | Original Area Value | Final CSV Area Under Current Rules | Normalization Rule Used |
|---:|---|---|---|---|
| 2 | Mai Suya | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 3 | Anambra Kitchen | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 4 | NATIONS EAT PLATE FAST FOOD | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 5 | Ann's kitchen | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 6 | Comfort Kitchen | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 7 | Mama Edo | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 8 | Christina Onishinu | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 9 | Mama mimi | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 10 | Madam TIV | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 11 | Precious Indomie | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 12 | MaMa Ola | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 13 | ADAMU SPECIAL KILISHI | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 14 | Adamu kilishi | Area 1 | Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 15 | Mummy Emma | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 16 | Madam Indomie | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 17 | Iya | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 18 | Mama Lovina | Gaduwa | Gaduwa | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 19 | Samira | Gaduwa | Gaduwa | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 20 | Mai Nama | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 21 | Favour | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 22 | Favour | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 23 | Ify plantain | Gudu | Gudu | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 24 | Madam leaky finger | Apo | Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 25 | Diamond Gee global | Apo | Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 26 | SANA'S FOOD COMBO | Apo | Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 27 | Mummy Samuel | Apo | Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 28 | Zoveno kitchen | Apo | Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 29 | Zoveno kitchen | Apo | Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 30 | Madam Jos | Gariki | Gariki | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 31 | Mama Hassan | Gariki | Gariki | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 32 | Nikxy nice | Gariki | Gariki | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 33 | Magdalene | Gariki | Gariki | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 34 | G&G Restaurant | Gariki | Gariki | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 35 | Mama Obinna | Gariki | Gariki | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 36 | Relax Delight | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 37 | Mme Indomie | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 38 | Madam yam and Beans | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 39 | CALABAR KITCHEN | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 40 | MUNACHIMNSOO RESTAURANT. | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 41 | Samuel Toluwani | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 42 | Dorathy | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 43 | Yargata Kitchen | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 44 | Amis fresh and Hot | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 45 | Baby Fish Grills | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 46 | Chilled Oasis Lizzy's place | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 47 | Mama Sa | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 48 | Dora indomie Spot | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 49 | Madam popcorn | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 50 | Mama ofaku | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 51 | Mama Taiye | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 52 | Mama Uche | Karimo | Karimo | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 53 | Mma Afam | Kado | Kado | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 54 | Mme Yam | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 55 | China | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 56 | Aunty Indomie | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 57 | Mama Ezikel | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 58 | Joy Fish Service | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 59 | Madam No be lie | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 60 | Calabar kitchen | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 61 | Mama Obinna | Life camp | Life Camp | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical spelling normalized. |
| 62 | Mama sunny | Life camp | Life Camp | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical spelling normalized. |
| 63 | Mummy Twins | Lifecamp | Lifecamp | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 64 | Blessing Smoothie | Life camp | Life Camp | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical spelling normalized. |
| 65 | Madam Franka | Life camp | Life Camp | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical spelling normalized. |
| 66 | Madam Mbpodium plantain | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 67 | Madam Indomie | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 68 | Potable kitchen | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 69 | Mama Shilo | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 70 | Theresa fish | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 71 | madam food | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 72 | Madam CoCo | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 73 | Mama Mmesoma | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 74 | IVY KITCHEN | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 75 | Baba Suya | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 76 | Madam Calabar | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 77 | Success Snacks and Drinks | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 78 | Joy Cathering and outdoor services | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 79 | Matan Mangu | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 80 | Madam Cash | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 81 | Mama Amira | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 82 | Mme Fura | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 83 | Mme Suya | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 84 | Madam Roasted yam | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 85 | Mama Awara | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 86 | Mme Awara | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 87 | lndomie woman | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 88 | Mama moi moi | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 89 | Medoya /Mme yam | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 90 | Mama Ada | Asokoro | Asokoro | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 91 | Mandy's signature | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 92 | Mme Suya | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 93 | God's Hand food vendor | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 94 | Madam put more | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 95 | Mama Bole | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 96 | Tina Rimke dada | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 97 | Mama Sisi | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 98 | Mama sisi | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 99 | Mama thank God | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 100 | Mama Nde | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 101 | Ultimate ontop | Jabi | Jabi | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |

## Special Area Review

### Area 1

| Row | Vendor | Area field | Final area under current rules | Matched text / address snippet | Handling |
|---:|---|---|---|---|---|
| 2 | Mai Suya | Area 1 | Area 1 | Dunamis Market by Dunamis Junction | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 3 | Anambra Kitchen | Area 1 | Area 1 | Garage before Dunamis Church Area 1. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 4 | NATIONS EAT PLATE FAST FOOD | Area 1 | Area 1 | Area 1 before Dunamis Church by Dunamis Junction. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 5 | Ann's kitchen | Area 1 | Area 1 | Dagba Church village opposite police station Durumi Area 1. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 6 | Comfort Kitchen | Area 1 | Area 1 | Ayuba waba, Close to Sumabib indomie Factory. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 7 | Mama Edo | Area 1 | Area 1 | Dagba, Area 1 besides Ebeneza plaza | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 8 | Christina Onishinu | Area 1 | Area 1 | Besides Ebeniza plaza, opposite a Mechanic. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 9 | Mama mimi | Area 1 | Area 1 | Gwagwalada park Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 10 | Madam TIV | Area 1 | Area 1 | Area 1 Gwagwalada park. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 11 | Precious Indomie | Area 1 | Area 1 | Area 1 opposite Gwagwalada park, VIO street. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 12 | MaMa Ola | Area 1 | Area 1 | Opposite Police Station, Shopping Complex Area1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 13 | ADAMU SPECIAL KILISHI | Area 1 | Area 1 | Area 1 Shopping Center, Gariki-Abuja | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 14 | Adamu kilishi | Area 1 | Area 1 | Sokoto Street, Shagari plaza,by Traffic | No governance match; importer preserves original area and flags UNKNOWN_AREA. |

### Area 2

_No matches found in area, address, description, or detected-location fields._

### Area 3

_No matches found in area, address, description, or detected-location fields._

### Gudu

| Row | Vendor | Area field | Final area under current rules | Matched text / address snippet | Handling |
|---:|---|---|---|---|---|
| 15 | Mummy Emma | Gudu | Gudu | Gudu District Market After Fcmb Bank, APO | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 16 | Madam Indomie | Gudu | Gudu | Gudu District Market front of NB Plaza, APO | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 17 | Iya | Gudu | Gudu | First gate Gudu Market opposite Police Station. (APO) | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 18 | Mama Lovina | Gaduwa | Gaduwa | Gaduwa junction beside MRS filling station, opposite AXIS Plaza. (Gudu) | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 19 | Samira | Gaduwa | Gaduwa | Gaduwa opposite Toastpan Eatery, (Gudu) | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 20 | Mai Nama | Gudu | Gudu | opposite Gaduwa Estate, Gaduwa Gudu Apo. | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 21 | Favour | Gudu | Gudu | Gudu park Apo Front of Eugols Kitchen | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 22 | Favour | Gudu | Gudu | Gudu park Apo Front of Eugols Kitchen | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 23 | Ify plantain | Gudu | Gudu | Gudu park Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 24 | Madam leaky finger | Apo | Apo | Gudu park Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |

### Apo

| Row | Vendor | Area field | Final area under current rules | Matched text / address snippet | Handling |
|---:|---|---|---|---|---|
| 15 | Mummy Emma | Gudu | Gudu | Gudu District Market After Fcmb Bank, APO | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 16 | Madam Indomie | Gudu | Gudu | Gudu District Market front of NB Plaza, APO | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 17 | Iya | Gudu | Gudu | First gate Gudu Market opposite Police Station. (APO) | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 20 | Mai Nama | Gudu | Gudu | opposite Gaduwa Estate, Gaduwa Gudu Apo. | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 21 | Favour | Gudu | Gudu | Gudu park Apo Front of Eugols Kitchen | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 22 | Favour | Gudu | Gudu | Gudu park Apo Front of Eugols Kitchen | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 23 | Ify plantain | Gudu | Gudu | Gudu park Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 24 | Madam leaky finger | Apo | Apo | Gudu park Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 25 | Diamond Gee global | Apo | Apo | David Ejor street back of AP filling station, Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 26 | SANA'S FOOD COMBO | Apo | Apo | Legislative quarters No 2 IDRIS GARBA CLOSE Apo. | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 27 | Mummy Samuel | Apo | Apo | Legislative quarters,Jim Nwobodo Street Apo | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 28 | Zoveno kitchen | Apo | Apo | Legislative quarters Jim Nwobodo Street Apo. | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |
| 29 | Zoveno kitchen | Apo | Apo | Legislative quarters Jim Nwobodo Street Apo. | Known ABUJA_AREA_DEFINITIONS exact/alias match; canonical area retained. |

### Apo Dutse

_No matches found in area, address, description, or detected-location fields._

### CBD

_No matches found in area, address, description, or detected-location fields._

### Central Area

_No matches found in area, address, description, or detected-location fields._

### Central Business District

_No matches found in area, address, description, or detected-location fields._

### Wuye

_No matches found in area, address, description, or detected-location fields._

### Garki Area reference

| Row | Vendor | Area field | Final area under current rules | Matched text / address snippet | Handling |
|---:|---|---|---|---|---|
| 2 | Mai Suya | Area 1 | Area 1 | Dunamis Market by Dunamis Junction | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 3 | Anambra Kitchen | Area 1 | Area 1 | Garage before Dunamis Church Area 1. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 4 | NATIONS EAT PLATE FAST FOOD | Area 1 | Area 1 | Area 1 before Dunamis Church by Dunamis Junction. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 5 | Ann's kitchen | Area 1 | Area 1 | Dagba Church village opposite police station Durumi Area 1. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 6 | Comfort Kitchen | Area 1 | Area 1 | Ayuba waba, Close to Sumabib indomie Factory. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 7 | Mama Edo | Area 1 | Area 1 | Dagba, Area 1 besides Ebeneza plaza | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 8 | Christina Onishinu | Area 1 | Area 1 | Besides Ebeniza plaza, opposite a Mechanic. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 9 | Mama mimi | Area 1 | Area 1 | Gwagwalada park Area 1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 10 | Madam TIV | Area 1 | Area 1 | Area 1 Gwagwalada park. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 11 | Precious Indomie | Area 1 | Area 1 | Area 1 opposite Gwagwalada park, VIO street. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 12 | MaMa Ola | Area 1 | Area 1 | Opposite Police Station, Shopping Complex Area1 | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 13 | ADAMU SPECIAL KILISHI | Area 1 | Area 1 | Area 1 Shopping Center, Gariki-Abuja | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 14 | Adamu kilishi | Area 1 | Area 1 | Sokoto Street, Shagari plaza,by Traffic | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 30 | Madam Jos | Gariki | Gariki | Obiaja Close opposite Akintola Bulavad Along Gariki Market. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 31 | Mama Hassan | Gariki | Gariki | Enough stress By Lagos Street opposite H-medix | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 32 | Nikxy nice | Gariki | Gariki | No 56 Sukka Street Gariki Abuja | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 33 | Magdalene | Gariki | Gariki | Suka street opposite Correct place, Adjacent to Lagos Street. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 34 | G&G Restaurant | Gariki | Gariki | Lagos Street Gariki village front of Police veterinary hospital. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |
| 35 | Mama Obinna | Gariki | Gariki | Akakuku street Gariki B4 H-medix pharmacy. | No governance match; importer preserves original area and flags UNKNOWN_AREA. |

### Wuse Zone reference

_No matches found in area, address, description, or detected-location fields._

## Suspicious Mapping Report

- Area values transformed by current governance lookup:
  - Row 61: `Life camp` -> `Life Camp`
  - Row 62: `Life camp` -> `Life Camp`
  - Row 64: `Life camp` -> `Life Camp`
  - Row 65: `Life camp` -> `Life Camp`

| Row | Vendor | Area field | Final area | Other locality references found | Address / description evidence | Review reason |
|---:|---|---|---|---|---|---|
| 5 | Ann's kitchen | Area 1 | Area 1 | Durumi | Dagba Church village opposite police station Durumi Area 1. She sells Indomie and 2eggs N1,500 cooked yam and porridge beans N1,500 Swallow… | Address/description contains locality terms different from assigned/preserved area. |
| 9 | Mama mimi | Area 1 | Area 1 | Gwagwalada | Gwagwalada park Area 1 She sells porridge beans and Roasted yam with Kpomo N1,300 porridge beans with plantain and kpomo N1,500 | Address/description contains locality terms different from assigned/preserved area. |
| 10 | Madam TIV | Area 1 | Area 1 | Gwagwalada | Area 1 Gwagwalada park. She sells Indomie and 2egg N1,500 white Rice, stew and beans with meat N1,500 Swallow: Semo, Apu, garri Soup: okro … | Address/description contains locality terms different from assigned/preserved area. |
| 11 | Precious Indomie | Area 1 | Area 1 | Gwagwalada | Area 1 opposite Gwagwalada park, VIO street. She sells Indomie and 2eggs N1,300-1,600 Soft Drinks like : Fearless N600, Malt, N700,Coke ,fa… | Address/description contains locality terms different from assigned/preserved area. |
| 13 | ADAMU SPECIAL KILISHI | Area 1 | Area 1 | Gariki | Area 1 Shopping Center, Gariki-Abuja He sells Special dried Kilishi, Suya Dambu, Nama, Ram, Goat meat, and Chicken suya | Address/description contains locality terms different from assigned/preserved area. |
| 15 | Mummy Emma | Gudu | Gudu | Apo | Gudu District Market After Fcmb Bank, APO She sells Sells Roasted yam and porridge beans with Kpomo N2,000-5,000 porridge beans and plantai… | Address/description contains locality terms different from assigned/preserved area. |
| 16 | Madam Indomie | Gudu | Gudu | Apo | Gudu District Market front of NB Plaza, APO She sells All sort of Soft drinks ranging from N400-1,000 Indomie and 2eggs N1,500 | Address/description contains locality terms different from assigned/preserved area. |
| 17 | Iya | Gudu | Gudu | Apo | First gate Gudu Market opposite Police Station. (APO) She sells Meatpie N600, Sausage roll N600 ,Egg roll N600, Doghnut N100-300, Bons N100… | Address/description contains locality terms different from assigned/preserved area. |
| 18 | Mama Lovina | Gaduwa | Gaduwa | Gudu | Gaduwa junction beside MRS filling station, opposite AXIS Plaza. (Gudu) She sells White Rice and stew with meat and beans N1,300 jollof ric… | Address/description contains locality terms different from assigned/preserved area. |
| 19 | Samira | Gaduwa | Gaduwa | Gudu | Gaduwa opposite Toastpan Eatery, (Gudu) Pap N300-500, Kunungeda N500-1,000 ,Akara N50 , potato N50 and Yam N50 with Kpomo N1,00. | Address/description contains locality terms different from assigned/preserved area. |
| 20 | Mai Nama | Gudu | Gudu | Apo, Gaduwa | opposite Gaduwa Estate, Gaduwa Gudu Apo. Ram Roasted Suya 1kilo N12,000 | Address/description contains locality terms different from assigned/preserved area. |
| 21 | Favour | Gudu | Gudu | Apo | Gudu park Apo Front of Eugols Kitchen She sells Akara N100,Yam N100, potatoes N100, Fish N500-1,000, pap 500, plantain (3) N500 and Fried c… | Address/description contains locality terms different from assigned/preserved area. |
| 22 | Favour | Gudu | Gudu | Apo | Gudu park Apo Front of Eugols Kitchen She sells Akara N100,Yam N100, potatoes N100, Fish N500-1,000, pap 500, plantain (3) N500 and Fried c… | Address/description contains locality terms different from assigned/preserved area. |
| 23 | Ify plantain | Gudu | Gudu | Apo | Gudu park Apo She sells Roasted yam and Beans with kpomo N1,200 Roasted plantain and beans with kpomo N1,700 Beans and bread N1,100 Bottle … | Address/description contains locality terms different from assigned/preserved area. |
| 24 | Madam leaky finger | Apo | Apo | Gudu | Gudu park Apo She sells Rice and stew, with beans and meat N2,300 jollof rice with Chicken N3,500 Swallow: Semo, Apu, garri and what Soup: … | Address/description contains locality terms different from assigned/preserved area. |
| 40 | MUNACHIMNSOO RESTAURANT. | Karimo | Karimo | Idu | IDU industrial Area, behind back of NNPC filling station. She sells Rice and stew With meat N1,500, porridge beans and yam N1500, Spaghetti… | Address/description contains locality terms different from assigned/preserved area. |
| 41 | Samuel Toluwani | Karimo | Karimo | Idu | IDU Mechanic opposite Car wash Egg roll N500, Bons N100, Puff puff N1,000, Chin Chin N200. Zobo N200, soft drinks,N300-500 Fearless And pre… | Address/description contains locality terms different from assigned/preserved area. |
| 43 | Yargata Kitchen | Karimo | Karimo | Idu | Idu Hakimi Street opposite police station Karimo . She sells, Jollof rice with salad and meat N1,500, Rice and stew with 1 meat N1,200, por… | Address/description contains locality terms different from assigned/preserved area. |
| 44 | Amis fresh and Hot | Karimo | Karimo | Idu | IDu Hakimi Street opposite police station Karimo She sells Small chips N300-25,000 with Beef etc. CupcakeN500-2000, Meatpie N1,000, fish ro… | Address/description contains locality terms different from assigned/preserved area. |
| 45 | Baby Fish Grills | Karimo | Karimo | Idu | Behind queen Tobi's bar, opposite furniture garage, IDU, karimo She does Barbecue N6500-7000, Roasted Fish N5,500, Grilled pepper chicken N… | Address/description contains locality terms different from assigned/preserved area. |
| 46 | Chilled Oasis Lizzy's place | Karimo | Karimo | Idu | Behind queen Tobi's bar, opposite furniture garage, IDU, karimo Sharwama N4,000 Indomie and egg N1,500, Fruit juice N 2,000, Fruit salad N2… | Address/description contains locality terms different from assigned/preserved area. |
| 54 | Mme Yam | Lifecamp | Lifecamp | Kado, Life Camp | Mr Bala kona street Kado life camp. She sells Roasted yam and porridge beans with kpomo N1500 Beans and plantain with kpomo N1,500 | Address/description contains locality terms different from assigned/preserved area. |
| 64 | Blessing Smoothie | Life camp | Life Camp | Kado | Life camp opposite Kado fish market She sells Orange juice, pineapple juice, watermelon juice, Tiger nut drink, strawberry( banana,showersh… | Address/description contains locality terms different from assigned/preserved area. |

## Geographic Sanity Findings

Configured discovery centers are available only for Wuse, Gwarinpa, Jabi, Utako, Maitama, Asokoro, Garki, Kubwa, and Lugbe. Distances below are a plausibility aid, not a geocoding correction.

### Coordinate Centroids By Raw Area

| Raw area | Vendors with coordinates | Coordinate centroid | Nearest configured discovery center |
|---|---:|---|---|
| Apo | 6 | `9.011869, 7.477657` | Garki 1.8 km; Asokoro 5.7 km; Utako 7.6 km |
| Area 1 | 13 | `9.027484, 7.467386` | Garki 1.7 km; Utako 5.6 km; Asokoro 5.7 km |
| Asokoro | 20 | `8.783984, 7.102418` | Lugbe 36.1 km; Jabi 47.1 km; Kubwa 47.7 km |
| Gaduwa | 2 | `9.003216, 7.464722` | Garki 3.3 km; Asokoro 7.4 km; Utako 7.9 km |
| Gariki | 6 | `9.021927, 7.487566` | Garki 0.7 km; Asokoro 4.2 km; Wuse 7.0 km |
| Gudu | 7 | `8.999906, 7.470815` | Garki 3.3 km; Asokoro 7.2 km; Utako 8.5 km |
| Jabi | 16 | `9.064199, 7.438206` | Utako 0.7 km; Jabi 1.7 km; Wuse 3.7 km |
| Kado | 1 | `9.066476, 7.396403` | Jabi 2.9 km; Gwarinpa 4.9 km; Utako 4.9 km |
| Karimo | 17 | `9.068615, 7.361136` | Gwarinpa 6.6 km; Jabi 6.8 km; Lugbe 8.7 km |
| Life camp | 4 | `9.070951, 7.398149` | Jabi 2.8 km; Gwarinpa 4.4 km; Utako 4.7 km |
| Lifecamp | 8 | `9.070580, 7.399960` | Jabi 2.6 km; Gwarinpa 4.4 km; Utako 4.5 km |

### Row-Level Geographic Notes

| Row | Vendor | Area field | Coordinates | Severity | Finding |
|---:|---|---|---|---|---|
| 2 | Mai Suya | Area 1 | `9.0259712, 7.4700817` | INFO | Unknown governance area; coordinates are near configured Garki center (1.5 km), but no governance rule maps Area 1 to Garki. |
| 3 | Anambra Kitchen | Area 1 | `9.025545, 7.469465` | INFO | Unknown governance area; coordinates are near configured Garki center (1.5 km), but no governance rule maps Area 1 to Garki. |
| 4 | NATIONS EAT PLATE FAST FOOD | Area 1 | `9.0248273, 7.4690103` | INFO | Unknown governance area; coordinates are near configured Garki center (1.6 km), but no governance rule maps Area 1 to Garki. |
| 5 | Ann's kitchen | Area 1 | `9.0258168, 7.4637133` | INFO | Unknown governance area; coordinates are near configured Garki center (2.2 km), but no governance rule maps Area 1 to Garki. |
| 6 | Comfort Kitchen | Area 1 | `9.0263632, 7.4639992` | INFO | Unknown governance area; coordinates are near configured Garki center (2.1 km), but no governance rule maps Area 1 to Garki. |
| 7 | Mama Edo | Area 1 | `9.0260453, 7.4638509` | INFO | Unknown governance area; coordinates are near configured Garki center (2.1 km), but no governance rule maps Area 1 to Garki. |
| 8 | Christina Onishinu | Area 1 | `9.0260285, 7.4638563` | INFO | Unknown governance area; coordinates are near configured Garki center (2.1 km), but no governance rule maps Area 1 to Garki. |
| 9 | Mama mimi | Area 1 | `9.0274517, 7.467905` | INFO | Unknown governance area; coordinates are near configured Garki center (1.7 km), but no governance rule maps Area 1 to Garki. |
| 10 | Madam TIV | Area 1 | `9.0278317, 7.4671867` | INFO | Unknown governance area; coordinates are near configured Garki center (1.8 km), but no governance rule maps Area 1 to Garki. |
| 11 | Precious Indomie | Area 1 | `9.0284875, 7.4663562` | INFO | Unknown governance area; coordinates are near configured Garki center (1.9 km), but no governance rule maps Area 1 to Garki. |
| 12 | MaMa Ola | Area 1 | `9.031401, 7.4698664` | INFO | Unknown governance area; coordinates are near configured Garki center (1.6 km), but no governance rule maps Area 1 to Garki. |
| 13 | ADAMU SPECIAL KILISHI | Area 1 | `9.0310461, 7.4704132` | INFO | Unknown governance area; coordinates are near configured Garki center (1.5 km), but no governance rule maps Area 1 to Garki. |
| 14 | Adamu kilishi | Area 1 | `9.0304783, 7.4703117` | INFO | Unknown governance area; coordinates are near configured Garki center (1.5 km), but no governance rule maps Area 1 to Garki. |
| 15 | Mummy Emma | Gudu | `8.9980303, 7.4725915` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.4 km. |
| 16 | Madam Indomie | Gudu | `8.998249, 7.4718152` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.4 km. |
| 17 | Iya | Gudu | `8.9999369, 7.472287` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.2 km. |
| 18 | Mama Lovina | Gaduwa | `9.0035953, 7.4645591` | INFO | Unknown governance area; nearest configured discovery center is Garki at 3.3 km. |
| 19 | Samira | Gaduwa | `9.002836, 7.4648849` | INFO | Unknown governance area; nearest configured discovery center is Garki at 3.3 km. |
| 20 | Mai Nama | Gudu | `9.002695, 7.4646465` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.4 km. |
| 21 | Favour | Gudu | `8.9998887, 7.4711588` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.3 km. |
| 22 | Favour | Gudu | `9.0006891, 7.4720249` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.1 km. |
| 23 | Ify plantain | Gudu | `8.9998551, 7.4711794` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.3 km. |
| 24 | Madam leaky finger | Apo | `9.000146, 7.4717771` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 3.2 km. |
| 25 | Diamond Gee global | Apo | `9.0113782, 7.4728413` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 2.1 km. |
| 26 | SANA'S FOOD COMBO | Apo | `9.0121238, 7.4780563` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 1.7 km. |
| 27 | Mummy Samuel | Apo | `9.0154183, 7.48145` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 1.3 km. |
| 28 | Zoveno kitchen | Apo | `9.016075, 7.4809089` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 1.2 km. |
| 29 | Zoveno kitchen | Apo | `9.016075, 7.4809089` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Garki at 1.2 km. |
| 30 | Madam Jos | Gariki | `9.018934, 7.4920715` | INFO | Unknown governance area; nearest configured discovery center is Garki at 1.3 km. |
| 31 | Mama Hassan | Gariki | `9.0239963, 7.4874059` | INFO | Unknown governance area; nearest configured discovery center is Garki at 0.5 km. |
| 32 | Nikxy nice | Gariki | `9.0224526, 7.4876739` | INFO | Unknown governance area; nearest configured discovery center is Garki at 0.7 km. |
| 33 | Magdalene | Gariki | `9.0216288, 7.4872872` | INFO | Unknown governance area; nearest configured discovery center is Garki at 0.7 km. |
| 34 | G&G Restaurant | Gariki | `9.021222, 7.4854184` | INFO | Unknown governance area; nearest configured discovery center is Garki at 0.7 km. |
| 35 | Mama Obinna | Gariki | `9.0233273, 7.4855401` | INFO | Unknown governance area; nearest configured discovery center is Garki at 0.4 km. |
| 36 | Relax Delight | Karimo | `9.0652911, 7.3800676` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 4.7 km. |
| 37 | Mme Indomie | Karimo | `9.0671102, 7.3660052` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 6.3 km. |
| 38 | Madam yam and Beans | Karimo | `9.0635308, 7.3716828` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 5.6 km. |
| 39 | CALABAR KITCHEN | Karimo | `9.0616413, 7.3730223` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 5.5 km. |
| 40 | MUNACHIMNSOO RESTAURANT. | Karimo | `9.0705827, 7.348464` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 7.5 km. |
| 41 | Samuel Toluwani | Karimo | `9.0708967, 7.3518383` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 7.2 km. |
| 42 | Dorathy | Karimo | `9.0698894, 7.3523359` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 7.2 km. |
| 43 | Yargata Kitchen | Karimo | `9.0698183, 7.3540141` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 7.1 km. |
| 44 | Amis fresh and Hot | Karimo | `9.0696838, 7.3540974` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 7.1 km. |
| 45 | Baby Fish Grills | Karimo | `9.0701183, 7.3574467` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.8 km. |
| 46 | Chilled Oasis Lizzy's place | Karimo | `9.0699877, 7.357498` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.8 km. |
| 47 | Mama Sa | Karimo | `9.0703281, 7.3595898` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.6 km. |
| 48 | Dora indomie Spot | Karimo | `9.0697009, 7.3623044` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.4 km. |
| 49 | Madam popcorn | Karimo | `9.0696824, 7.3623613` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.4 km. |
| 50 | Mama ofaku | Karimo | `9.0696819, 7.3623655` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.4 km. |
| 51 | Mama Taiye | Karimo | `9.069385, 7.3625633` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.4 km. |
| 52 | Mama Uche | Karimo | `9.0691217, 7.3636517` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 6.4 km. |
| 53 | Mma Afam | Kado | `9.0664762, 7.3964027` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Jabi at 2.9 km. |
| 54 | Mme Yam | Lifecamp | `9.067795, 7.4001182` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 2.5 km. |
| 55 | China | Lifecamp | `9.0682094, 7.4081856` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 1.7 km. |
| 56 | Aunty Indomie | Lifecamp | `9.0674206, 7.4045409` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 2.1 km. |
| 57 | Mama Ezikel | Lifecamp | `9.0674361, 7.4042659` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 2.1 km. |
| 58 | Joy Fish Service | Lifecamp | `9.0676466, 7.4040284` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 2.1 km. |
| 59 | Madam No be lie | Lifecamp | `9.0785426, 7.3897845` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 3.8 km. |
| 60 | Calabar kitchen | Lifecamp | `9.0790368, 7.3872816` | INFO | Unknown governance area; nearest configured discovery center is Gwarinpa at 3.9 km. |
| 61 | Mama Obinna | Life camp | `9.079551, 7.3861045` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Gwarinpa at 3.9 km. |
| 62 | Mama sunny | Life camp | `9.0687064, 7.4014437` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Jabi at 2.4 km. |
| 63 | Mummy Twins | Lifecamp | `9.0685533, 7.4014767` | INFO | Unknown governance area; nearest configured discovery center is Jabi at 2.4 km. |
| 64 | Blessing Smoothie | Life camp | `9.0677749, 7.4025378` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Jabi at 2.3 km. |
| 65 | Madam Franka | Life camp | `9.067772, 7.4025096` | INFO | Governed area has no configured discovery center; nearest configured discovery center is Jabi at 2.3 km. |
| 79 | Matan Mangu | Asokoro | `6.4541, 3.3947` | REVIEW | Assigned discovery area center is 537.8 km away. |
| 87 | lndomie woman | Asokoro | `6.4541, 3.3947` | REVIEW | Assigned discovery area center is 537.8 km away. |

## Mapping Summary

- Unchanged areas: **96 / 100 vendors**.
- Normalized areas: **4 / 100 vendors**.
- Potentially incorrect governance remaps: **0**.
- Area values not in governance: **46 vendors across 5 raw value(s)**.

| Unknown raw area | Vendor count | Recommendation |
|---|---:|---|
| Area 1 | 13 | Governance decision required. Coordinates/text cluster near Garki-side districts, but no existing rule maps this to Garki. |
| Gaduwa | 2 | Review governance addition or explicit alias decision; current importer will preserve this value as unknown. |
| Gariki | 6 | Likely spelling variant of Garki based on text and coordinates; requires explicit governance alias decision before import. |
| Karimo | 17 | Review governance addition or explicit alias decision; current importer will preserve this value as unknown. |
| Lifecamp | 8 | Likely spelling variant of Life Camp; requires explicit governance alias decision before import. |

## Governance Recommendation

1. **Is Batch 4 area mapping safe?** No wrong governance remap was found, but the batch is not governance-complete because several raw area values are not in `ABUJA_AREA_DEFINITIONS`.
2. **Did any vendor lose location meaning?** Under the current importer rule, no. Unknown area text is preserved. Location meaning would be lost only if a separate transformation forcibly mapped these unknown values into another area without evidence.
3. **Are governance additions required?** Yes, before import readiness: review observed unknowns `Area 1`, `Gaduwa`, `Gariki`, `Karimo`, and `Lifecamp`. `Gariki` likely needs an explicit alias to `Garki`; `Lifecamp` likely needs an explicit alias to `Life Camp`.
4. **Are Area 1 / Area 2 / Area 3 actually needed?** `Area 1` is present in 13 rows and needs a governance decision. `Area 2` and `Area 3` were not found in this corrected workbook, so this workbook does not prove they are needed.

## Final Verdict

**NOT SAFE FOR IMPORT**

No wrong area remaps were found, but the corrected workbook contains area values not in ABUJA_AREA_DEFINITIONS; import would preserve them as unknown areas and trigger governance warnings. Also, 2 row(s) have coordinates that are geographically implausible for the assigned area.
