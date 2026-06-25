# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> mobile map marker selection surfaces the selected vendor preview and card selection keeps map focus
- Location: tests/e2e/app-smoke.spec.ts:5701:3

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "pending"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - region "Local Man App" [ref=e5]:
      - text: ✦ ✦ ✦ ✦
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e9]:
            - generic [ref=e10]:
              - generic [ref=e11]: Search
              - textbox "Search" [ref=e12]:
                - /placeholder: Vendor, dish, or area
            - button "Open filters" [ref=e13]:
              - img [ref=e14]
          - region "Nearby vendor map" [ref=e16]:
            - generic [ref=e17]:
              - generic [ref=e18]:
                - region "Map" [ref=e19]
                - img "Search location"
              - generic:
                - generic:
                  - generic [ref=e20]:
                    - button "Zoom in" [ref=e21] [cursor=pointer]
                    - button "Zoom out" [ref=e23] [cursor=pointer]
                  - button "Find my location" [ref=e26] [cursor=pointer]
                - group [ref=e28]:
                  - generic "Toggle attribution" [ref=e29] [cursor=pointer]
                  - generic [ref=e30]:
                    - link "MapLibre" [ref=e31] [cursor=pointer]:
                      - /url: https://maplibre.org/
                    - text: "|"
                    - link "© MapTiler" [ref=e32] [cursor=pointer]:
                      - /url: https://www.maptiler.com/copyright/
                    - link "© OpenStreetMap contributors" [ref=e33] [cursor=pointer]:
                      - /url: https://www.openstreetmap.org/copyright
            - generic:
              - generic: Loading map…
            - generic "Map vendors" [ref=e34]:
              - button "Select God's Hand food vendor" [ref=e35]
              - button "Select Madam No be lie" [pressed] [ref=e36]
              - button "Select Mama sunny" [ref=e37]
              - button "Select Mummy Twins" [ref=e38]
              - button "Select Mme Yam" [ref=e39]
              - button "Select Blessing Smoothie" [ref=e40]
              - button "Select Madam Franka" [ref=e41]
              - button "Select Calabar kitchen" [ref=e42]
              - button "Select Joy Fish Service" [ref=e43]
              - button "Select Mama Ezikel" [ref=e44]
              - button "Select Aunty Indomie" [ref=e45]
              - button "Select Mama Obinna" [ref=e46]
              - button "Select Mma Afam" [ref=e47]
              - button "Select China" [ref=e48]
              - button "Select Theresa fish" [ref=e49]
              - button "Select Mama Shilo" [ref=e50]
              - button "Select Mandy's signature" [ref=e51]
              - button "Select Madam Mbpodium plantain" [ref=e52]
              - button "Select Madam Indomie" [ref=e53]
              - button "Select Mama thank God" [ref=e54]
              - button "Select Potable kitchen" [ref=e55]
              - button "Select Ultimate ontop" [ref=e56]
              - button "Select Mama Sisi" [ref=e57]
              - button "Select Mama sisi" [ref=e58]
              - button "Select mai Awara" [ref=e59]
              - button "Select Blessing indomie" [ref=e60]
              - button "Select Mme Suya" [ref=e61]
              - button "Select Madam put more" [ref=e62]
              - button "Select Madam Fish" [ref=e63]
              - button "Select Chi joy Catherine Services" [ref=e64]
              - button "Select Chizzy African food" [ref=e65]
              - button "Select Mama mary" [ref=e66]
              - button "Select madam Bole" [ref=e67]
              - button "Select Mme Doya" [ref=e68]
              - button "Select Mai kilishi" [ref=e69]
              - button "Select NIKIS SPECIAL" [ref=e70]
              - button "Select Esther" [ref=e71]
              - button "Select Mme kunu" [ref=e72]
              - button "Select mama Obaje" [ref=e73]
              - button "Select Mama Daniel" [ref=e74]
              - button "Select KC faith kitchen" [ref=e75]
              - button "Select Mama mary" [ref=e76]
              - button "Select mummy Dominic" [ref=e77]
              - button "Select Gub's Kitchen Ventures" [ref=e78]
              - button "Select mme Masa" [ref=e79]
              - button "Select mummy good luck" [ref=e80]
              - button "Select Special" [ref=e81]
              - button "Select gift" [ref=e82]
              - button "Select Doyin Exclusive Taste" [ref=e83]
              - button "Select NativePot" [ref=e84]
              - button "Select Mama Akara" [ref=e85]
              - button "Select mama miracle" [ref=e86]
              - button "Select Madam Cynthia Roasted yams, plantains nd Beans" [ref=e87]
              - button "Select Mama Ejima home cooking restaurant" [ref=e88]
              - button "Select Mama Jemila Akara and pap" [ref=e89]
              - button "Select madam Ekaette" [ref=e90]
              - button "Select Ahjiah" [ref=e91]
              - button "Select Christy" [ref=e92]
              - button "Select quasi quasi" [ref=e93]
              - button "Select mama blessing" [ref=e94]
              - button "Select Mama princess" [ref=e95]
              - button "Select Nature's delight Natural drink" [ref=e96]
              - button "Select Lajawa Suya and Barbecue" [ref=e97]
              - button "Select Oga Munkaila fast-food/Meishai" [ref=e98]
              - button "Select Comfort Kitchen" [ref=e99]
              - button "Select Ann's kitchen" [ref=e100]
              - button "Select Christina Onishinu" [ref=e101]
              - button "Select Mama Edo" [ref=e102]
              - button "Select Precious Indomie" [ref=e103]
              - button "Select MaMa Ola" [ref=e104]
              - button "Select Madam TIV" [ref=e105]
              - button "Select ADAMU SPECIAL KILISHI" [ref=e106]
              - button "Select Mama mimi" [ref=e107]
              - button "Select Adamu kilishi" [ref=e108]
              - button "Select Anambra Kitchen" [ref=e109]
              - button "Select NATIONS EAT PLATE FAST FOOD" [ref=e110]
              - button "Select Mai Suya" [ref=e111]
            - generic [ref=e112]:
              - generic [ref=e113]: Search location
              - generic [ref=e114]: 77 vendors
          - button "Refresh map" [ref=e115]
        - generic [ref=e116]:
          - paragraph [ref=e117]: Selected vendor
          - heading "Madam No be lie" [level=2] [ref=e118]
          - generic [ref=e119]:
            - paragraph [ref=e120]:
              - generic [ref=e121]:
                - img [ref=e123]
                - text: 1.1 km
              - generic [ref=e126]:
                - img [ref=e128]
                - text: Closed
            - paragraph [ref=e131]:
              - img [ref=e133]
              - generic [ref=e136]: "Active hours:"
              - text: 6:00 AM - 8:00 PM
            - paragraph [ref=e137]:
              - img [ref=e139]
              - generic [ref=e141]: yam, plantain, cooked corn, Apu and swallow
            - paragraph [ref=e142]:
              - img [ref=e144]
              - generic [ref=e145]: "Area:"
              - text: Life Camp
          - generic [ref=e146]:
            - generic [ref=e147]:
              - link "Call" [ref=e148] [cursor=pointer]:
                - /url: tel:+2349060775460
                - img [ref=e149]
                - text: Call
              - link "Directions" [ref=e151] [cursor=pointer]:
                - /url: https://www.google.com/maps/dir/?api=1&destination=9.078543%2C7.389785
                - img [ref=e152]
                - text: Directions
            - link "View details" [ref=e156] [cursor=pointer]:
              - /url: /vendors/madam-no-be-lie?returnTo=%2F&location_source=precise
    - navigation "Mobile discovery sections" [ref=e157]:
      - button "Home" [ref=e158]:
        - img [ref=e159]
        - generic [ref=e161]: Home
      - button "Map" [active] [ref=e162]:
        - img [ref=e163]
        - generic [ref=e166]: Map
      - button "About" [ref=e167]:
        - img [ref=e168]
        - generic [ref=e171]: About
  - button "Open Next.js Dev Tools" [ref=e177] [cursor=pointer]:
    - img [ref=e178]
  - alert [ref=e181]
