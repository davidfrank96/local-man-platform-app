# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> back to map link restores discovery state
- Location: tests/e2e/app-smoke.spec.ts:786:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: 'Search' })

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  693 |           dish_name: "Grilled chicken",
  694 |           description: null,
  695 |         },
  696 |         today_hours: "10:00 AM - 11:00 PM",
  697 |       },
  698 |     ]);
  699 | 
  700 |     await page.goto("/");
  701 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBe(3);
  702 | 
  703 |     const beforeSelectionSnapshot = await readVendorCardStateSnapshot(page);
  704 | 
  705 |     const closedCard = page.locator(".vendor-card").filter({ hasText: "Closed Sunday Lunch Bowl" });
  706 |     await expect(closedCard.locator(".vendor-card-status-line")).toContainText("Closed");
  707 |     await expect(closedCard.locator(".vendor-card-hours-line")).toContainText("Closed");
  708 |     await closedCard.getByRole("button", { name: /Preview .* on map/ }).click();
  709 |     await expect(closedCard.locator(".vendor-card-status-line")).toContainText("Closed");
  710 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Closed");
  711 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-hours-line")).toContainText("Closed");
  712 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("3.1 km");
  713 | 
  714 |     const laterCard = page.locator(".vendor-card").filter({ hasText: "Opens Later Rice Corner" });
  715 |     await expect(laterCard.locator(".vendor-card-status-line")).toContainText("Closed");
  716 |     await laterCard.getByRole("button", { name: /Preview .* on map/ }).click();
  717 |     await expect(laterCard.locator(".vendor-card-status-line")).toContainText("Closed");
  718 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Closed");
  719 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-hours-line")).toContainText("5:00 PM - 10:00 PM");
  720 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("4.0 km");
  721 | 
  722 |     const openCard = page.locator(".vendor-card").filter({ hasText: "Open Evening Grill" });
  723 |     await expect(openCard.locator(".vendor-card-status-line")).toContainText("Open");
  724 |     await openCard.getByRole("button", { name: /Preview .* on map/ }).click();
  725 |     await expect(openCard.locator(".vendor-card-status-line")).toContainText("Open");
  726 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Open");
  727 | 
  728 |     const afterSelectionSnapshot = await readVendorCardStateSnapshot(page);
  729 |     expect(afterSelectionSnapshot).toEqual(beforeSelectionSnapshot);
  730 | 
  731 |     await expectNoClientErrors(errors);
  732 |   });
  733 | 
  734 |   test("discovery state restores after vendor detail back navigation", async ({ page }) => {
  735 |     const errors = trackClientErrors(page);
  736 | 
  737 |     await page.setViewportSize({ width: 390, height: 844 });
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
> 793 |     await page.getByRole("textbox", { name: "Search" }).fill("rice");
      |                                                         ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  838 |     await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
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
```