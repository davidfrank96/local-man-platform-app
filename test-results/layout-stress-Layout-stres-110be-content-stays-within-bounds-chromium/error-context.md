# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layout-stress.spec.ts >> Layout stress >> 320px long content stays within bounds
- Location: tests/e2e/layout-stress.spec.ts:147:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
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
        - status [ref=e11]:
          - generic [ref=e12]:
            - img [ref=e14]
            - paragraph [ref=e17]: Turn on your location to find accurate vendors near you.
          - button "Close location reminder" [ref=e18]:
            - generic [ref=e19]: ×
        - generic [ref=e20]:
          - generic [ref=e21]:
            - strong [ref=e22]: Using your current location
            - generic [ref=e23]: Karum, Municipal Area Council
            - generic [ref=e24]: High accuracy
          - button "Retry location" [ref=e25] [cursor=pointer]
        - region "Vendor sections" [ref=e26]:
          - button "Nearby" [pressed] [ref=e27]
          - button "Recent" [ref=e28]
          - button "Popular" [ref=e29]
          - button "Last selected" [ref=e30]
        - generic [ref=e31]:
          - generic [ref=e32]:
            - strong [ref=e33]: Nearby vendors
            - generic [ref=e34]: Open now, then popular, then distance
          - article [ref=e35]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [pressed] [ref=e36] [cursor=pointer]:
              - generic [ref=e39]:
                - generic [ref=e40]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e41]
                  - generic [ref=e42]: Open
                - paragraph [ref=e43]:
                  - img [ref=e45]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e47]:
                  - paragraph [ref=e48]:
                    - img [ref=e50]
                    - generic [ref=e53]: 120 m
                  - paragraph [ref=e54]:
                    - img [ref=e56]
                    - generic [ref=e59]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e60]:
                    - img [ref=e62]
                    - generic [ref=e63]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e64]:
                    - img [ref=e66]
                    - generic [ref=e68]: ★ 4.5
                - paragraph [ref=e69]: Tap to preview on map
            - generic [ref=e70]:
              - generic [ref=e71]:
                - link "Call" [ref=e72] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e73] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.08%2C7.4
              - link "View details →" [ref=e74] [cursor=pointer]:
                - /url: /vendors/vendor-1?returnTo=%2F&location_source=precise
          - article [ref=e75]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e76] [cursor=pointer]:
              - generic [ref=e79]:
                - generic [ref=e80]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e81]
                  - generic [ref=e82]: Open
                - paragraph [ref=e83]:
                  - img [ref=e85]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e87]:
                  - paragraph [ref=e88]:
                    - img [ref=e90]
                    - generic [ref=e93]: 200 m
                  - paragraph [ref=e94]:
                    - img [ref=e96]
                    - generic [ref=e99]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e100]:
                    - img [ref=e102]
                    - generic [ref=e103]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e104]:
                    - img [ref=e106]
                    - generic [ref=e108]: ★ 4.5
                - paragraph [ref=e109]: Tap to preview on map
            - generic [ref=e110]:
              - generic [ref=e111]:
                - link "Call" [ref=e112] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e113] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.081%2C7.401000000000001
              - link "View details →" [ref=e114] [cursor=pointer]:
                - /url: /vendors/vendor-2?returnTo=%2F&location_source=precise
          - article [ref=e115]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e116] [cursor=pointer]:
              - generic [ref=e119]:
                - generic [ref=e120]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e121]
                  - generic [ref=e122]: Open
                - paragraph [ref=e123]:
                  - img [ref=e125]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e127]:
                  - paragraph [ref=e128]:
                    - img [ref=e130]
                    - generic [ref=e133]: 280 m
                  - paragraph [ref=e134]:
                    - img [ref=e136]
                    - generic [ref=e139]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e140]:
                    - img [ref=e142]
                    - generic [ref=e143]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e144]:
                    - img [ref=e146]
                    - generic [ref=e148]: ★ 4.5
                - paragraph [ref=e149]: Tap to preview on map
            - generic [ref=e150]:
              - generic [ref=e151]:
                - link "Call" [ref=e152] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e153] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.082%2C7.402
              - link "View details →" [ref=e154] [cursor=pointer]:
                - /url: /vendors/vendor-3?returnTo=%2F&location_source=precise
          - article [ref=e155]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e156] [cursor=pointer]:
              - generic [ref=e159]:
                - generic [ref=e160]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e161]
                  - generic [ref=e162]: Open
                - paragraph [ref=e163]:
                  - img [ref=e165]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e167]:
                  - paragraph [ref=e168]:
                    - img [ref=e170]
                    - generic [ref=e173]: 360 m
                  - paragraph [ref=e174]:
                    - img [ref=e176]
                    - generic [ref=e179]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e180]:
                    - img [ref=e182]
                    - generic [ref=e183]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e184]:
                    - img [ref=e186]
                    - generic [ref=e188]: ★ 4.5
                - paragraph [ref=e189]: Tap to preview on map
            - generic [ref=e190]:
              - generic [ref=e191]:
                - link "Call" [ref=e192] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e193] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.083%2C7.4030000000000005
              - link "View details →" [ref=e194] [cursor=pointer]:
                - /url: /vendors/vendor-4?returnTo=%2F&location_source=precise
          - article [ref=e195]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e196] [cursor=pointer]:
              - generic [ref=e199]:
                - generic [ref=e200]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e201]
                  - generic [ref=e202]: Open
                - paragraph [ref=e203]:
                  - img [ref=e205]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e207]:
                  - paragraph [ref=e208]:
                    - img [ref=e210]
                    - generic [ref=e213]: 440 m
                  - paragraph [ref=e214]:
                    - img [ref=e216]
                    - generic [ref=e219]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e220]:
                    - img [ref=e222]
                    - generic [ref=e223]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e224]:
                    - img [ref=e226]
                    - generic [ref=e228]: ★ 4.5
                - paragraph [ref=e229]: Tap to preview on map
            - generic [ref=e230]:
              - generic [ref=e231]:
                - link "Call" [ref=e232] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e233] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.084%2C7.404
              - link "View details →" [ref=e234] [cursor=pointer]:
                - /url: /vendors/vendor-5?returnTo=%2F&location_source=precise
          - article [ref=e235]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e236] [cursor=pointer]:
              - generic [ref=e239]:
                - generic [ref=e240]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e241]
                  - generic [ref=e242]: Open
                - paragraph [ref=e243]:
                  - img [ref=e245]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e247]:
                  - paragraph [ref=e248]:
                    - img [ref=e250]
                    - generic [ref=e253]: 520 m
                  - paragraph [ref=e254]:
                    - img [ref=e256]
                    - generic [ref=e259]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e260]:
                    - img [ref=e262]
                    - generic [ref=e263]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e264]:
                    - img [ref=e266]
                    - generic [ref=e268]: ★ 4.5
                - paragraph [ref=e269]: Tap to preview on map
            - generic [ref=e270]:
              - generic [ref=e271]:
                - link "Call" [ref=e272] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e273] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.085%2C7.405
              - link "View details →" [ref=e274] [cursor=pointer]:
                - /url: /vendors/vendor-6?returnTo=%2F&location_source=precise
          - article [ref=e275]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e276] [cursor=pointer]:
              - generic [ref=e279]:
                - generic [ref=e280]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e281]
                  - generic [ref=e282]: Open
                - paragraph [ref=e283]:
                  - img [ref=e285]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e287]:
                  - paragraph [ref=e288]:
                    - img [ref=e290]
                    - generic [ref=e293]: 600 m
                  - paragraph [ref=e294]:
                    - img [ref=e296]
                    - generic [ref=e299]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e300]:
                    - img [ref=e302]
                    - generic [ref=e303]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e304]:
                    - img [ref=e306]
                    - generic [ref=e308]: ★ 4.5
                - paragraph [ref=e309]: Tap to preview on map
            - generic [ref=e310]:
              - generic [ref=e311]:
                - link "Call" [ref=e312] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e313] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.086%2C7.406000000000001
              - link "View details →" [ref=e314] [cursor=pointer]:
                - /url: /vendors/vendor-7?returnTo=%2F&location_source=precise
          - article [ref=e315]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e316] [cursor=pointer]:
              - generic [ref=e319]:
                - generic [ref=e320]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e321]
                  - generic [ref=e322]: Open
                - paragraph [ref=e323]:
                  - img [ref=e325]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e327]:
                  - paragraph [ref=e328]:
                    - img [ref=e330]
                    - generic [ref=e333]: 680 m
                  - paragraph [ref=e334]:
                    - img [ref=e336]
                    - generic [ref=e339]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e340]:
                    - img [ref=e342]
                    - generic [ref=e343]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e344]:
                    - img [ref=e346]
                    - generic [ref=e348]: ★ 4.5
                - paragraph [ref=e349]: Tap to preview on map
            - generic [ref=e350]:
              - generic [ref=e351]:
                - link "Call" [ref=e352] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e353] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.087%2C7.407
              - link "View details →" [ref=e354] [cursor=pointer]:
                - /url: /vendors/vendor-8?returnTo=%2F&location_source=precise
          - article [ref=e355]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e356] [cursor=pointer]:
              - generic [ref=e359]:
                - generic [ref=e360]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e361]
                  - generic [ref=e362]: Open
                - paragraph [ref=e363]:
                  - img [ref=e365]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e367]:
                  - paragraph [ref=e368]:
                    - img [ref=e370]
                    - generic [ref=e373]: 760 m
                  - paragraph [ref=e374]:
                    - img [ref=e376]
                    - generic [ref=e379]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e380]:
                    - img [ref=e382]
                    - generic [ref=e383]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e384]:
                    - img [ref=e386]
                    - generic [ref=e388]: ★ 4.5
                - paragraph [ref=e389]: Tap to preview on map
            - generic [ref=e390]:
              - generic [ref=e391]:
                - link "Call" [ref=e392] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e393] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.088%2C7.408
              - link "View details →" [ref=e394] [cursor=pointer]:
                - /url: /vendors/vendor-9?returnTo=%2F&location_source=precise
          - article [ref=e395]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e396] [cursor=pointer]:
              - generic [ref=e399]:
                - generic [ref=e400]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e401]
                  - generic [ref=e402]: Open
                - paragraph [ref=e403]:
                  - img [ref=e405]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e407]:
                  - paragraph [ref=e408]:
                    - img [ref=e410]
                    - generic [ref=e413]: 840 m
                  - paragraph [ref=e414]:
                    - img [ref=e416]
                    - generic [ref=e419]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e420]:
                    - img [ref=e422]
                    - generic [ref=e423]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e424]:
                    - img [ref=e426]
                    - generic [ref=e428]: ★ 4.5
                - paragraph [ref=e429]: Tap to preview on map
            - generic [ref=e430]:
              - generic [ref=e431]:
                - link "Call" [ref=e432] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e433] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.089%2C7.409000000000001
              - link "View details →" [ref=e434] [cursor=pointer]:
                - /url: /vendors/vendor-10?returnTo=%2F&location_source=precise
          - article [ref=e435]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e436] [cursor=pointer]:
              - generic [ref=e439]:
                - generic [ref=e440]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e441]
                  - generic [ref=e442]: Open
                - paragraph [ref=e443]:
                  - img [ref=e445]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e447]:
                  - paragraph [ref=e448]:
                    - img [ref=e450]
                    - generic [ref=e453]: 920 m
                  - paragraph [ref=e454]:
                    - img [ref=e456]
                    - generic [ref=e459]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e460]:
                    - img [ref=e462]
                    - generic [ref=e463]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e464]:
                    - img [ref=e466]
                    - generic [ref=e468]: ★ 4.5
                - paragraph [ref=e469]: Tap to preview on map
            - generic [ref=e470]:
              - generic [ref=e471]:
                - link "Call" [ref=e472] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e473] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.09%2C7.41
              - link "View details →" [ref=e474] [cursor=pointer]:
                - /url: /vendors/vendor-11?returnTo=%2F&location_source=precise
          - article [ref=e475]:
            - button "Preview ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX on map" [ref=e476] [cursor=pointer]:
              - generic [ref=e479]:
                - generic [ref=e480]:
                  - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=3] [ref=e481]
                  - generic [ref=e482]: Open
                - paragraph [ref=e483]:
                  - img [ref=e485]
                  - text: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                - generic [ref=e487]:
                  - paragraph [ref=e488]:
                    - img [ref=e490]
                    - generic [ref=e493]: 1.0 km
                  - paragraph [ref=e494]:
                    - img [ref=e496]
                    - generic [ref=e499]: "Active hours: 9:00 AM - 6:00 PM"
                  - paragraph [ref=e500]:
                    - img [ref=e502]
                    - generic [ref=e503]: Everyday price • EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                  - generic [ref=e504]:
                    - img [ref=e506]
                    - generic [ref=e508]: ★ 4.5
                - paragraph [ref=e509]: Tap to preview on map
            - generic [ref=e510]:
              - generic [ref=e511]:
                - link "Call" [ref=e512] [cursor=pointer]:
                  - /url: tel:+2348000000000
                - link "Directions" [ref=e513] [cursor=pointer]:
                  - /url: https://www.google.com/maps/dir/?api=1&destination=9.091%2C7.4110000000000005
              - link "View details →" [ref=e514] [cursor=pointer]:
                - /url: /vendors/vendor-12?returnTo=%2F&location_source=precise
      - generic [ref=e515]:
        - generic [ref=e516]:
          - generic [ref=e519]:
            - generic [ref=e520]:
              - generic [ref=e521]: Search
              - textbox "Search" [ref=e522]:
                - /placeholder: Vendor, dish, or area
            - button "Open filters" [ref=e523]:
              - img [ref=e524]
          - region "Nearby vendor map" [ref=e526]:
            - generic [ref=e527]:
              - region "Map" [ref=e529]
              - generic:
                - generic:
                  - generic [ref=e530]:
                    - button "Zoom in" [ref=e531] [cursor=pointer]
                    - button "Zoom out" [ref=e533] [cursor=pointer]
                  - button "Find my location" [ref=e536] [cursor=pointer]
                - group [ref=e538]:
                  - generic "Toggle attribution" [ref=e539] [cursor=pointer]
                  - link "MapLibre" [ref=e541] [cursor=pointer]:
                    - /url: https://maplibre.org/
            - generic:
              - generic: Loading map…
            - generic [ref=e542]:
              - generic [ref=e543]: Search location
              - generic [ref=e544]: 12 vendors
        - generic [ref=e545]:
          - paragraph [ref=e546]: Selected vendor
          - heading "ULTRALONGVENDORNAMEWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" [level=2] [ref=e547]
          - generic [ref=e548]:
            - paragraph [ref=e549]:
              - generic [ref=e550]:
                - img [ref=e552]
                - text: 120 m
              - generic [ref=e555]:
                - img [ref=e557]
                - text: Open
            - paragraph [ref=e560]:
              - img [ref=e562]
              - generic [ref=e565]: "Active hours:"
              - text: 9:00 AM - 6:00 PM
            - paragraph [ref=e566]:
              - img [ref=e568]
              - generic [ref=e570]: ULTRALONGDISHWITHOUTSPACES_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
            - paragraph [ref=e571]:
              - img [ref=e573]
              - generic [ref=e574]: "Area:"
              - text: EXTREMELY_LONG_AREA_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
          - generic [ref=e575]:
            - generic [ref=e576]:
              - link "Call" [ref=e577] [cursor=pointer]:
                - /url: tel:+2348000000000
              - link "Directions" [ref=e578] [cursor=pointer]:
                - /url: https://www.google.com/maps/dir/?api=1&destination=9.08%2C7.4
            - link "View details" [ref=e579] [cursor=pointer]:
              - /url: /vendors/vendor-1?returnTo=%2F&location_source=precise
  - alert [ref=e580]
