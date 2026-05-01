# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layout-stress.spec.ts >> Layout stress >> loading, empty, and error states render cleanly
- Location: tests/e2e/layout-stress.spec.ts:247:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Loading…')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Loading…')

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
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
> 256 |     await expect(page.getByText("Loading…")).toBeVisible();
      |                                              ^ Error: expect(locator).toBeVisible() failed
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
  279 |   test("partial data falls back cleanly", async ({ page }) => {
  280 |     const errors = trackClientErrors(page);
  281 | 
  282 |     const vendors = [
  283 |       createVendor(0, {
  284 |         name: longText("PARTIAL_VENDOR_NAME_", 80),
  285 |         short_description: "Local food vendor",
  286 |         area: null,
  287 |         phone_number: null,
  288 |         price_band: null,
  289 |         average_rating: 0,
  290 |         review_count: 0,
  291 |         featured_dish: null,
  292 |       }),
  293 |     ];
  294 | 
  295 |     await mockDiscovery(page, { vendors, locationSource: "approximate", locationLabel: "Approximate location" });
  296 |     await page.setViewportSize({ width: 320, height: 844 });
  297 |     await page.goto("/");
  298 | 
  299 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  300 |     await expect(page.locator(".vendor-card").first().getByText("Local food vendor")).toBeVisible();
  301 |     await expect(page.locator(".vendor-card").first().getByText("New")).toBeVisible();
  302 |     await expect(
  303 |       page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }),
  304 |     ).toBeVisible();
  305 | 
  306 |     const hasHorizontalOverflow = await page.evaluate(
  307 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  308 |     );
  309 |     expect(hasHorizontalOverflow).toBe(false);
  310 | 
  311 |     await expectNoClientErrors(errors);
  312 |   });
  313 | });
  314 | 
```