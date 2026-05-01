# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> small phone layout stays readable
- Location: tests/e2e/app-smoke.spec.ts:997:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.discovery-map')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.discovery-map')

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
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
  914  |     const firstVendorId = await firstCard.getAttribute("data-vendor-id");
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
> 1004 |     await expect(page.locator(".discovery-map")).toBeVisible();
       |                                                  ^ Error: expect(locator).toBeVisible() failed
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
  1015 |     expect(hasHorizontalOverflow).toBe(false);
  1016 | 
  1017 |     await expectNoClientErrors(errors);
  1018 |   });
  1019 | 
  1020 |   test("night theme keeps cards readable and selected state clear", async ({ page }) => {
  1021 |     const errors = trackClientErrors(page);
  1022 | 
  1023 |     await setMockClientTime(page, "2026-04-25T21:00:00");
  1024 |     await primePublicLocation(page);
  1025 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1026 |     await page.setViewportSize({ width: 390, height: 844 });
  1027 |     await page.goto("/");
  1028 | 
  1029 |     const shell = page.locator(".public-shell");
  1030 |     await expect(shell).toHaveAttribute("data-time-theme", "night");
  1031 | 
  1032 |     const firstCard = page.locator(".vendor-card").first();
  1033 |     await expect(firstCard).toBeVisible();
  1034 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1035 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  1036 |     await expect(firstCard).toHaveClass(/selected/);
  1037 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  1038 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText("km");
  1039 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText(/Open|Closed/);
  1040 | 
  1041 |     const selectedStyles = await firstCard.evaluate((element) => {
  1042 |       const styles = getComputedStyle(element);
  1043 |       const title = element.querySelector("h3");
  1044 |       const titleStyles = title ? getComputedStyle(title) : null;
  1045 | 
  1046 |       return {
  1047 |         backgroundColor: styles.backgroundColor,
  1048 |         color: titleStyles?.color ?? null,
  1049 |         boxShadow: styles.boxShadow,
  1050 |       };
  1051 |     });
  1052 | 
  1053 |     const [bgRed, bgGreen, bgBlue] = parseRgbChannels(selectedStyles.backgroundColor);
  1054 |     const [titleRed, titleGreen, titleBlue] = parseRgbChannels(selectedStyles.color ?? "");
  1055 | 
  1056 |     expect((bgRed + bgGreen + bgBlue) / 3).toBeGreaterThan(210);
  1057 |     expect((titleRed + titleGreen + titleBlue) / 3).toBeLessThan(120);
  1058 |     expect(selectedStyles.boxShadow).not.toBe("none");
  1059 | 
  1060 |     await expectNoClientErrors(errors);
  1061 |   });
  1062 | 
  1063 |   test("morning theme applies from local browser time", async ({ page }) => {
  1064 |     const errors = trackClientErrors(page);
  1065 | 
  1066 |     await setMockClientTime(page, "2026-04-25T08:00:00");
  1067 |     await primePublicLocation(page);
  1068 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1069 |     await page.goto("/");
  1070 | 
  1071 |     const shell = page.locator(".public-shell");
  1072 |     await expect(shell).toHaveAttribute("data-time-theme", "morning");
  1073 |     await expect(page.locator(".discovery-heading")).toBeVisible();
  1074 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1075 | 
  1076 |     await expectNoClientErrors(errors);
  1077 |   });
  1078 | 
  1079 |   test("afternoon theme applies from local browser time", async ({ page }) => {
  1080 |     const errors = trackClientErrors(page);
  1081 | 
  1082 |     await setMockClientTime(page, "2026-04-25T14:00:00");
  1083 |     await primePublicLocation(page);
  1084 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1085 |     await page.goto("/");
  1086 | 
  1087 |     const shell = page.locator(".public-shell");
  1088 |     await expect(shell).toHaveAttribute("data-time-theme", "afternoon");
  1089 |     await expect(page.locator(".discovery-heading")).toBeVisible();
  1090 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1091 | 
  1092 |     await expectNoClientErrors(errors);
  1093 |   });
  1094 | 
  1095 |   test("precise location falls back to coordinates when reverse geocoding fails", async ({ page }) => {
  1096 |     const errors = trackClientErrors(page);
  1097 | 
  1098 |     await primePublicLocation(page);
  1099 |     await mockReverseGeocode(page, null);
  1100 |     await page.goto("/");
  1101 | 
  1102 |     await expect(page.locator(".location-panel strong")).toHaveText("Using your current location");
  1103 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  1104 |       "9.08000, 7.40000",
```