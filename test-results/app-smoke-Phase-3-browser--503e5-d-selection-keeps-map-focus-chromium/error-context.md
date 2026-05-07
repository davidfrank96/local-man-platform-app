# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> mobile map marker selection surfaces the selected vendor preview and card selection keeps map focus
- Location: tests/e2e/app-smoke.spec.ts:1056:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.selected-vendor-panel')
Expected substring: "Slug:"
Received string:    "Selected vendorAyobami9.4 kmOpenActive hours: 7:00 AM - 6:00 AMpepper soup riceArea: WuseCallDirectionsView details"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('.selected-vendor-panel')
    9 × locator resolved to <section class="selected-vendor-panel">…</section>
      - unexpected value "Selected vendorAyobami9.4 kmOpenActive hours: 7:00 AM - 6:00 AMpepper soup riceArea: WuseCallDirectionsView details"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - region "The Local Man" [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - paragraph [ref=e8]: Abuja pilot
          - heading "The Local Man" [level=1] [ref=e9]
          - paragraph [ref=e10]: Nearby local vendors. Act quickly.
        - generic [ref=e11]:
          - generic [ref=e12]:
            - strong [ref=e13]: Using your current location
            - generic [ref=e14]: Wuse II, Abuja
            - generic [ref=e15]: High accuracy
          - button "Retry location" [ref=e16] [cursor=pointer]
        - region "Vendor sections" [ref=e17]:
          - button "Nearby" [pressed] [ref=e18]
          - button "Recent" [ref=e19]
          - button "Popular" [ref=e20]
          - button "Last selected" [ref=e21]
        - generic [ref=e22]:
          - generic [ref=e23]:
            - strong [ref=e24]: Nearby vendors
            - generic [ref=e25]: Open now, then popular, then distance
          - article [ref=e26]:
            - button "Preview Ayobami on map" [pressed] [ref=e27] [cursor=pointer]:
              - generic [ref=e28]:
                - generic [ref=e29]: Popular nearby
                - generic [ref=e31]:
                  - generic [ref=e32]:
                    - heading "Ayobami" [level=3] [ref=e33]
                    - generic [ref=e34]: Open
                  - paragraph [ref=e35]:
                    - img [ref=e37]
                    - text: pepper soup rice
                  - generic [ref=e39]:
                    - paragraph [ref=e40]:
                      - img [ref=e42]
                      - generic [ref=e45]: 9.4 km
                    - paragraph [ref=e46]:
                      - img [ref=e48]
                      - generic [ref=e51]: "Active hours: 7:00 AM - 6:00 AM"
                    - paragraph [ref=e52]:
                      - img [ref=e54]
                      - generic [ref=e55]: Higher price • Wuse
                    - generic [ref=e56]:
                      - img [ref=e58]
                      - generic [ref=e60]: ★ 4.2
                  - paragraph [ref=e61]: Tap to preview on map
            - generic [ref=e62]:
              - generic [ref=e63]:
                - link "Call" [ref=e64] [cursor=pointer]:
                  - /url: tel:08065783762
                - link "Directions" [ref=e65] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0813%2C7.4859
              - link "View details →" [ref=e66] [cursor=pointer]:
                - /url: /vendors/pepper-soup-rice?returnTo=%2F&location_source=precise
          - article [ref=e67]:
            - button "Preview Jabi Office Lunch Bowl on map" [ref=e68] [cursor=pointer]:
              - generic [ref=e69]:
                - generic [ref=e70]: Popular nearby
                - generic [ref=e72]:
                  - generic [ref=e73]:
                    - heading "Jabi Office Lunch Bowl" [level=3] [ref=e74]
                    - generic [ref=e75]: Open
                  - paragraph [ref=e76]:
                    - img [ref=e78]
                    - text: White rice and stew
                  - generic [ref=e80]:
                    - paragraph [ref=e81]:
                      - img [ref=e83]
                      - generic [ref=e86]: 3.2 km
                    - paragraph [ref=e87]:
                      - img [ref=e89]
                      - generic [ref=e92]: "Active hours: 10:30 AM - 4:00 PM"
                    - paragraph [ref=e93]:
                      - img [ref=e95]
                      - generic [ref=e96]: Everyday price • Jabi
                    - generic [ref=e97]:
                      - img [ref=e99]
                      - generic [ref=e101]: ★ 2.8
                  - paragraph [ref=e102]: Tap to preview on map
            - generic [ref=e103]:
              - generic [ref=e104]:
                - link "Call" [ref=e105] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e106] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0606%2C7.4219
              - link "View details →" [ref=e107] [cursor=pointer]:
                - /url: /vendors/jabi-office-lunch-bowl?returnTo=%2F&location_source=precise
          - article [ref=e108]:
            - button "Preview Utako Rice and Swallow on map" [ref=e109] [cursor=pointer]:
              - generic [ref=e110]:
                - generic [ref=e111]: Popular nearby
                - generic [ref=e113]:
                  - generic [ref=e114]:
                    - heading "Utako Rice and Swallow" [level=3] [ref=e115]
                    - generic [ref=e116]: Open
                  - paragraph [ref=e117]:
                    - img [ref=e119]
                    - text: Eba with egusi
                  - generic [ref=e121]:
                    - paragraph [ref=e122]:
                      - img [ref=e124]
                      - generic [ref=e127]: 4.6 km
                    - paragraph [ref=e128]:
                      - img [ref=e130]
                      - generic [ref=e133]: "Active hours: 10:30 AM - 4:00 PM"
                    - paragraph [ref=e134]:
                      - img [ref=e136]
                      - generic [ref=e137]: Everyday price • Utako
                    - generic [ref=e139]: New
                  - paragraph [ref=e140]: Tap to preview on map
            - generic [ref=e141]:
              - generic [ref=e142]:
                - link "Call" [ref=e143] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e144] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0723%2C7.4408
              - link "View details →" [ref=e145] [cursor=pointer]:
                - /url: /vendors/utako-rice-and-swallow?returnTo=%2F&location_source=precise
          - article [ref=e146]:
            - button "Preview Jabi Grill and Drinks on map" [ref=e147] [cursor=pointer]:
              - generic [ref=e150]:
                - generic [ref=e151]:
                  - heading "Jabi Grill and Drinks" [level=3] [ref=e152]
                  - generic [ref=e153]: Open
                - paragraph [ref=e154]:
                  - img [ref=e156]
                  - text: Grilled chicken
                - generic [ref=e158]:
                  - paragraph [ref=e159]:
                    - img [ref=e161]
                    - generic [ref=e164]: 4.1 km
                  - paragraph [ref=e165]:
                    - img [ref=e167]
                    - generic [ref=e170]: "Active hours: 10:00 AM - 7:00 PM"
                  - paragraph [ref=e171]:
                    - img [ref=e173]
                    - generic [ref=e174]: Everyday price • Jabi
                  - generic [ref=e176]: New
                - paragraph [ref=e177]: Tap to preview on map
            - generic [ref=e178]:
              - generic [ref=e179]:
                - link "Call" [ref=e180] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e181] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0685%2C7.4352
              - link "View details →" [ref=e182] [cursor=pointer]:
                - /url: /vendors/jabi-grill-and-drinks?returnTo=%2F&location_source=precise
          - article [ref=e183]:
            - button "Preview Maitama Lunch Canteen on map" [ref=e184] [cursor=pointer]:
              - generic [ref=e187]:
                - generic [ref=e188]:
                  - heading "Maitama Lunch Canteen" [level=3] [ref=e189]
                  - generic [ref=e190]: Open
                - paragraph [ref=e191]:
                  - img [ref=e193]
                  - text: Native rice
                - generic [ref=e195]:
                  - paragraph [ref=e196]:
                    - img [ref=e198]
                    - generic [ref=e201]: 9.6 km
                  - paragraph [ref=e202]:
                    - img [ref=e204]
                    - generic [ref=e207]: "Active hours: 10:30 AM - 4:00 PM"
                  - paragraph [ref=e208]:
                    - img [ref=e210]
                    - generic [ref=e211]: Everyday price • Maitama
                  - generic [ref=e213]: New
                - paragraph [ref=e214]: Tap to preview on map
            - generic [ref=e215]:
              - generic [ref=e216]:
                - link "Call" [ref=e217] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e218] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0895%2C7.4872
              - link "View details →" [ref=e219] [cursor=pointer]:
                - /url: /vendors/maitama-lunch-canteen?returnTo=%2F&location_source=precise
          - article [ref=e220]:
            - button "Preview Wuse Zobo and Snacks on map" [ref=e221] [cursor=pointer]:
              - generic [ref=e224]:
                - generic [ref=e225]:
                  - heading "Wuse Zobo and Snacks" [level=3] [ref=e226]
                  - generic [ref=e227]: Open
                - paragraph [ref=e228]:
                  - img [ref=e230]
                  - text: Zobo and puff-puff
                - generic [ref=e232]:
                  - paragraph [ref=e233]:
                    - img [ref=e235]
                    - generic [ref=e238]: 6.8 km
                  - paragraph [ref=e239]:
                    - img [ref=e241]
                    - generic [ref=e244]: "Active hours: 10:00 AM - 7:00 PM"
                  - paragraph [ref=e245]:
                    - img [ref=e247]
                    - generic [ref=e248]: Budget-friendly • Wuse
                  - generic [ref=e250]: New
                - paragraph [ref=e251]: Tap to preview on map
            - generic [ref=e252]:
              - generic [ref=e253]:
                - link "Call" [ref=e254] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e255] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0748%2C7.4615
              - link "View details →" [ref=e256] [cursor=pointer]:
                - /url: /vendors/wuse-zobo-and-snacks?returnTo=%2F&location_source=precise
          - article [ref=e257]:
            - button "Preview Joyful Foods on map" [ref=e258] [cursor=pointer]:
              - generic [ref=e261]:
                - generic [ref=e262]:
                  - heading "Joyful Foods" [level=3] [ref=e263]
                  - generic [ref=e264]: Open
                - paragraph [ref=e265]:
                  - img [ref=e267]
                  - text: Yam and Egg
                - generic [ref=e269]:
                  - paragraph [ref=e270]:
                    - img [ref=e272]
                    - generic [ref=e275]: 9.3 km
                  - paragraph [ref=e276]:
                    - img [ref=e278]
                    - generic [ref=e281]: "Active hours: 10:00 AM - 6:30 PM"
                  - paragraph [ref=e282]:
                    - img [ref=e284]
                    - generic [ref=e285]: Everyday price • wuse
                  - generic [ref=e287]: New
                - paragraph [ref=e288]: Tap to preview on map
            - generic [ref=e289]:
              - generic [ref=e290]:
                - link "Call" [ref=e291] [cursor=pointer]:
                  - /url: tel:080658477394
                - link "Directions" [ref=e292] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.06079%2C7.48228
              - link "View details →" [ref=e293] [cursor=pointer]:
                - /url: /vendors/joyful-foods?returnTo=%2F&location_source=precise
          - article [ref=e294]:
            - button "Preview Utako Transit Bites on map" [ref=e295] [cursor=pointer]:
              - generic [ref=e298]:
                - generic [ref=e299]:
                  - heading "Utako Transit Bites" [level=3] [ref=e300]
                  - generic [ref=e301]: Open
                - paragraph [ref=e302]:
                  - img [ref=e304]
                  - text: Meat pie and drink
                - generic [ref=e306]:
                  - paragraph [ref=e307]:
                    - img [ref=e309]
                    - generic [ref=e312]: 5.3 km
                  - paragraph [ref=e313]:
                    - img [ref=e315]
                    - generic [ref=e318]: "Active hours: 8:00 AM - 8:00 PM"
                  - paragraph [ref=e319]:
                    - img [ref=e321]
                    - generic [ref=e322]: Budget-friendly • Utako
                  - generic [ref=e324]: New
                - paragraph [ref=e325]: Tap to preview on map
            - generic [ref=e326]:
              - generic [ref=e327]:
                - link "Call" [ref=e328] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e329] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.069%2C7.4465
              - link "View details →" [ref=e330] [cursor=pointer]:
                - /url: /vendors/utako-transit-bites?returnTo=%2F&location_source=precise
          - article [ref=e331]:
            - button "Preview Wuse Office Rice Pot on map" [ref=e332] [cursor=pointer]:
              - generic [ref=e335]:
                - generic [ref=e336]:
                  - heading "Wuse Office Rice Pot" [level=3] [ref=e337]
                  - generic [ref=e338]: Open
                - paragraph [ref=e339]:
                  - img [ref=e341]
                  - text: Jollof rice and chicken
                - generic [ref=e343]:
                  - paragraph [ref=e344]:
                    - img [ref=e346]
                    - generic [ref=e349]: 8.2 km
                  - paragraph [ref=e350]:
                    - img [ref=e352]
                    - generic [ref=e355]: "Active hours: 10:30 AM - 4:00 PM"
                  - paragraph [ref=e356]:
                    - img [ref=e358]
                    - generic [ref=e359]: Everyday price • Wuse
                  - generic [ref=e361]: New
                - paragraph [ref=e362]: Tap to preview on map
            - generic [ref=e363]:
              - generic [ref=e364]:
                - link "Call" [ref=e365] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e366] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0796%2C7.4742
              - link "View details →" [ref=e367] [cursor=pointer]:
                - /url: /vendors/wuse-office-rice-pot?returnTo=%2F&location_source=precise
          - article [ref=e368]:
            - button "Preview Utako Late Night Noodles on map" [ref=e369] [cursor=pointer]:
              - generic [ref=e372]:
                - generic [ref=e373]:
                  - heading "Utako Late Night Noodles" [level=3] [ref=e374]
                  - generic [ref=e375]: Closed
                - paragraph [ref=e376]:
                  - img [ref=e378]
                  - text: Noodles and egg
                - generic [ref=e380]:
                  - paragraph [ref=e381]:
                    - img [ref=e383]
                    - generic [ref=e386]: 5.9 km
                  - paragraph [ref=e387]:
                    - img [ref=e389]
                    - generic [ref=e392]: "Active hours: 6:00 PM - 2:00 AM"
                  - paragraph [ref=e393]:
                    - img [ref=e395]
                    - generic [ref=e396]: Budget-friendly • Utako
                  - generic [ref=e398]: New
                - paragraph [ref=e399]: Tap to preview on map
            - generic [ref=e400]:
              - generic [ref=e401]:
                - link "Call" [ref=e402] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e403] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0661%2C7.4519
              - link "View details →" [ref=e404] [cursor=pointer]:
                - /url: /vendors/utako-late-night-noodles?returnTo=%2F&location_source=precise
          - article [ref=e405]:
            - button "Preview Jabi Rice Corner on map" [ref=e406] [cursor=pointer]:
              - generic [ref=e409]:
                - generic [ref=e410]:
                  - heading "Jabi Rice Corner" [level=3] [ref=e411]
                  - generic [ref=e412]: Closed
                - paragraph [ref=e413]:
                  - img [ref=e415]
                  - text: Fried rice and chicken
                - generic [ref=e417]:
                  - paragraph [ref=e418]:
                    - img [ref=e420]
                    - generic [ref=e423]: 3.6 km
                  - paragraph [ref=e424]:
                    - img [ref=e426]
                    - generic [ref=e429]: "Active hours: 5:00 PM - 10:00 PM"
                  - paragraph [ref=e430]:
                    - img [ref=e432]
                    - generic [ref=e433]: Everyday price • Jabi
                  - generic [ref=e435]: New
                - paragraph [ref=e436]: Tap to preview on map
            - generic [ref=e437]:
              - generic [ref=e438]:
                - link "Call" [ref=e439] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e440] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0643%2C7.4291
              - link "View details →" [ref=e441] [cursor=pointer]:
                - /url: /vendors/jabi-rice-corner?returnTo=%2F&location_source=precise
          - article [ref=e442]:
            - button "Preview Wuse Morning Akara Stand on map" [ref=e443] [cursor=pointer]:
              - generic [ref=e446]:
                - generic [ref=e447]:
                  - heading "Wuse Morning Akara Stand" [level=3] [ref=e448]
                  - generic [ref=e449]: Closed
                - paragraph [ref=e450]:
                  - img [ref=e452]
                  - text: Akara and pap
                - generic [ref=e454]:
                  - paragraph [ref=e455]:
                    - img [ref=e457]
                    - generic [ref=e460]: 7.6 km
                  - paragraph [ref=e461]:
                    - img [ref=e463]
                    - generic [ref=e466]: "Active hours: 6:30 AM - 11:30 AM"
                  - paragraph [ref=e467]:
                    - img [ref=e469]
                    - generic [ref=e470]: Budget-friendly • Wuse
                  - generic [ref=e472]: New
                - paragraph [ref=e473]: Tap to preview on map
            - generic [ref=e474]:
              - generic [ref=e475]:
                - link "Call" [ref=e476] [cursor=pointer]:
                  - /url: tel:+2340000000000
                - link "Directions" [ref=e477] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0813%2C7.4694
              - link "View details →" [ref=e478] [cursor=pointer]:
                - /url: /vendors/wuse-morning-akara-stand?returnTo=%2F&location_source=precise
      - generic [ref=e479]:
        - generic [ref=e480]:
          - generic [ref=e483]:
            - generic [ref=e484]:
              - generic [ref=e485]: Search
              - textbox "Search" [ref=e486]:
                - /placeholder: Vendor, dish, or area
            - button "Open filters" [ref=e487]:
              - img [ref=e488]
          - region "Nearby vendor map" [ref=e490]:
            - generic [ref=e491]:
              - generic [ref=e492]:
                - region "Map" [ref=e493]
                - img "Search location"
                - button "Select Ayobami" [pressed] [ref=e494] [cursor=pointer]:
                  - generic [ref=e496]: "1"
                - button "Select Jabi Office Lunch Bowl" [ref=e497] [cursor=pointer]:
                  - generic [ref=e499]: "2"
                - button "Select Utako Rice and Swallow" [ref=e500] [cursor=pointer]:
                  - generic [ref=e502]: "3"
                - button "Select Jabi Grill and Drinks" [ref=e503] [cursor=pointer]:
                  - generic [ref=e505]: "4"
                - button "Select Maitama Lunch Canteen" [ref=e506] [cursor=pointer]:
                  - generic [ref=e508]: "5"
                - button "Select Wuse Zobo and Snacks" [ref=e509] [cursor=pointer]:
                  - generic [ref=e511]: "6"
                - button "Select Joyful Foods" [ref=e512] [cursor=pointer]:
                  - generic [ref=e514]: "7"
                - button "Select Utako Transit Bites" [ref=e515] [cursor=pointer]:
                  - generic [ref=e517]: "8"
                - button "Select Wuse Office Rice Pot" [ref=e518] [cursor=pointer]:
                  - generic [ref=e520]: "9"
                - button "Select Utako Late Night Noodles" [ref=e521] [cursor=pointer]:
                  - generic [ref=e523]: "10"
                - button "Select Jabi Rice Corner" [ref=e524] [cursor=pointer]:
                  - generic [ref=e526]: "11"
                - button "Select Wuse Morning Akara Stand" [ref=e527] [cursor=pointer]:
                  - generic [ref=e529]: "12"
              - generic:
                - generic:
                  - generic [ref=e530]:
                    - button "Zoom in" [ref=e531] [cursor=pointer]
                    - button "Zoom out" [ref=e533] [cursor=pointer]
                  - button "Find my location" [ref=e536] [cursor=pointer]
                - group [ref=e538]:
                  - generic "Toggle attribution" [ref=e539] [cursor=pointer]
                  - generic [ref=e540]:
                    - link "MapLibre" [ref=e541] [cursor=pointer]:
                      - /url: https://maplibre.org/
                    - text: "|"
                    - link "© MapTiler" [ref=e542] [cursor=pointer]:
                      - /url: https://www.maptiler.com/copyright/
                    - link "© OpenStreetMap contributors" [ref=e543] [cursor=pointer]:
                      - /url: https://www.openstreetmap.org/copyright
            - generic:
              - generic: Loading map…
            - generic [ref=e544]:
              - generic [ref=e545]: Search location
              - generic [ref=e546]: 12 vendors
        - generic [ref=e547]:
          - paragraph [ref=e548]: Selected vendor
          - heading "Ayobami" [level=2] [ref=e549]
          - generic [ref=e550]:
            - paragraph [ref=e551]:
              - generic [ref=e552]:
                - img [ref=e554]
                - text: 9.4 km
              - generic [ref=e557]:
                - img [ref=e559]
                - text: Open
            - paragraph [ref=e562]:
              - img [ref=e564]
              - generic [ref=e567]: "Active hours:"
              - text: 7:00 AM - 6:00 AM
            - paragraph [ref=e568]:
              - img [ref=e570]
              - generic [ref=e572]: pepper soup rice
            - paragraph [ref=e573]:
              - img [ref=e575]
              - generic [ref=e576]: "Area:"
              - text: Wuse
          - generic [ref=e577]:
            - generic [ref=e578]:
              - link "Call" [ref=e579] [cursor=pointer]:
                - /url: tel:08065783762
              - link "Directions" [ref=e580] [cursor=pointer]:
                - /url: https://www.google.com/maps/dir/?api=1&destination=9.0813%2C7.4859
            - link "View details" [ref=e581] [cursor=pointer]:
              - /url: /vendors/pepper-soup-rice?returnTo=%2F&location_source=precise
  - alert [ref=e582]
