# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> homepage loads, vendor cards render, and details are clickable
- Location: tests/e2e/app-smoke.spec.ts:1208:3

# Error details

```
Error: expect(received).not.toBeNull()

Received: null
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - region "Local Man" [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - paragraph [ref=e8]: Abuja pilot
          - heading "Local Man" [level=1] [ref=e9]:
            - generic [ref=e12]: Local Man
          - paragraph [ref=e13]: Find Local Food Vendors Near You.
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: Search
            - textbox "Search" [ref=e19]:
              - /placeholder: Vendor, dish, or area
          - button "Open filters" [ref=e20]:
            - img [ref=e21]
        - status [ref=e22]:
          - generic [ref=e23]:
            - img [ref=e25]
            - paragraph [ref=e28]: Turn on your location to find accurate vendors near you.
          - button "Close location reminder" [ref=e29]:
            - generic [ref=e30]: ×
        - generic [ref=e31]:
          - generic [ref=e32]:
            - strong [ref=e33]: Using your current location
            - generic [ref=e34]: Wuse II, Abuja
            - generic [ref=e35]: High accuracy
          - button "Retry location" [ref=e36] [cursor=pointer]
        - region "Vendor sections" [ref=e37]:
          - button "Nearby" [pressed] [ref=e38]
          - button "Recent" [ref=e39]
          - button "Popular" [ref=e40]
          - button "Last selected" [ref=e41]
        - generic [ref=e42]:
          - generic [ref=e43]:
            - strong [ref=e44]: Nearby vendors
            - generic [ref=e45]: Open now, then nearest vendors
          - article [ref=e46]:
            - button "Preview Jabi Office Lunch Bowl on map" [active] [pressed] [ref=e47] [cursor=pointer]:
              - generic [ref=e48]:
                - generic [ref=e49]: Popular nearby
                - generic [ref=e51]:
                  - generic [ref=e52]:
                    - heading "Jabi Office Lunch Bowl" [level=3] [ref=e53]
                    - generic [ref=e54]: Open
                  - paragraph [ref=e55]:
                    - img [ref=e57]
                    - text: White rice and stew
                  - generic [ref=e59]:
                    - paragraph [ref=e60]:
                      - img [ref=e62]
                      - generic [ref=e65]: 3.2 km
                    - paragraph [ref=e66]:
                      - img [ref=e68]
                      - generic [ref=e71]: "Active hours: 11:00 AM - 3:00 PM"
                    - paragraph [ref=e72]:
                      - img [ref=e74]
                      - generic [ref=e75]: Everyday price • Jabi
                    - generic [ref=e76]:
                      - img [ref=e78]
                      - generic [ref=e80]: ★ 2.8
                  - paragraph [ref=e81]: Tap to preview on map
            - generic [ref=e82]:
              - generic [ref=e83]:
                - link "Call" [ref=e84] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e85]
                  - text: Call
                - link "Directions" [ref=e87] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0606%2C7.4219
                  - img [ref=e88]
                  - text: Directions
              - link "View details →" [ref=e92] [cursor=pointer]:
                - /url: /vendors/jabi-office-lunch-bowl?returnTo=%2F&location_source=precise
          - article [ref=e93]:
            - button "Preview Utako Rice and Swallow on map" [ref=e94] [cursor=pointer]:
              - generic [ref=e95]:
                - generic [ref=e96]: Popular nearby
                - generic [ref=e98]:
                  - generic [ref=e99]:
                    - heading "Utako Rice and Swallow" [level=3] [ref=e100]
                    - generic [ref=e101]: Open
                  - paragraph [ref=e102]:
                    - img [ref=e104]
                    - text: Eba with egusi
                  - generic [ref=e106]:
                    - paragraph [ref=e107]:
                      - img [ref=e109]
                      - generic [ref=e112]: 4.6 km
                    - paragraph [ref=e113]:
                      - img [ref=e115]
                      - generic [ref=e118]: "Active hours: 11:00 AM - 3:00 PM"
                    - paragraph [ref=e119]:
                      - img [ref=e121]
                      - generic [ref=e122]: Everyday price • Utako
                    - generic [ref=e123]:
                      - img [ref=e125]
                      - generic [ref=e127]: ★ 5.0
                  - paragraph [ref=e128]: Tap to preview on map
            - generic [ref=e129]:
              - generic [ref=e130]:
                - link "Call" [ref=e131] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e132]
                  - text: Call
                - link "Directions" [ref=e134] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0723%2C7.4408
                  - img [ref=e135]
                  - text: Directions
              - link "View details →" [ref=e139] [cursor=pointer]:
                - /url: /vendors/utako-rice-and-swallow?returnTo=%2F&location_source=precise
          - article [ref=e140]:
            - button "Preview Jabi Grill and Drinks on map" [ref=e141] [cursor=pointer]:
              - generic [ref=e144]:
                - generic [ref=e145]:
                  - heading "Jabi Grill and Drinks" [level=3] [ref=e146]
                  - generic [ref=e147]: Open
                - paragraph [ref=e148]:
                  - img [ref=e150]
                  - text: Grilled chicken
                - generic [ref=e152]:
                  - paragraph [ref=e153]:
                    - img [ref=e155]
                    - generic [ref=e158]: 4.1 km
                  - paragraph [ref=e159]:
                    - img [ref=e161]
                    - generic [ref=e164]: "Active hours: 10:00 AM - 7:00 PM"
                  - paragraph [ref=e165]:
                    - img [ref=e167]
                    - generic [ref=e168]: Everyday price • Jabi
                  - generic [ref=e169]:
                    - img [ref=e171]
                    - generic [ref=e173]: ★ 2.5
                - paragraph [ref=e174]: Tap to preview on map
            - generic [ref=e175]:
              - generic [ref=e176]:
                - link "Call" [ref=e177] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e178]
                  - text: Call
                - link "Directions" [ref=e180] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0685%2C7.4352
                  - img [ref=e181]
                  - text: Directions
              - link "View details →" [ref=e185] [cursor=pointer]:
                - /url: /vendors/jabi-grill-and-drinks?returnTo=%2F&location_source=precise
          - article [ref=e186]:
            - button "Preview Utako Transit Bites on map" [ref=e187] [cursor=pointer]:
              - generic [ref=e190]:
                - generic [ref=e191]:
                  - heading "Utako Transit Bites" [level=3] [ref=e192]
                  - generic [ref=e193]: Open
                - paragraph [ref=e194]:
                  - img [ref=e196]
                  - text: Meat pie and drink
                - generic [ref=e198]:
                  - paragraph [ref=e199]:
                    - img [ref=e201]
                    - generic [ref=e204]: 5.3 km
                  - paragraph [ref=e205]:
                    - img [ref=e207]
                    - generic [ref=e210]: "Active hours: 8:00 AM - 8:00 PM"
                  - paragraph [ref=e211]:
                    - img [ref=e213]
                    - generic [ref=e214]: Budget-friendly • Utako
                  - generic [ref=e215]:
                    - img [ref=e217]
                    - generic [ref=e219]: ★ 1.0
                - paragraph [ref=e220]: Tap to preview on map
            - generic [ref=e221]:
              - generic [ref=e222]:
                - link "Call" [ref=e223] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e224]
                  - text: Call
                - link "Directions" [ref=e226] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.069%2C7.4465
                  - img [ref=e227]
                  - text: Directions
              - link "View details →" [ref=e231] [cursor=pointer]:
                - /url: /vendors/utako-transit-bites?returnTo=%2F&location_source=precise
          - article [ref=e232]:
            - button "Preview Wuse Zobo and Snacks on map" [ref=e233] [cursor=pointer]:
              - generic [ref=e236]:
                - generic [ref=e237]:
                  - heading "Wuse Zobo and Snacks" [level=3] [ref=e238]
                  - generic [ref=e239]: Open
                - paragraph [ref=e240]:
                  - img [ref=e242]
                  - text: Zobo and puff-puff
                - generic [ref=e244]:
                  - paragraph [ref=e245]:
                    - img [ref=e247]
                    - generic [ref=e250]: 6.8 km
                  - paragraph [ref=e251]:
                    - img [ref=e253]
                    - generic [ref=e256]: "Active hours: 10:00 AM - 7:00 PM"
                  - paragraph [ref=e257]:
                    - img [ref=e259]
                    - generic [ref=e260]: Budget-friendly • Wuse
                  - generic [ref=e261]:
                    - img [ref=e263]
                    - generic [ref=e265]: ★ 5.0
                - paragraph [ref=e266]: Tap to preview on map
            - generic [ref=e267]:
              - generic [ref=e268]:
                - link "Call" [ref=e269] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e270]
                  - text: Call
                - link "Directions" [ref=e272] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0748%2C7.4615
                  - img [ref=e273]
                  - text: Directions
              - link "View details →" [ref=e277] [cursor=pointer]:
                - /url: /vendors/wuse-zobo-and-snacks?returnTo=%2F&location_source=precise
          - article [ref=e278]:
            - button "Preview Wuse Office Rice Pot on map" [ref=e279] [cursor=pointer]:
              - generic [ref=e282]:
                - generic [ref=e283]:
                  - heading "Wuse Office Rice Pot" [level=3] [ref=e284]
                  - generic [ref=e285]: Open
                - paragraph [ref=e286]:
                  - img [ref=e288]
                  - text: Jollof rice and chicken
                - generic [ref=e290]:
                  - paragraph [ref=e291]:
                    - img [ref=e293]
                    - generic [ref=e296]: 8.2 km
                  - paragraph [ref=e297]:
                    - img [ref=e299]
                    - generic [ref=e302]: "Active hours: 11:00 AM - 3:00 PM"
                  - paragraph [ref=e303]:
                    - img [ref=e305]
                    - generic [ref=e306]: Everyday price • Wuse
                  - generic [ref=e307]:
                    - img [ref=e309]
                    - generic [ref=e311]: ★ 5.0
                - paragraph [ref=e312]: Tap to preview on map
            - generic [ref=e313]:
              - generic [ref=e314]:
                - link "Call" [ref=e315] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e316]
                  - text: Call
                - link "Directions" [ref=e318] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0796%2C7.4742
                  - img [ref=e319]
                  - text: Directions
              - link "View details →" [ref=e323] [cursor=pointer]:
                - /url: /vendors/wuse-office-rice-pot?returnTo=%2F&location_source=precise
          - article [ref=e324]:
            - button "Preview Ayobami jesus on map" [ref=e325] [cursor=pointer]:
              - generic [ref=e326]:
                - generic [ref=e327]: Popular nearby
                - generic [ref=e329]:
                  - generic [ref=e330]:
                    - heading "Ayobami jesus" [level=3] [ref=e331]
                    - generic [ref=e332]: Open
                  - paragraph [ref=e333]:
                    - img [ref=e335]
                    - text: pepper soup rice
                  - generic [ref=e337]:
                    - paragraph [ref=e338]:
                      - img [ref=e340]
                      - generic [ref=e343]: 9.4 km
                    - paragraph [ref=e344]:
                      - img [ref=e346]
                      - generic [ref=e349]: "Active hours: 7:00 AM - 6:00 AM"
                    - paragraph [ref=e350]:
                      - img [ref=e352]
                      - generic [ref=e353]: Higher price • Wuse
                    - generic [ref=e354]:
                      - img [ref=e356]
                      - generic [ref=e358]: ★ 4.2
                  - paragraph [ref=e359]: Tap to preview on map
            - generic [ref=e360]:
              - generic [ref=e361]:
                - link "Call" [ref=e362] [cursor=pointer]:
                  - /url: tel:+2348065783762
                  - img [ref=e363]
                  - text: Call
                - link "Directions" [ref=e365] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0813%2C7.4859
                  - img [ref=e366]
                  - text: Directions
              - link "View details →" [ref=e370] [cursor=pointer]:
                - /url: /vendors/pepper-soup-rice?returnTo=%2F&location_source=precise
          - article [ref=e371]:
            - button "Preview Joyful Foods on map" [ref=e372] [cursor=pointer]:
              - generic [ref=e375]:
                - generic [ref=e376]:
                  - heading "Joyful Foods" [level=3] [ref=e377]
                  - generic [ref=e378]: Open
                - paragraph [ref=e379]:
                  - img [ref=e381]
                  - text: Yam and Egg
                - generic [ref=e383]:
                  - paragraph [ref=e384]:
                    - img [ref=e386]
                    - generic [ref=e389]: 9.3 km
                  - paragraph [ref=e390]:
                    - img [ref=e392]
                    - generic [ref=e395]: "Active hours: 10:00 AM - 6:30 PM"
                  - paragraph [ref=e396]:
                    - img [ref=e398]
                    - generic [ref=e399]: Everyday price • wuse
                  - generic [ref=e400]:
                    - img [ref=e402]
                    - generic [ref=e404]: ★ 5.0
                - paragraph [ref=e405]: Tap to preview on map
            - generic [ref=e406]:
              - generic [ref=e407]:
                - link "Call" [ref=e408] [cursor=pointer]:
                  - /url: tel:080658477394
                  - img [ref=e409]
                  - text: Call
                - link "Directions" [ref=e411] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.06079%2C7.48228
                  - img [ref=e412]
                  - text: Directions
              - link "View details →" [ref=e416] [cursor=pointer]:
                - /url: /vendors/joyful-foods?returnTo=%2F&location_source=precise
          - article [ref=e417]:
            - button "Preview Maitama Lunch Canteen on map" [ref=e418] [cursor=pointer]:
              - generic [ref=e421]:
                - generic [ref=e422]:
                  - heading "Maitama Lunch Canteen" [level=3] [ref=e423]
                  - generic [ref=e424]: Open
                - paragraph [ref=e425]:
                  - img [ref=e427]
                  - text: Native rice
                - generic [ref=e429]:
                  - paragraph [ref=e430]:
                    - img [ref=e432]
                    - generic [ref=e435]: 9.6 km
                  - paragraph [ref=e436]:
                    - img [ref=e438]
                    - generic [ref=e441]: "Active hours: 11:00 AM - 3:00 PM"
                  - paragraph [ref=e442]:
                    - img [ref=e444]
                    - generic [ref=e445]: Everyday price • Maitama
                  - generic [ref=e447]: New
                - paragraph [ref=e448]: Tap to preview on map
            - generic [ref=e449]:
              - generic [ref=e450]:
                - link "Call" [ref=e451] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e452]
                  - text: Call
                - link "Directions" [ref=e454] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0895%2C7.4872
                  - img [ref=e455]
                  - text: Directions
              - link "View details →" [ref=e459] [cursor=pointer]:
                - /url: /vendors/maitama-lunch-canteen?returnTo=%2F&location_source=precise
          - article [ref=e460]:
            - button "Preview Jabi Rice Corner on map" [ref=e461] [cursor=pointer]:
              - generic [ref=e464]:
                - generic [ref=e465]:
                  - heading "Jabi Rice Corner" [level=3] [ref=e466]
                  - generic [ref=e467]: Closed
                - paragraph [ref=e468]:
                  - img [ref=e470]
                  - text: Fried rice and chicken
                - generic [ref=e472]:
                  - paragraph [ref=e473]:
                    - img [ref=e475]
                    - generic [ref=e478]: 3.6 km
                  - paragraph [ref=e479]:
                    - img [ref=e481]
                    - generic [ref=e484]: "Active hours: 5:00 PM - 10:00 PM"
                  - paragraph [ref=e485]:
                    - img [ref=e487]
                    - generic [ref=e488]: Everyday price • Jabi
                  - generic [ref=e490]: New
                - paragraph [ref=e491]: Tap to preview on map
            - generic [ref=e492]:
              - generic [ref=e493]:
                - link "Call" [ref=e494] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e495]
                  - text: Call
                - link "Directions" [ref=e497] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0643%2C7.4291
                  - img [ref=e498]
                  - text: Directions
              - link "View details →" [ref=e502] [cursor=pointer]:
                - /url: /vendors/jabi-rice-corner?returnTo=%2F&location_source=precise
          - article [ref=e503]:
            - button "Preview Utako Late Night Noodles on map" [ref=e504] [cursor=pointer]:
              - generic [ref=e507]:
                - generic [ref=e508]:
                  - heading "Utako Late Night Noodles" [level=3] [ref=e509]
                  - generic [ref=e510]: Closed
                - paragraph [ref=e511]:
                  - img [ref=e513]
                  - text: Noodles and egg
                - generic [ref=e515]:
                  - paragraph [ref=e516]:
                    - img [ref=e518]
                    - generic [ref=e521]: 5.9 km
                  - paragraph [ref=e522]:
                    - img [ref=e524]
                    - generic [ref=e527]: "Active hours: 6:00 PM - 2:00 AM"
                  - paragraph [ref=e528]:
                    - img [ref=e530]
                    - generic [ref=e531]: Budget-friendly • Utako
                  - generic [ref=e532]:
                    - img [ref=e534]
                    - generic [ref=e536]: ★ 2.0
                - paragraph [ref=e537]: Tap to preview on map
            - generic [ref=e538]:
              - generic [ref=e539]:
                - link "Call" [ref=e540] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e541]
                  - text: Call
                - link "Directions" [ref=e543] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0661%2C7.4519
                  - img [ref=e544]
                  - text: Directions
              - link "View details →" [ref=e548] [cursor=pointer]:
                - /url: /vendors/utako-late-night-noodles?returnTo=%2F&location_source=precise
          - article [ref=e549]:
            - button "Preview Wuse Morning Akara Stand on map" [ref=e550] [cursor=pointer]:
              - generic [ref=e553]:
                - generic [ref=e554]:
                  - heading "Wuse Morning Akara Stand" [level=3] [ref=e555]
                  - generic [ref=e556]: Closed
                - paragraph [ref=e557]:
                  - img [ref=e559]
                  - text: Akara and pap
                - generic [ref=e561]:
                  - paragraph [ref=e562]:
                    - img [ref=e564]
                    - generic [ref=e567]: 7.6 km
                  - paragraph [ref=e568]:
                    - img [ref=e570]
                    - generic [ref=e573]: "Active hours: 7:00 AM - 12:00 PM"
                  - paragraph [ref=e574]:
                    - img [ref=e576]
                    - generic [ref=e577]: Budget-friendly • Wuse
                  - generic [ref=e578]:
                    - img [ref=e580]
                    - generic [ref=e582]: ★ 3.0
                - paragraph [ref=e583]: Tap to preview on map
            - generic [ref=e584]:
              - generic [ref=e585]:
                - link "Call" [ref=e586] [cursor=pointer]:
                  - /url: tel:+2340000000000
                  - img [ref=e587]
                  - text: Call
                - link "Directions" [ref=e589] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.0813%2C7.4694
                  - img [ref=e590]
                  - text: Directions
              - link "View details →" [ref=e594] [cursor=pointer]:
                - /url: /vendors/wuse-morning-akara-stand?returnTo=%2F&location_source=precise
      - generic [ref=e595]:
        - region "Nearby vendor map" [ref=e598]:
          - generic [ref=e599]:
            - generic [ref=e600]:
              - region "Map" [ref=e601]
              - img "Search location"
              - button "Select Jabi Office Lunch Bowl" [pressed] [ref=e602] [cursor=pointer]:
                - generic [ref=e603]:
                  - img
              - button "Select Utako Rice and Swallow" [ref=e604] [cursor=pointer]:
                - generic [ref=e605]:
                  - img
              - button "Select Jabi Grill and Drinks" [ref=e606] [cursor=pointer]:
                - generic [ref=e607]:
                  - img
              - button "Select Utako Transit Bites" [ref=e608] [cursor=pointer]:
                - generic [ref=e609]:
                  - img
              - button "Select Wuse Zobo and Snacks" [ref=e610] [cursor=pointer]:
                - generic [ref=e611]:
                  - img
              - button "Select Wuse Office Rice Pot" [ref=e612] [cursor=pointer]:
                - generic [ref=e613]:
                  - img
              - button "Select Ayobami jesus" [ref=e614] [cursor=pointer]:
                - generic [ref=e615]:
                  - img
              - button "Select Joyful Foods" [ref=e616] [cursor=pointer]:
                - generic [ref=e617]:
                  - img
              - button "Select Maitama Lunch Canteen" [ref=e618] [cursor=pointer]:
                - generic [ref=e619]:
                  - img
              - button "Select Jabi Rice Corner" [ref=e620] [cursor=pointer]:
                - generic [ref=e621]:
                  - img
              - button "Select Utako Late Night Noodles" [ref=e622] [cursor=pointer]:
                - generic [ref=e623]:
                  - img
              - button "Select Wuse Morning Akara Stand" [ref=e624] [cursor=pointer]:
                - generic [ref=e625]:
                  - img
            - generic:
              - generic:
                - generic [ref=e626]:
                  - button "Zoom in" [ref=e627] [cursor=pointer]
                  - button "Zoom out" [ref=e629] [cursor=pointer]
                - button "Find my location" [ref=e632] [cursor=pointer]
              - group [ref=e634]:
                - generic "Toggle attribution" [ref=e635] [cursor=pointer]
                - generic [ref=e636]:
                  - link "MapLibre" [ref=e637] [cursor=pointer]:
                    - /url: https://maplibre.org/
                  - text: "|"
                  - link "© MapTiler" [ref=e638] [cursor=pointer]:
                    - /url: https://www.maptiler.com/copyright/
                  - link "© OpenStreetMap contributors" [ref=e639] [cursor=pointer]:
                    - /url: https://www.openstreetmap.org/copyright
          - generic:
            - generic: Loading map…
          - generic [ref=e640]:
            - generic [ref=e641]: Search location
            - generic [ref=e642]: 12 vendors
        - generic [ref=e643]:
          - paragraph [ref=e644]: Selected vendor
          - heading "Jabi Office Lunch Bowl" [level=2] [ref=e645]
          - generic [ref=e646]:
            - paragraph [ref=e647]:
              - generic [ref=e648]:
                - img [ref=e650]
                - text: 3.2 km
              - generic [ref=e653]:
                - img [ref=e655]
                - text: Open
            - paragraph [ref=e658]:
              - img [ref=e660]
              - generic [ref=e663]: "Active hours:"
              - text: 11:00 AM - 3:00 PM
            - paragraph [ref=e664]:
              - img [ref=e666]
              - generic [ref=e668]: White rice and stew
            - paragraph [ref=e669]:
              - img [ref=e671]
              - generic [ref=e672]: "Area:"
              - text: Jabi
          - generic [ref=e673]:
            - generic [ref=e674]:
              - link "Call" [ref=e675] [cursor=pointer]:
                - /url: tel:+2340000000000
                - img [ref=e676]
                - text: Call
              - link "Directions" [ref=e678] [cursor=pointer]:
                - /url: https://www.google.com/maps/dir/?api=1&destination=9.0606%2C7.4219
                - img [ref=e679]
                - text: Directions
            - link "View details" [ref=e683] [cursor=pointer]:
              - /url: /vendors/jabi-office-lunch-bowl?returnTo=%2F&location_source=precise
  - alert [ref=e684]
```

