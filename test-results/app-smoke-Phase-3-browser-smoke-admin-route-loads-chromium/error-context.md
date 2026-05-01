# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> admin route loads
- Location: tests/e2e/app-smoke.spec.ts:834:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Admin login' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Admin login' })

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  738 |     await primePublicLocation(page);
  739 |     await page.goto("/");
  740 | 
  741 |     await page.getByRole("textbox", { name: "Search" }).fill("rice");
  742 |     await openDiscoveryFilters(page);
  743 |     await page.locator('select[name="radiusKm"]:visible').selectOption("30");
  744 |     const applyButton = page.locator('button:has-text("Apply"):visible');
  745 |     await applyButton.scrollIntoViewIfNeeded();
  746 |     await applyButton.click();
  747 | 
  748 |     await expect(page).toHaveURL(/q=rice/);
  749 |     await expect(page).toHaveURL(/radius_km=30/);
  750 | 
  751 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  752 |     const firstCard = page.locator(".vendor-card").first();
  753 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  754 |     await expect(firstCard).toHaveClass(/selected/);
  755 | 
  756 |     await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
  757 |     await expect(page).toHaveURL(/q=rice/);
  758 |     await expect(page).toHaveURL(/radius_km=30/);
  759 | 
  760 |     await firstCard.getByRole("link", { name: "View details →" }).click();
  761 |     await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);
  762 | 
  763 |     await page.goBack();
  764 | 
  765 |     await expect(page).toHaveURL(/q=rice/);
  766 |     await expect(page).toHaveURL(/radius_km=30/);
  767 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  768 |     await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
  769 |     await openDiscoveryFilters(page);
  770 |     await expect(page.locator('select[name="radiusKm"]:visible')).toHaveValue("30");
  771 |     await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
  772 |     await expectUniqueMapVendorMarkers(page);
  773 | 
  774 |     const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
  775 |     await expect(restoredApplyButton).toBeEnabled();
  776 |     await page.getByRole("textbox", { name: "Search" }).fill("grill");
  777 |     await restoredApplyButton.click();
  778 | 
  779 |     await expect(page).toHaveURL(/q=grill/);
  780 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  781 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
  782 | 
  783 |     await expectNoClientErrors(errors);
  784 |   });
  785 | 
  786 |   test("back to map link restores discovery state", async ({ page }) => {
  787 |     const errors = trackClientErrors(page);
  788 | 
  789 |     await page.setViewportSize({ width: 390, height: 844 });
  790 |     await primePublicLocation(page);
  791 |     await page.goto("/");
  792 | 
  793 |     await page.getByRole("textbox", { name: "Search" }).fill("rice");
  794 |     await openDiscoveryFilters(page);
  795 |     await page.locator('select[name="radiusKm"]:visible').selectOption("30");
  796 |     await page.locator('button:has-text("Apply"):visible').click();
  797 | 
  798 |     await expect(page).toHaveURL(/q=rice/);
  799 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  800 | 
  801 |     const firstCard = page.locator(".vendor-card").first();
  802 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  803 |     await expect(firstCard).toHaveClass(/selected/);
  804 |     const selectedVendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
  805 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");
  806 | 
  807 |     await firstCard.getByRole("link", { name: "View details →" }).click();
  808 |     await expect(page).toHaveURL(/returnTo=/);
  809 | 
  810 |     await page.getByRole("link", { name: "Back to map" }).click();
  811 | 
  812 |     await expect(page).toHaveURL(/q=rice/);
  813 |     await expect(page).toHaveURL(/radius_km=30/);
  814 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  815 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  816 |     await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
  817 |     await openDiscoveryFilters(page);
  818 |     await expect(page.locator('select[name="radiusKm"]:visible')).toHaveValue("30");
  819 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");
  820 |     await expectUniqueMapVendorMarkers(page);
  821 | 
  822 |     const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
  823 |     await expect(restoredApplyButton).toBeEnabled();
  824 |     await page.locator('select[name="priceBand"]:visible').selectOption("budget");
  825 |     await restoredApplyButton.click();
  826 | 
  827 |     await expect(page).toHaveURL(/price_band=budget/);
  828 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  829 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
  830 | 
  831 |     await expectNoClientErrors(errors);
  832 |   });
  833 | 
  834 |   test("admin route loads", async ({ page }) => {
  835 |     const errors = trackClientErrors(page);
  836 | 
  837 |     await page.goto("/admin");
> 838 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  839 |     await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  840 |     await expect(page.getByLabel("Password")).toBeVisible();
  841 | 
  842 |     await expectNoClientErrors(errors);
  843 |   });
  844 | 
  845 |   test("admin vendors route loads behind auth", async ({ page }) => {
  846 |     const errors = trackClientErrors(page);
  847 | 
  848 |     await page.goto("/admin/vendors");
  849 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  850 |     await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  851 | 
  852 |     await expectNoClientErrors(errors);
  853 |   });
  854 | 
  855 |   test("admin analytics route loads behind auth", async ({ page }) => {
  856 |     const errors = trackClientErrors(page);
  857 | 
  858 |     await page.goto("/admin/analytics");
  859 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  860 |     await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  861 | 
  862 |     await expectNoClientErrors(errors);
  863 |   });
  864 | 
  865 |   test("admin create vendor route loads behind auth", async ({ page }) => {
  866 |     const errors = trackClientErrors(page);
  867 | 
  868 |     await page.goto("/admin/vendors/new");
  869 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  870 |     await expect(page.getByLabel("Password")).toBeVisible();
  871 | 
  872 |     await expectNoClientErrors(errors);
  873 |   });
  874 | 
  875 |   test("admin edit vendor route loads behind auth", async ({ page }) => {
  876 |     const errors = trackClientErrors(page);
  877 | 
  878 |     await page.goto("/admin/vendors/00000000-0000-4000-8000-000000000001");
  879 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  880 |     await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  881 | 
  882 |     await expectNoClientErrors(errors);
  883 |   });
  884 | 
  885 |   test("mobile homepage keeps core content visible", async ({ page }) => {
  886 |     const errors = trackClientErrors(page);
  887 | 
  888 |     await page.setViewportSize({ width: 390, height: 844 });
  889 |     await primePublicLocation(page);
  890 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  891 |     await page.goto("/");
  892 | 
  893 |     await expect(page.locator(".discovery-map")).toBeVisible();
  894 |     await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
  895 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  896 | 
  897 |     const hasHorizontalOverflow = await page.evaluate(
  898 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  899 |     );
  900 |     expect(hasHorizontalOverflow).toBe(false);
  901 | 
  902 |     await expectNoClientErrors(errors);
  903 |   });
  904 | 
  905 |   test("mobile discovery keeps header, filters, map, selected preview, and list in the correct order", async ({ page }) => {
  906 |     const errors = trackClientErrors(page);
  907 | 
  908 |     await page.setViewportSize({ width: 390, height: 844 });
  909 |     await primePublicLocation(page);
  910 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  911 |     await page.goto("/");
  912 | 
  913 |     const firstCard = page.locator(".vendor-card").first();
  914 |     const firstVendorId = await firstCard.getAttribute("data-vendor-id");
  915 |     expect(firstVendorId).toBeTruthy();
  916 | 
  917 |     await clickVendorOnMap(page, firstVendorId!);
  918 | 
  919 |     const headerTop = await topPosition(page.locator(".discovery-heading"));
  920 |     const filtersTop = await topPosition(page.locator(".mobile-discovery-filters"));
  921 |     const mapTop = await topPosition(page.locator(".discovery-map"));
  922 |     const selectedTop = await topPosition(page.locator(".selected-vendor-panel"));
  923 |     const firstCardTop = await topPosition(firstCard);
  924 | 
  925 |     expect(headerTop).toBeLessThan(filtersTop);
  926 |     expect(filtersTop).toBeLessThan(mapTop);
  927 |     expect(mapTop).toBeLessThan(selectedTop);
  928 |     expect(selectedTop).toBeLessThan(firstCardTop);
  929 | 
  930 |     await expectNoClientErrors(errors);
  931 |   });
  932 | 
  933 |   test("mobile map marker selection surfaces the selected vendor preview and card selection keeps map focus", async ({ page }) => {
  934 |     const errors = trackClientErrors(page);
  935 | 
  936 |     await page.setViewportSize({ width: 390, height: 844 });
  937 |     await primePublicLocation(page);
  938 |     await mockReverseGeocode(page, "Wuse II, Abuja");
```