```

# Test source

```ts
  984  |   });
  985  | 
  986  |   test("admin create vendor route loads behind auth", async ({ page }) => {
  987  |     const errors = trackClientErrors(page);
  988  | 
  989  |     await page.goto("/admin/vendors/new");
  990  |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  991  |     await expect(page.getByLabel("Password")).toBeVisible();
  992  | 
  993  |     await expectNoClientErrors(errors);
  994  |   });
  995  | 
  996  |   test("admin edit vendor route loads behind auth", async ({ page }) => {
  997  |     const errors = trackClientErrors(page);
  998  | 
  999  |     await page.goto("/admin/vendors/00000000-0000-4000-8000-000000000001");
  1000 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  1001 |     await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  1002 | 
  1003 |     await expectNoClientErrors(errors);
  1004 |   });
  1005 | 
  1006 |   test("mobile homepage keeps core content visible", async ({ page }) => {
  1007 |     const errors = trackClientErrors(page);
  1008 | 
  1009 |     await page.setViewportSize({ width: 390, height: 844 });
  1010 |     await primePublicLocation(page);
  1011 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1012 |     await page.goto("/");
  1013 | 
  1014 |     await expect(page.locator(".discovery-map")).toBeVisible();
  1015 |     await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
  1016 |     await expect(page.locator(".vendor-section-nav").getByRole("button", { name: "Last selected" })).toBeVisible();
  1017 |     await expect(page.locator(".retention-panel-secondary")).toBeHidden();
  1018 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1019 | 
  1020 |     const hasHorizontalOverflow = await page.evaluate(
  1021 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  1022 |     );
  1023 |     expect(hasHorizontalOverflow).toBe(false);
  1024 | 
  1025 |     await expectNoClientErrors(errors);
  1026 |   });
  1027 | 
  1028 |   test("mobile discovery keeps header, filters, map, selected preview, and list in the correct order", async ({ page }) => {
  1029 |     const errors = trackClientErrors(page);
  1030 | 
  1031 |     await page.setViewportSize({ width: 390, height: 844 });
  1032 |     await primePublicLocation(page);
  1033 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1034 |     await page.goto("/");
  1035 | 
  1036 |     const firstCard = page.locator(".vendor-card").first();
  1037 |     const firstVendorId = await firstCard.getAttribute("data-vendor-id");
  1038 |     expect(firstVendorId).toBeTruthy();
  1039 | 
  1040 |     await clickVendorOnMap(page, firstVendorId!);
  1041 | 
  1042 |     const headerTop = await topPosition(page.locator(".discovery-heading"));
  1043 |     const filtersTop = await topPosition(page.locator(".mobile-discovery-filters"));
  1044 |     const mapTop = await topPosition(page.locator(".discovery-map"));
  1045 |     const selectedTop = await topPosition(page.locator(".selected-vendor-panel"));
  1046 |     const firstCardTop = await topPosition(firstCard);
  1047 | 
  1048 |     expect(headerTop).toBeLessThan(filtersTop);
  1049 |     expect(filtersTop).toBeLessThan(mapTop);
  1050 |     expect(mapTop).toBeLessThan(selectedTop);
  1051 |     expect(selectedTop).toBeLessThan(firstCardTop);
  1052 | 
  1053 |     await expectNoClientErrors(errors);
  1054 |   });
  1055 | 
  1056 |   test("mobile map marker selection surfaces the selected vendor preview and card selection keeps map focus", async ({ page }) => {
  1057 |     const errors = trackClientErrors(page);
  1058 | 
  1059 |     await page.setViewportSize({ width: 390, height: 844 });
  1060 |     await primePublicLocation(page);
  1061 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1062 |     await page.goto("/");
  1063 | 
  1064 |     const firstCard = page.locator(".vendor-card").first();
  1065 |     const firstVendorName = await firstCard.locator("h3").textContent();
  1066 |     const firstVendorId = await firstCard.getAttribute("data-vendor-id");
  1067 |     const secondCard = page.locator(".vendor-card").nth(1);
  1068 |     const secondVendorId = await secondCard.getAttribute("data-vendor-id");
  1069 |     const secondVendorName = await secondCard.locator("h3").textContent();
  1070 |     expect(firstVendorId).toBeTruthy();
  1071 |     expect(secondVendorId).toBeTruthy();
  1072 |     await page.locator(".discovery-map").scrollIntoViewIfNeeded();
  1073 |     const scrollBeforeMarkerTap = await page.evaluate(() => window.scrollY);
  1074 |     const cameraStateBeforeMarkerTap = await readMapCameraState(page);
  1075 | 
  1076 |     await dispatchVendorMapClick(page, firstVendorId!);
  1077 |     const scrollAfterMarkerTap = await page.evaluate(() => window.scrollY);
  1078 |     expect(Math.abs(scrollAfterMarkerTap - scrollBeforeMarkerTap)).toBeLessThan(12);
  1079 | 
  1080 |     const selectedPanel = page.locator(".selected-vendor-panel");
  1081 |     await expect(selectedPanel).toBeInViewport();
  1082 |     await expect(selectedPanel.locator("h2")).toContainText(firstVendorName ?? "");
  1083 |     await expect(selectedPanel).toContainText("Active hours:");
> 1084 |     await expect(selectedPanel).toContainText("Slug:");
       |                                 ^ Error: expect(locator).toContainText(expected) failed
  1085 |     await expect(selectedPanel).toContainText(/Open|Closed|Hours unavailable/);
  1086 |     await expect(selectedPanel.getByRole("link", { name: "View details" })).toBeVisible();
  1087 |     await expect(selectedPanel.getByRole("link", { name: "Call" })).toBeVisible();
  1088 |     await expect(selectedPanel.getByRole("link", { name: "Directions" })).toBeVisible();
  1089 |     const cameraStateAfterMarkerTap = await readMapCameraState(page);
  1090 |     if (cameraStateBeforeMarkerTap && cameraStateAfterMarkerTap) {
  1091 |       expect(cameraStateAfterMarkerTap.count).toBe(cameraStateBeforeMarkerTap.count);
  1092 |     }
  1093 | 
  1094 |     await secondCard.getByRole("button", { name: /Preview .* on map/ }).click();
  1095 |     await expect(selectedPanel.locator("h2")).toContainText(secondVendorName ?? "");
  1096 |     await expectUniqueMapVendorMarkers(page);
  1097 |     await expect(page.locator(".retention-panel-secondary")).toBeHidden();
  1098 | 
  1099 |     const lastSelectedTab = page.locator(".vendor-section-nav").getByRole("button", {
  1100 |       name: "Last selected",
  1101 |     });
  1102 |     await lastSelectedTab.click();
  1103 |     const lastSelectedPanel = page.locator(".retention-panel-secondary");
  1104 |     await expect(lastSelectedPanel).toBeVisible();
  1105 |     await expect(lastSelectedPanel.getByText("Last selected vendor")).toBeVisible();
  1106 |     await expect(lastSelectedPanel).toContainText(secondVendorName ?? "");
  1107 |     await expect(lastSelectedPanel.getByRole("button", { name: "Preview again" })).toBeVisible();
  1108 | 
  1109 |     await page.locator(".vendor-section-nav").getByRole("button", { name: "Nearby" }).click();
  1110 |     await expect(lastSelectedPanel).toBeHidden();
  1111 |     await expect(page.locator(`.discovery-map [data-vendor-id="${secondVendorId}"].selected`)).toBeVisible();
  1112 | 
  1113 |     await openDiscoveryFilters(page);
  1114 |     await page.locator('select[name="radiusKm"]:visible').selectOption("30");
  1115 |     const applyButton = page.locator('button:has-text("Apply"):visible');
  1116 |     await expect(applyButton).toBeEnabled();
  1117 |     await applyButton.click();
  1118 |     await expect(page).toHaveURL(/radius_km=30/);
  1119 |     await expect(selectedPanel).toBeVisible();
  1120 |     await expectUniqueMapVendorMarkers(page);
  1121 |     if ((await page.locator('.discovery-map[data-map-mode="maplibre"]').count()) > 0) {
  1122 |       const overviewZoom = await page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getZoom() ?? null);
  1123 |       expect(overviewZoom).not.toBeNull();
  1124 |       expect(overviewZoom!).toBeLessThan(15);
  1125 |       const cameraStateAfterApply = await readMapCameraState(page);
  1126 |       expect(cameraStateAfterApply).not.toBeNull();
  1127 |       expect(cameraStateAfterApply?.lastAction?.source).toBe("filter");
  1128 |       const interactionState = await readMapInteractionState(page);
  1129 |       expect(interactionState).not.toBeNull();
  1130 |       expect(interactionState).toMatchObject({
  1131 |         dragPan: true,
  1132 |         dragRotate: false,
  1133 |         touchZoomRotate: true,
  1134 |       });
  1135 |     }
  1136 | 
  1137 |     await expectNoClientErrors(errors);
  1138 |   });
  1139 | 
  1140 |   test("small phone layout stays readable", async ({ page }) => {
  1141 |     const errors = trackClientErrors(page);
  1142 | 
  1143 |     await page.setViewportSize({ width: 320, height: 844 });
  1144 |     await primePublicLocation(page);
  1145 |     await page.goto("/");
  1146 | 
  1147 |     await expect(page.locator(".discovery-map")).toBeVisible();
  1148 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1149 |     await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
  1150 |     await page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }).click();
  1151 |     await expect(page.locator(".vendor-card").first()).toHaveClass(/selected/);
  1152 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1153 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-status-line")).toContainText("km");
  1154 | 
  1155 |     const hasHorizontalOverflow = await page.evaluate(
  1156 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  1157 |     );
  1158 |     expect(hasHorizontalOverflow).toBe(false);
  1159 | 
  1160 |     await expectNoClientErrors(errors);
  1161 |   });
  1162 | 
  1163 |   test("night theme keeps cards readable and selected state clear", async ({ page }) => {
  1164 |     const errors = trackClientErrors(page);
  1165 | 
  1166 |     await setMockClientTime(page, "2026-04-25T21:00:00");
  1167 |     await primePublicLocation(page);
  1168 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1169 |     await page.setViewportSize({ width: 390, height: 844 });
  1170 |     await page.goto("/");
  1171 | 
  1172 |     const shell = page.locator(".public-shell");
  1173 |     await expect(shell).toHaveAttribute("data-time-theme", "night");
  1174 | 
  1175 |     const firstCard = page.locator(".vendor-card").first();
  1176 |     await expect(firstCard).toBeVisible();
  1177 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1178 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  1179 |     await expect(firstCard).toHaveClass(/selected/);
  1180 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1181 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText("km");
  1182 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText(/Open|Closed/);
  1183 | 
  1184 |     const selectedStyles = await firstCard.evaluate((element) => {
```