# Test source

```ts
  1237 |     await expect(firstCard.locator(".vendor-card-rating")).toBeVisible();
  1238 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1239 |     await expect(firstCard.getByText("Tap to preview on map")).toBeVisible();
  1240 |     await expect(firstCard.getByRole("link", { name: "Call" })).toBeVisible();
  1241 |     await expect(firstCard.getByRole("link", { name: "Directions" })).toBeVisible();
  1242 |     await expect(firstCard.getByRole("link", { name: "View details →" })).toBeVisible();
  1243 | 
  1244 |     const vendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
  1245 |     const vendorId = await firstCard.getAttribute("data-vendor-id");
  1246 |     expect(vendorId).toBeTruthy();
  1247 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  1248 |     await expect(firstCard).toHaveClass(/selected/);
  1249 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1250 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText("km");
  1251 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText(/Open|Closed/);
  1252 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
  1253 |     await expect(page.locator(".selected-vendor-panel").getByText(/^Active hours:/)).toBeVisible();
  1254 |     await expect(page.locator(".selected-vendor-panel").getByRole("link", { name: "Call" })).toBeVisible();
  1255 |     await expect(
  1256 |       page.locator(".selected-vendor-panel").getByRole("link", { name: "Directions" }),
  1257 |     ).toBeVisible();
  1258 |     await expect(
  1259 |       page.locator(".selected-vendor-panel").getByRole("link", { name: "View details" }),
  1260 |     ).toBeVisible();
  1261 | 
  1262 |     const selectedCardStyles = await firstCard.evaluate((element) => {
  1263 |       const styles = getComputedStyle(element);
  1264 |       const title = element.querySelector("h3");
  1265 |       const titleStyles = title ? getComputedStyle(title) : null;
  1266 | 
  1267 |       return {
  1268 |         backgroundColor: styles.backgroundColor,
  1269 |         borderColor: styles.borderColor,
  1270 |         boxShadow: styles.boxShadow,
  1271 |         titleColor: titleStyles?.color ?? null,
  1272 |       };
  1273 |     });
  1274 | 
  1275 |     const [bgRed, bgGreen, bgBlue] = parseRgbChannels(selectedCardStyles.backgroundColor);
  1276 |     const [titleRed, titleGreen, titleBlue] = parseRgbChannels(selectedCardStyles.titleColor ?? "");
  1277 |     const backgroundAverage = (bgRed + bgGreen + bgBlue) / 3;
  1278 |     const titleAverage = (titleRed + titleGreen + titleBlue) / 3;
  1279 | 
  1280 |     expect(backgroundAverage).toBeGreaterThan(225);
  1281 |     expect(titleAverage).toBeLessThan(120);
  1282 |     expect(selectedCardStyles.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  1283 |     expect(selectedCardStyles.boxShadow).not.toBe("none");
  1284 | 
  1285 |     await expectUniqueMapVendorMarkers(page);
  1286 | 
  1287 |     await clickVendorOnMap(page, vendorId!);
  1288 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
  1289 |     await expect(page.locator(`.discovery-map [data-vendor-id="${vendorId}"].selected`)).toBeVisible();
  1290 | 
  1291 |     const mapLibreSurface = page.locator('.discovery-map[data-map-mode="maplibre"]');
  1292 |     if (await mapLibreSurface.count()) {
  1293 |       await expect(mapLibreSurface.locator(".maplibregl-ctrl-zoom-in")).toBeVisible();
  1294 |       await expect(mapLibreSurface.locator(".maplibregl-ctrl-zoom-out")).toBeVisible();
  1295 |       await expect(mapLibreSurface.locator(".maplibregl-ctrl-geolocate")).toBeVisible();
  1296 |       await expect(mapLibreSurface.locator(".maplibre-vendor-marker")).toHaveCount(
  1297 |         await page.locator(".vendor-card").count(),
  1298 |       );
  1299 |       await expect(mapLibreSurface.locator(".maplibre-vendor-marker__icon")).toHaveCount(
  1300 |         await page.locator(".vendor-card").count(),
  1301 |       );
  1302 |       await expect(mapLibreSurface.locator(".vendor-marker")).toHaveCount(0);
  1303 |       const selectedMarkerVisual = await mapLibreSurface
  1304 |         .locator(`.maplibre-vendor-marker[data-vendor-id="${vendorId}"]`)
  1305 |         .evaluate((element) => {
  1306 |           const pin = element.querySelector(".maplibre-vendor-marker__pin");
  1307 |           const styles = pin instanceof HTMLElement ? getComputedStyle(pin) : null;
  1308 | 
  1309 |           return {
  1310 |             backgroundColor: styles?.backgroundColor ?? "",
  1311 |             text: element.textContent?.trim() ?? "",
  1312 |           };
  1313 |         });
  1314 |       expect(selectedMarkerVisual.text).toBe("");
  1315 |       expect(selectedMarkerVisual.backgroundColor).toBe("rgb(36, 97, 79)");
  1316 | 
  1317 |       const unselectedMarkerCount = await mapLibreSurface
  1318 |         .locator(".maplibre-vendor-marker:not(.selected)")
  1319 |         .count();
  1320 |       if (unselectedMarkerCount > 0) {
  1321 |         const defaultMarkerVisual = await mapLibreSurface
  1322 |           .locator(".maplibre-vendor-marker:not(.selected)")
  1323 |           .first()
  1324 |           .evaluate((element) => {
  1325 |             const pin = element.querySelector(".maplibre-vendor-marker__pin");
  1326 |             const styles = pin instanceof HTMLElement ? getComputedStyle(pin) : null;
  1327 | 
  1328 |             return {
  1329 |               backgroundColor: styles?.backgroundColor ?? "",
  1330 |               text: element.textContent?.trim() ?? "",
  1331 |             };
  1332 |           });
  1333 |         expect(defaultMarkerVisual.text).toBe("");
  1334 |         expect(defaultMarkerVisual.backgroundColor).toBe("rgb(178, 58, 48)");
  1335 |       }
  1336 |       const interactionState = await readMapInteractionState(page);
> 1337 |       expect(interactionState).not.toBeNull();
       |                                    ^ Error: expect(received).not.toBeNull()
  1338 |       expect(interactionState).toMatchObject({
  1339 |         boxZoom: true,
  1340 |         doubleClickZoom: true,
  1341 |         dragPan: true,
  1342 |         dragRotate: false,
  1343 |         keyboard: true,
  1344 |         scrollZoom: true,
  1345 |         touchZoomRotate: true,
  1346 |       });
  1347 |     }
  1348 | 
  1349 |     await firstCard.getByRole("link", { name: "View details →" }).click();
  1350 | 
  1351 |     await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);
  1352 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  1353 |     await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
  1354 | 
  1355 |     await expectNoClientErrors(errors);
  1356 |   });
  1357 | 
  1358 |   test("call and directions actions emit tracking events with vendor context across card, selected preview, and detail views", async ({ page }) => {
  1359 |     const errors = trackClientErrors(page);
  1360 |     const trackedBodies: Array<Record<string, unknown>> = [];
  1361 | 
  1362 |     await page.addInitScript(() => {
  1363 |       (window as typeof window & {
  1364 |         __LOCALMAN_SUPPRESS_ACTION_NAVIGATION__?: boolean;
  1365 |       }).__LOCALMAN_SUPPRESS_ACTION_NAVIGATION__ = true;
  1366 |     });
  1367 | 
  1368 |     await page.route("**/api/events", async (route) => {
  1369 |       const rawBody = route.request().postData() ?? "";
  1370 |       trackedBodies.push(JSON.parse(rawBody) as Record<string, unknown>);
  1371 |       await route.fulfill({
  1372 |         status: 201,
  1373 |         contentType: "application/json",
  1374 |         body: JSON.stringify({
  1375 |           success: true,
  1376 |           data: {
  1377 |             accepted: true,
  1378 |           },
  1379 |           error: null,
  1380 |         }),
  1381 |       });
  1382 |     });
  1383 | 
  1384 |     await primePublicLocation(page);
  1385 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1386 |     await page.goto("/");
  1387 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  1388 | 
  1389 |     const firstCard = page.locator(".vendor-card").first();
  1390 |     const vendorId = await firstCard.getAttribute("data-vendor-id");
  1391 |     const detailHref = await firstCard.getByRole("link", { name: "View details →" }).getAttribute("href");
  1392 |     expect(vendorId).toBeTruthy();
  1393 |     expect(detailHref).toBeTruthy();
  1394 |     const vendorSlug = detailHref?.split("/vendors/")[1]?.split("?")[0];
  1395 |     expect(vendorSlug).toBeTruthy();
  1396 | 
  1397 |     await firstCard.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
  1398 |     await firstCard.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });
  1399 | 
  1400 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  1401 |     const selectedPanel = page.locator(".selected-vendor-panel");
  1402 |     await expect(selectedPanel).toBeVisible();
  1403 |     await selectedPanel.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
  1404 |     await selectedPanel.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });
  1405 | 
  1406 |     await page.goto(detailHref!);
  1407 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  1408 |     await page.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
  1409 |     await page.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });
  1410 | 
  1411 |     await expect.poll(
  1412 |       () => trackedBodies.filter((body) =>
  1413 |         body.event_type === "call_clicked" || body.event_type === "directions_clicked"
  1414 |       ).length,
  1415 |     ).toBeGreaterThanOrEqual(6);
  1416 | 
  1417 |     const actionEvents = trackedBodies.filter((body) =>
  1418 |       body.event_type === "call_clicked" || body.event_type === "directions_clicked"
  1419 |     );
  1420 | 
  1421 |     expect(actionEvents.length).toBeGreaterThanOrEqual(6);
  1422 |     expect(actionEvents.some((body) => body.event_type === "call_clicked")).toBe(true);
  1423 |     expect(actionEvents.some((body) => body.event_type === "directions_clicked")).toBe(true);
  1424 |     expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "card")).toBe(true);
  1425 |     expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "selected_preview")).toBe(true);
  1426 |     expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "detail")).toBe(true);
  1427 | 
  1428 |     for (const body of actionEvents) {
  1429 |       expect(body.vendor_id).toBe(vendorId);
  1430 |       expect(body.vendor_slug).toBe(vendorSlug);
  1431 |       expect(body.device_type === "mobile" || body.device_type === "tablet" || body.device_type === "desktop").toBe(true);
  1432 |       expect(body.location_source).toBe("precise");
  1433 |       expect(typeof body.timestamp).toBe("string");
  1434 |       expect(typeof body.page_path).toBe("string");
  1435 |     }
  1436 | 
  1437 |     await expectNoClientErrors(errors);
```