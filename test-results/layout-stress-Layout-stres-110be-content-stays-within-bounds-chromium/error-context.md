# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layout-stress.spec.ts >> Layout stress >> 320px long content stays within bounds
- Location: tests/e2e/layout-stress.spec.ts:147:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.vendor-card').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.vendor-card').first()

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  70  |   categories?: Array<{ id: string; name: string; slug: string }>;
  71  |   nearbyStatus?: number;
  72  |   nearbySuccess?: boolean;
  73  |   nearbyDelayMs?: number;
  74  |   locationLabel?: string;
  75  |   locationSource?: "precise" | "approximate" | "default_city";
  76  | }): Promise<void> {
  77  |   const {
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
> 170 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  171 |     await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
  172 |     await expect(page.locator(".vendor-card h3").first()).toBeVisible();
  173 |     await expect(page.locator(".vendor-card .vendor-card-rating").first()).toBeVisible();
  174 | 
  175 |     const hasHorizontalOverflow = await page.evaluate(
  176 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  177 |     );
  178 |     expect(hasHorizontalOverflow).toBe(false);
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
```