```

# Test source

```ts
  78  |     vendors,
  79  |     categories = [
  80  |       { id: uuid(9001), name: "Breakfast", slug: "breakfast" },
  81  |       { id: uuid(9002), name: "Lunch", slug: "lunch" },
  82  |     ],
  83  |     nearbyStatus = 200,
  84  |     nearbySuccess = true,
  85  |     nearbyDelayMs = 0,
  86  |     locationLabel = "Current location",
  87  |     locationSource = "precise",
  88  |   } = options;
  89  | 
  90  |   await page.context().grantPermissions(["geolocation"]);
  91  |   await page.context().setGeolocation({ latitude: 9.08, longitude: 7.4 });
  92  | 
  93  |   await page.route("**/api/categories", async (route) => {
  94  |     await route.fulfill({
  95  |       status: 200,
  96  |       contentType: "application/json",
  97  |       body: JSON.stringify({
  98  |         success: true,
  99  |         data: { categories },
  100 |         error: null,
  101 |       }),
  102 |     });
  103 |   });
  104 | 
  105 |   await page.route("**/api/vendors/nearby**", async (route) => {
  106 |     if (nearbyDelayMs > 0) {
  107 |       await new Promise((resolve) => setTimeout(resolve, nearbyDelayMs));
  108 |     }
  109 | 
  110 |     if (!nearbySuccess) {
  111 |       await route.fulfill({
  112 |         status: nearbyStatus,
  113 |         contentType: "application/json",
  114 |         body: JSON.stringify({
  115 |           success: false,
  116 |           data: null,
  117 |           error: {
  118 |             code: "UPSTREAM_ERROR",
  119 |             message: "Unable to fetch nearby vendors.",
  120 |           },
  121 |         }),
  122 |       });
  123 |       return;
  124 |     }
  125 | 
  126 |     await route.fulfill({
  127 |       status: 200,
  128 |       contentType: "application/json",
  129 |       body: JSON.stringify({
  130 |         success: true,
  131 |         data: {
  132 |           location: {
  133 |             source: locationSource,
  134 |             label: locationLabel,
  135 |             coordinates: { lat: 9.08, lng: 7.4 },
  136 |             isApproximate: locationSource !== "precise",
  137 |           },
  138 |           vendors,
  139 |         },
  140 |         error: null,
  141 |       }),
  142 |     });
  143 |   });
  144 | }
  145 | 
  146 | test.describe("Layout stress", () => {
  147 |   test("320px long content stays within bounds", async ({ page }) => {
  148 |     const errors = trackClientErrors(page);
  149 | 
  150 |     const vendors = Array.from({ length: 12 }, (_, index) =>
  151 |       createVendor(index, {
  152 |         name: longText("ULTRALONGVENDORNAMEWITHOUTSPACES_", 140),
  153 |         short_description: longText("Y", 240),
  154 |         area: longText("EXTREMELY_LONG_AREA_", 120),
  155 |         featured_dish: {
  156 |           dish_name: longText("ULTRALONGDISHWITHOUTSPACES_", 120),
  157 |           description: null,
  158 |         },
  159 |       }),
  160 |     );
  161 | 
  162 |     const categories = [
  163 |       { id: uuid(9001), name: longText("CATEGORY WITH A VERY LONG LABEL ", 100), slug: "category-1" },
  164 |     ];
  165 | 
  166 |     await mockDiscovery(page, { vendors, categories });
  167 |     await page.setViewportSize({ width: 320, height: 844 });
  168 |     await page.goto("/");
  169 | 
  170 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  171 |     await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
  172 |     await expect(page.locator(".vendor-card h3").first()).toBeVisible();
  173 |     await expect(page.locator(".vendor-card .vendor-card-rating").first()).toBeVisible();
  174 | 
  175 |     const hasHorizontalOverflow = await page.evaluate(
  176 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  177 |     );
> 178 |     expect(hasHorizontalOverflow).toBe(false);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  179 | 
  180 |     await page.goto("/search?q=rice");
  181 |     await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
  182 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  183 | 
  184 |     const searchOverflow = await page.evaluate(
  185 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  186 |     );
  187 |     expect(searchOverflow).toBe(false);
  188 | 
  189 |     await expectNoClientErrors(errors);
  190 |   });
  191 | 
  192 |   test("dense results and rapid interactions stay stable", async ({ page }) => {
  193 |     const errors = trackClientErrors(page);
  194 | 
  195 |     const vendors = Array.from({ length: 30 }, (_, index) =>
  196 |       createVendor(index, {
  197 |         name: `Vendor ${index + 1} ${"N".repeat(index % 5 === 0 ? 80 : 18)}`,
  198 |         short_description: index % 3 === 0 ? null : `Description ${index + 1}`,
  199 |         area: index % 4 === 0 ? null : `Area ${index + 1}`,
  200 |         featured_dish:
  201 |           index % 3 === 0
  202 |             ? null
  203 |             : {
  204 |                 dish_name: `Dish ${index + 1}`,
  205 |                 description: null,
  206 |               },
  207 |       }),
  208 |     );
  209 | 
  210 |     await mockDiscovery(page, { vendors });
  211 |     await page.setViewportSize({ width: 390, height: 844 });
  212 |     await page.goto("/");
  213 | 
  214 |     await expect(page.locator(".vendor-card")).toHaveCount(30);
  215 | 
  216 |     let expectedSelectedVendorName = "";
  217 | 
  218 |     for (const index of [0, 4, 9, 14, 19]) {
  219 |       const card = page.locator(".vendor-card").nth(index);
  220 |       expectedSelectedVendorName =
  221 |         (await card.locator("h3").textContent())?.trim() ?? expectedSelectedVendorName;
  222 |       await card.getByRole("button", { name: /Preview .* on map/ }).click();
  223 |     }
  224 | 
  225 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(expectedSelectedVendorName);
  226 | 
  227 |     await page.getByRole("textbox", { name: "Search" }).fill("rice");
  228 |     await openDiscoveryFilters(page);
  229 |     let applyButton = page.locator('button:has-text("Apply"):visible');
  230 |     await applyButton.scrollIntoViewIfNeeded();
  231 |     await applyButton.click();
  232 |     await page.getByRole("textbox", { name: "Search" }).fill("spicy");
  233 |     await openDiscoveryFilters(page);
  234 |     applyButton = page.locator('button:has-text("Apply"):visible');
  235 |     await applyButton.scrollIntoViewIfNeeded();
  236 |     await applyButton.click();
  237 | 
  238 |     await page.goto("/search?q=rice");
  239 |     await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
  240 |     await page.goto("/");
  241 |     await expect(page.getByRole("heading", { name: "The Local Man" })).toBeVisible();
  242 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  243 | 
  244 |     await expectNoClientErrors(errors);
  245 |   });
  246 | 
  247 |   test("loading, empty, and error states render cleanly", async ({ page }) => {
  248 |     const loadingErrors = trackClientErrors(page);
  249 | 
  250 |     const vendors = [createVendor(0)];
  251 | 
  252 |     await mockDiscovery(page, { vendors, nearbyDelayMs: 800 });
  253 |     await page.setViewportSize({ width: 320, height: 844 });
  254 |     await page.goto("/");
  255 | 
  256 |     await expect(page.getByText("Loading…")).toBeVisible();
  257 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  258 |     await expectNoClientErrors(loadingErrors);
  259 | 
  260 |     const emptyPage = await page.context().newPage();
  261 |     const emptyErrors = trackClientErrors(emptyPage);
  262 |     await mockDiscovery(emptyPage, { vendors: [] });
  263 |     await emptyPage.setViewportSize({ width: 320, height: 844 });
  264 |     await emptyPage.goto("/");
  265 |     await expect(emptyPage.getByText("No vendors matched this search.")).toBeVisible();
  266 |     await expectNoClientErrors(emptyErrors);
  267 |     await emptyPage.close();
  268 | 
  269 |     const errorPage = await page.context().newPage();
  270 |     const errorErrors = trackClientErrors(errorPage);
  271 |     await mockDiscovery(errorPage, { vendors: [], nearbySuccess: false });
  272 |     await errorPage.setViewportSize({ width: 320, height: 844 });
  273 |     await errorPage.goto("/");
  274 |     await expect(errorPage.locator(".runtime-error")).toBeVisible();
  275 |     await expectNoClientErrors(errorErrors);
  276 |     await errorPage.close();
  277 |   });
  278 | 
```