```

# Test source

```ts
  6   |   seedPublicDiscoverySnapshot,
  7   | } from "./helpers/public-discovery.ts";
  8   | 
  9   | type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
  10  | type MockNearbyVendor = Omit<NearbyVendor, "ranking_score"> & {
  11  |   ranking_score?: number;
  12  | };
  13  | 
  14  | function trackClientErrors(page: Page): string[] {
  15  |   const errors: string[] = [];
  16  | 
  17  |   page.on("console", (message) => {
  18  |     if (message.type() === "error") {
  19  |       errors.push(message.text());
  20  |     }
  21  |   });
  22  | 
  23  |   page.on("pageerror", (error) => {
  24  |     errors.push(error.message);
  25  |   });
  26  | 
  27  |   return errors;
  28  | }
  29  | 
  30  | async function expectNoClientErrors(errors: string[]) {
  31  |   expect(errors, errors.join("\n")).toEqual([]);
  32  | }
  33  | 
  34  | function isExpectedAdminLogsFailureConsoleMessage(message: string): boolean {
  35  |   return message.includes("status of 502") ||
  36  |     (
  37  |       message.includes("code: UPSTREAM_ERROR") &&
  38  |       message.includes("context: admin_logs")
  39  |     );
  40  | }
  41  | 
  42  | function isExpectedAdminRiderInvalidStatusConsoleMessage(message: string): boolean {
  43  |   return message.includes("status of 400") &&
  44  |     message.includes("Bad Request");
  45  | }
  46  | 
  47  | async function expectInnerScroll(locator: Locator) {
  48  |   const metrics = await locator.evaluate((element) => {
  49  |     const styles = window.getComputedStyle(element);
  50  | 
  51  |     return {
  52  |       clientHeight: element.clientHeight,
  53  |       overflowY: styles.overflowY,
  54  |       scrollHeight: element.scrollHeight,
  55  |     };
  56  |   });
  57  | 
  58  |   expect(["auto", "scroll"]).toContain(metrics.overflowY);
  59  |   expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  60  | }
  61  | 
  62  | async function openDiscoveryFilters(page: Page) {
  63  |   const visibleRadiusSelect = page.locator('select[name="radiusKm"]:visible');
  64  |   if ((await visibleRadiusSelect.count()) > 0) {
  65  |     return;
  66  |   }
  67  | 
  68  |   const openToggle = page.locator('button[aria-label="Open filters"]:visible').first();
  69  |   if ((await openToggle.count()) > 0) {
  70  |     await openToggle.click();
  71  |     return;
  72  |   }
  73  | 
  74  |   const closeToggle = page.locator('button[aria-label="Close filters"]:visible').first();
  75  |   if ((await closeToggle.count()) > 0) {
  76  |     return;
  77  |   }
  78  | 
  79  |   throw new Error("Discovery filters are not reachable in the current viewport state.");
  80  | }
  81  | 
  82  | async function openMobileDiscoveryTab(page: Page, tab: "home" | "map" | "about") {
  83  |   await page.getByTestId(`mobile-discovery-tab-${tab}`).click();
  84  | }
  85  | 
  86  | async function clickVendorOnMap(page: Page, vendorId: string) {
  87  |   await page.locator(`.discovery-map [data-vendor-id="${vendorId}"]`).click();
  88  | }
  89  | 
  90  | async function dispatchVendorMapClick(page: Page, vendorId: string) {
  91  |   await page
  92  |     .locator(`.discovery-map [data-vendor-id="${vendorId}"]`)
  93  |     .evaluate((element) => {
  94  |       if (!(element instanceof HTMLElement)) {
  95  |         throw new Error("Vendor marker element is not clickable.");
  96  |       }
  97  | 
  98  |       element.click();
  99  |     });
  100 | }
  101 | 
  102 | async function expectUniqueMapVendorMarkers(page: Page) {
  103 |   const markerLocator = page.locator(
  104 |     '.discovery-map[data-map-mode="maplibre"] .maplibre-vendor-marker[data-vendor-id]',
  105 |   );
> 106 |   await expect.poll(async () => {
      |   ^ Error: expect(received).not.toBe(expected) // Object.is equality
  107 |     const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  108 | 
  109 |     if (mapMode === "fallback") {
  110 |       return "fallback";
  111 |     }
  112 | 
  113 |     if (mapMode === "maplibre" && (await markerLocator.count()) > 0) {
  114 |       return "maplibre";
  115 |     }
  116 | 
  117 |     return "pending";
  118 |   }).not.toBe("pending");
  119 | 
  120 |   const settledMapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  121 |   if (settledMapMode === "fallback") {
  122 |     return;
  123 |   }
  124 | 
  125 |   const vendorIds = await markerLocator.evaluateAll((elements) =>
  126 |     elements.map((element) => element.getAttribute("data-vendor-id") ?? ""),
  127 |   );
  128 | 
  129 |   const filteredIds = vendorIds.filter(Boolean);
  130 |   expect(filteredIds.length).toBeGreaterThan(0);
  131 |   expect(new Set(filteredIds).size).toBe(filteredIds.length);
  132 | }
  133 | 
  134 | async function expectMapLibreVendorMarkers(page: Page) {
  135 |   const markerLocator = page.locator(
  136 |     '.discovery-map[data-map-mode="maplibre"] .maplibre-vendor-marker[data-vendor-id]',
  137 |   );
  138 | 
  139 |   await expect.poll(async () => markerLocator.count(), { timeout: 10_000 }).not.toBe(0);
  140 | }
  141 | 
  142 | async function expectMapDatasetVendor(page: Page, vendorId: string, vendorName: string) {
  143 |   const marker = page.locator(`.discovery-map [data-vendor-id="${vendorId}"]`).first();
  144 |   const selectedHeading = page.locator(".selected-vendor-panel h2");
  145 | 
  146 |   await expect.poll(
  147 |     async () => {
  148 |       if ((await marker.count()) > 0 && await marker.isVisible()) {
  149 |         return "visible";
  150 |       }
  151 | 
  152 |       const headingText = await selectedHeading.textContent().catch(() => "");
  153 |       if (headingText?.includes(vendorName)) {
  154 |         return "visible";
  155 |       }
  156 | 
  157 |       return "missing";
  158 |     },
  159 |     { timeout: 10_000 },
  160 |   ).toBe("visible");
  161 | }
  162 | 
  163 | async function readMapInteractionState(page: Page) {
  164 |   const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  165 |   if (mapMode !== "maplibre") {
  166 |     return null;
  167 |   }
  168 | 
  169 |   return page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getInteractionState() ?? null);
  170 | }
  171 | 
  172 | async function readMapCameraState(page: Page) {
  173 |   const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  174 |   if (mapMode !== "maplibre") {
  175 |     return null;
  176 |   }
  177 | 
  178 |   return page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getCameraState() ?? null);
  179 | }
  180 | 
  181 | async function isMapDebugAvailable(page: Page) {
  182 |   return page.evaluate(() => Boolean(window.__LOCAL_MAN_MAP_DEBUG__));
  183 | }
  184 | 
  185 | async function topPosition(locator: Locator) {
  186 |   const box = await locator.boundingBox();
  187 |   expect(box).not.toBeNull();
  188 | 
  189 |   return box!.y;
  190 | }
  191 | 
  192 | async function expectTapTarget(locator: Locator, label: string, minimumSize = 40) {
  193 |   const box = await locator.boundingBox();
  194 |   expect(box, `${label} should be visible and measurable`).not.toBeNull();
  195 |   expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(minimumSize);
  196 |   expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(minimumSize);
  197 | }
  198 | 
  199 | async function expectNoBoxOverlap(first: Locator, second: Locator, label: string) {
  200 |   const [firstBox, secondBox] = await Promise.all([
  201 |     first.boundingBox(),
  202 |     second.boundingBox(),
  203 |   ]);
  204 | 
  205 |   expect(firstBox, `${label}: first element should be measurable`).not.toBeNull();
  206 |   expect(secondBox, `${label}: second element should be measurable`).not.toBeNull();
```