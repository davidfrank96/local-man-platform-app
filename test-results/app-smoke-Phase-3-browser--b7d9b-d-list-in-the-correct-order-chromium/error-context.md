# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> mobile discovery keeps header, filters, map, selected preview, and list in the correct order
- Location: tests/e2e/app-smoke.spec.ts:905:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.getAttribute: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.vendor-card').first()

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  814  |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  815  |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  816  |     await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
  817  |     await openDiscoveryFilters(page);
  818  |     await expect(page.locator('select[name="radiusKm"]:visible')).toHaveValue("30");
  819  |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");
  820  |     await expectUniqueMapVendorMarkers(page);
  821  | 
  822  |     const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
  823  |     await expect(restoredApplyButton).toBeEnabled();
  824  |     await page.locator('select[name="priceBand"]:visible').selectOption("budget");
  825  |     await restoredApplyButton.click();
  826  | 
  827  |     await expect(page).toHaveURL(/price_band=budget/);
  828  |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  829  |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
  830  | 
  831  |     await expectNoClientErrors(errors);
  832  |   });
  833  | 
  834  |   test("admin route loads", async ({ page }) => {
  835  |     const errors = trackClientErrors(page);
  836  | 
  837  |     await page.goto("/admin");
  838  |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  839  |     await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  840  |     await expect(page.getByLabel("Password")).toBeVisible();
  841  | 
  842  |     await expectNoClientErrors(errors);
  843  |   });
  844  | 
  845  |   test("admin vendors route loads behind auth", async ({ page }) => {
  846  |     const errors = trackClientErrors(page);
  847  | 
  848  |     await page.goto("/admin/vendors");
  849  |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  850  |     await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  851  | 
  852  |     await expectNoClientErrors(errors);
  853  |   });
  854  | 
  855  |   test("admin analytics route loads behind auth", async ({ page }) => {
  856  |     const errors = trackClientErrors(page);
  857  | 
  858  |     await page.goto("/admin/analytics");
  859  |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  860  |     await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  861  | 
  862  |     await expectNoClientErrors(errors);
  863  |   });
  864  | 
  865  |   test("admin create vendor route loads behind auth", async ({ page }) => {
  866  |     const errors = trackClientErrors(page);
  867  | 
  868  |     await page.goto("/admin/vendors/new");
  869  |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  870  |     await expect(page.getByLabel("Password")).toBeVisible();
  871  | 
  872  |     await expectNoClientErrors(errors);
  873  |   });
  874  | 
  875  |   test("admin edit vendor route loads behind auth", async ({ page }) => {
  876  |     const errors = trackClientErrors(page);
  877  | 
  878  |     await page.goto("/admin/vendors/00000000-0000-4000-8000-000000000001");
  879  |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  880  |     await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  881  | 
  882  |     await expectNoClientErrors(errors);
  883  |   });
  884  | 
  885  |   test("mobile homepage keeps core content visible", async ({ page }) => {
  886  |     const errors = trackClientErrors(page);
  887  | 
  888  |     await page.setViewportSize({ width: 390, height: 844 });
  889  |     await primePublicLocation(page);
  890  |     await mockReverseGeocode(page, "Wuse II, Abuja");
  891  |     await page.goto("/");
  892  | 
  893  |     await expect(page.locator(".discovery-map")).toBeVisible();
  894  |     await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
  895  |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  896  | 
  897  |     const hasHorizontalOverflow = await page.evaluate(
  898  |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  899  |     );
  900  |     expect(hasHorizontalOverflow).toBe(false);
  901  | 
  902  |     await expectNoClientErrors(errors);
  903  |   });
  904  | 
  905  |   test("mobile discovery keeps header, filters, map, selected preview, and list in the correct order", async ({ page }) => {
  906  |     const errors = trackClientErrors(page);
  907  | 
  908  |     await page.setViewportSize({ width: 390, height: 844 });
  909  |     await primePublicLocation(page);
  910  |     await mockReverseGeocode(page, "Wuse II, Abuja");
  911  |     await page.goto("/");
  912  | 
  913  |     const firstCard = page.locator(".vendor-card").first();
> 914  |     const firstVendorId = await firstCard.getAttribute("data-vendor-id");
       |                                           ^ Error: locator.getAttribute: Test timeout of 30000ms exceeded.
  915  |     expect(firstVendorId).toBeTruthy();
  916  | 
  917  |     await clickVendorOnMap(page, firstVendorId!);
  918  | 
  919  |     const headerTop = await topPosition(page.locator(".discovery-heading"));
  920  |     const filtersTop = await topPosition(page.locator(".mobile-discovery-filters"));
  921  |     const mapTop = await topPosition(page.locator(".discovery-map"));
  922  |     const selectedTop = await topPosition(page.locator(".selected-vendor-panel"));
  923  |     const firstCardTop = await topPosition(firstCard);
  924  | 
  925  |     expect(headerTop).toBeLessThan(filtersTop);
  926  |     expect(filtersTop).toBeLessThan(mapTop);
  927  |     expect(mapTop).toBeLessThan(selectedTop);
  928  |     expect(selectedTop).toBeLessThan(firstCardTop);
  929  | 
  930  |     await expectNoClientErrors(errors);
  931  |   });
  932  | 
  933  |   test("mobile map marker selection surfaces the selected vendor preview and card selection keeps map focus", async ({ page }) => {
  934  |     const errors = trackClientErrors(page);
  935  | 
  936  |     await page.setViewportSize({ width: 390, height: 844 });
  937  |     await primePublicLocation(page);
  938  |     await mockReverseGeocode(page, "Wuse II, Abuja");
  939  |     await page.goto("/");
  940  | 
  941  |     const firstCard = page.locator(".vendor-card").first();
  942  |     const firstVendorName = await firstCard.locator("h3").textContent();
  943  |     const firstVendorId = await firstCard.getAttribute("data-vendor-id");
  944  |     expect(firstVendorId).toBeTruthy();
  945  |     const scrollBeforeMarkerTap = await page.evaluate(() => window.scrollY);
  946  |     const cameraStateBeforeMarkerTap = await readMapCameraState(page);
  947  | 
  948  |     await clickVendorOnMap(page, firstVendorId!);
  949  |     const scrollAfterMarkerTap = await page.evaluate(() => window.scrollY);
  950  |     expect(Math.abs(scrollAfterMarkerTap - scrollBeforeMarkerTap)).toBeLessThan(12);
  951  | 
  952  |     const selectedPanel = page.locator(".selected-vendor-panel");
  953  |     await expect(selectedPanel).toBeInViewport();
  954  |     await expect(selectedPanel.locator("h2")).toContainText(firstVendorName ?? "");
  955  |     await expect(selectedPanel).toContainText("Today:");
  956  |     await expect(selectedPanel).toContainText(/Open|Closed|Hours unavailable/);
  957  |     await expect(selectedPanel.getByRole("link", { name: "View details" })).toBeVisible();
  958  |     await expect(selectedPanel.getByRole("link", { name: "Call" })).toBeVisible();
  959  |     await expect(selectedPanel.getByRole("link", { name: "Directions" })).toBeVisible();
  960  |     const cameraStateAfterMarkerTap = await readMapCameraState(page);
  961  |     if (cameraStateBeforeMarkerTap && cameraStateAfterMarkerTap) {
  962  |       expect(cameraStateAfterMarkerTap.count).toBe(cameraStateBeforeMarkerTap.count);
  963  |     }
  964  | 
  965  |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  966  |     await expect(selectedPanel.locator("h2")).toContainText(firstVendorName ?? "");
  967  |     await expect(page.locator(`.discovery-map [data-vendor-id="${firstVendorId}"].selected`)).toBeVisible();
  968  |     await expectUniqueMapVendorMarkers(page);
  969  | 
  970  |     await openDiscoveryFilters(page);
  971  |     await page.locator('select[name="radiusKm"]:visible').selectOption("30");
  972  |     const applyButton = page.locator('button:has-text("Apply"):visible');
  973  |     await expect(applyButton).toBeEnabled();
  974  |     await applyButton.click();
  975  |     await expect(page).toHaveURL(/radius_km=30/);
  976  |     await expect(selectedPanel).toBeVisible();
  977  |     await expectUniqueMapVendorMarkers(page);
  978  |     if ((await page.locator('.discovery-map[data-map-mode="maplibre"]').count()) > 0) {
  979  |       const overviewZoom = await page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getZoom() ?? null);
  980  |       expect(overviewZoom).not.toBeNull();
  981  |       expect(overviewZoom!).toBeLessThan(15);
  982  |       const cameraStateAfterApply = await readMapCameraState(page);
  983  |       expect(cameraStateAfterApply).not.toBeNull();
  984  |       expect(cameraStateAfterApply?.lastAction?.source).toBe("filter");
  985  |       const interactionState = await readMapInteractionState(page);
  986  |       expect(interactionState).not.toBeNull();
  987  |       expect(interactionState).toMatchObject({
  988  |         dragPan: true,
  989  |         dragRotate: false,
  990  |         touchZoomRotate: true,
  991  |       });
  992  |     }
  993  | 
  994  |     await expectNoClientErrors(errors);
  995  |   });
  996  | 
  997  |   test("small phone layout stays readable", async ({ page }) => {
  998  |     const errors = trackClientErrors(page);
  999  | 
  1000 |     await page.setViewportSize({ width: 320, height: 844 });
  1001 |     await primePublicLocation(page);
  1002 |     await page.goto("/");
  1003 | 
  1004 |     await expect(page.locator(".discovery-map")).toBeVisible();
  1005 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1006 |     await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
  1007 |     await page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }).click();
  1008 |     await expect(page.locator(".vendor-card").first()).toHaveClass(/selected/);
  1009 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1010 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-status-line")).toContainText("km");
  1011 | 
  1012 |     const hasHorizontalOverflow = await page.evaluate(
  1013 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  1014 |     );
```