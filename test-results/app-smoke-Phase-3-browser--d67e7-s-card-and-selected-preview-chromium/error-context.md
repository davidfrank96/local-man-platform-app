# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> selection keeps open and closed status consistent across card and selected preview
- Location: tests/e2e/app-smoke.spec.ts:2870:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 3
Received: 0

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e4]:
    - generic [ref=e5]:
      - heading "Localman needs to reload to continue." [level=1] [ref=e6]
      - paragraph [ref=e7]: Your live marketplace data will refresh when the app reloads.
      - button "Reload Localman" [ref=e8] [cursor=pointer]
  - generic [ref=e13] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e14]:
      - img [ref=e15]
    - generic [ref=e18]:
      - button "Open issues overlay" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]: "0"
          - generic [ref=e22]: "1"
        - generic [ref=e23]: Issue
      - button "Collapse issues badge" [ref=e24]:
        - img [ref=e25]
  - alert [ref=e27]
```

# Test source

```ts
  2841 |     await page.goto("/");
  2842 | 
  2843 |     await expect(page.getByText("Browsing: Wuse")).toBeVisible();
  2844 |     await expect(page.locator(".location-panel p")).toHaveCount(0);
  2845 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  2846 |     await expect(page.locator(".vendor-section-pane").first()).toBeVisible();
  2847 | 
  2848 |     await setMockGeolocationMode(page, {
  2849 |       kind: "success",
  2850 |       lat: 9.08,
  2851 |       lng: 7.4,
  2852 |     });
  2853 | 
  2854 |     await page.getByRole("button", { name: "Use My Location" }).click();
  2855 | 
  2856 |     await expect(page.locator(".location-panel strong")).toHaveText(
  2857 |       "Using your current location",
  2858 |     );
  2859 |     await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
  2860 |     await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
  2861 |     await expect(page.locator(".location-panel p")).toHaveCount(0);
  2862 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  2863 | 
  2864 |     expect(nearbyUrls.some((url) => !url.includes("lat=") && !url.includes("lng="))).toBe(false);
  2865 |     expect(nearbyUrls.some((url) => url.includes("lat=") && url.includes("lng="))).toBe(true);
  2866 | 
  2867 |     await expectNoClientErrors(errors);
  2868 |   });
  2869 | 
  2870 |   test("selection keeps open and closed status consistent across card and selected preview", async ({ page }) => {
  2871 |     const errors = trackClientErrors(page);
  2872 | 
  2873 |     await setMockClientTime(page, "2026-04-25T13:04:00Z");
  2874 |     await primePublicLocation(page);
  2875 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  2876 |     await mockNearbyDiscovery(page, [
  2877 |       {
  2878 |         vendor_id: "30000000-0000-4000-8000-000000000001",
  2879 |         name: "Closed Sunday Lunch Bowl",
  2880 |         slug: "closed-sunday-lunch-bowl",
  2881 |         short_description: "Closed vendor regression case.",
  2882 |         phone_number: "+2348000000001",
  2883 |         area: "Jabi",
  2884 |         latitude: 9.0606,
  2885 |         longitude: 7.4219,
  2886 |         price_band: "standard",
  2887 |         average_rating: 0,
  2888 |         review_count: 0,
  2889 |         distance_km: 3.11,
  2890 |         is_open_now: false,
  2891 |         featured_dish: {
  2892 |           dish_name: "Rice bowl",
  2893 |           description: null,
  2894 |         },
  2895 |         today_hours: "Closed today",
  2896 |         active_hours: "Closed today",
  2897 |       },
  2898 |       {
  2899 |         vendor_id: "30000000-0000-4000-8000-000000000002",
  2900 |         name: "Opens Later Rice Corner",
  2901 |         slug: "opens-later-rice-corner",
  2902 |         short_description: "Future open regression case.",
  2903 |         phone_number: "+2348000000002",
  2904 |         area: "Jabi",
  2905 |         latitude: 9.0643,
  2906 |         longitude: 7.4291,
  2907 |         price_band: "standard",
  2908 |         average_rating: 4.2,
  2909 |         review_count: 11,
  2910 |         distance_km: 4.02,
  2911 |         is_open_now: false,
  2912 |         featured_dish: {
  2913 |           dish_name: "Jollof rice",
  2914 |           description: null,
  2915 |         },
  2916 |         today_hours: "5:00 PM - 10:00 PM",
  2917 |       },
  2918 |       {
  2919 |         vendor_id: "30000000-0000-4000-8000-000000000003",
  2920 |         name: "Open Evening Grill",
  2921 |         slug: "open-evening-grill",
  2922 |         short_description: "Open vendor regression case.",
  2923 |         phone_number: "+2348000000003",
  2924 |         area: "Wuse",
  2925 |         latitude: 9.071,
  2926 |         longitude: 7.43,
  2927 |         price_band: "premium",
  2928 |         average_rating: 4.7,
  2929 |         review_count: 32,
  2930 |         distance_km: 2.45,
  2931 |         is_open_now: true,
  2932 |         featured_dish: {
  2933 |           dish_name: "Grilled chicken",
  2934 |           description: null,
  2935 |         },
  2936 |         today_hours: "10:00 AM - 11:00 PM",
  2937 |       },
  2938 |     ]);
  2939 | 
  2940 |     await page.goto("/");
> 2941 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBe(3);
       |     ^ Error: expect(received).toBe(expected) // Object.is equality
  2942 | 
  2943 |     const beforeSelectionSnapshot = await readVendorCardStateSnapshot(page);
  2944 | 
  2945 |     const closedCard = page.locator(".vendor-card").filter({ hasText: "Closed Sunday Lunch Bowl" });
  2946 |     await expect(closedCard.locator(".vendor-card-status-line")).toContainText("Closed");
  2947 |     await expect(closedCard.locator(".vendor-card-hours-line")).toContainText("Closed today");
  2948 |     await closedCard.getByRole("button", { name: /Preview .* on map/ }).click();
  2949 |     await expect(closedCard.locator(".vendor-card-status-line")).toContainText("Closed");
  2950 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Closed");
  2951 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-hours-line")).toContainText("Closed today");
  2952 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("3.1 km");
  2953 | 
  2954 |     const laterCard = page.locator(".vendor-card").filter({ hasText: "Opens Later Rice Corner" });
  2955 |     await expect(laterCard.locator(".vendor-card-status-line")).toContainText("Closed");
  2956 |     await laterCard.getByRole("button", { name: /Preview .* on map/ }).click();
  2957 |     await expect(laterCard.locator(".vendor-card-status-line")).toContainText("Closed");
  2958 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Closed");
  2959 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-hours-line")).toContainText("5:00 PM - 10:00 PM");
  2960 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("4.0 km");
  2961 | 
  2962 |     const openCard = page.locator(".vendor-card").filter({ hasText: "Open Evening Grill" });
  2963 |     await expect(openCard.locator(".vendor-card-status-line")).toContainText("Open");
  2964 |     await openCard.getByRole("button", { name: /Preview .* on map/ }).click();
  2965 |     await expect(openCard.locator(".vendor-card-status-line")).toContainText("Open");
  2966 |     await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Open");
  2967 | 
  2968 |     const afterSelectionSnapshot = await readVendorCardStateSnapshot(page);
  2969 |     expect(afterSelectionSnapshot).toEqual(beforeSelectionSnapshot);
  2970 | 
  2971 |     await expectNoClientErrors(errors);
  2972 |   });
  2973 | 
  2974 |   test("discovery state restores after vendor detail back navigation", async ({ page }) => {
  2975 |     const errors = trackClientErrors(page);
  2976 | 
  2977 |     await page.setViewportSize({ width: 390, height: 844 });
  2978 |     await primePublicLocation(page);
  2979 |     await page.goto("/");
  2980 | 
  2981 |     await page.getByRole("textbox", { name: "Search" }).fill("rice");
  2982 |     await openDiscoveryFilters(page);
  2983 |     await page.locator('select[name="radiusKm"]:visible').selectOption("30");
  2984 |     const applyButton = page.locator('button:has-text("Apply"):visible');
  2985 |     await applyButton.scrollIntoViewIfNeeded();
  2986 |     await applyButton.click();
  2987 | 
  2988 |     await expect(page).toHaveURL(/q=rice/);
  2989 |     await expect(page).toHaveURL(/radius_km=30/);
  2990 | 
  2991 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  2992 |     const firstCard = page.locator(".vendor-card").first();
  2993 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  2994 |     await expect(firstCard).toHaveClass(/selected/);
  2995 | 
  2996 |     await openMobileDiscoveryTab(page, "map");
  2997 |     await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
  2998 |     await openMobileDiscoveryTab(page, "home");
  2999 |     await expect(page).toHaveURL(/q=rice/);
  3000 |     await expect(page).toHaveURL(/radius_km=30/);
  3001 | 
  3002 |     await firstCard.getByRole("link", { name: "View details →" }).click();
  3003 |     await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);
  3004 | 
  3005 |     await page.goBack();
  3006 | 
  3007 |     await expect(page).toHaveURL(/q=rice/);
  3008 |     await expect(page).toHaveURL(/radius_km=30/);
  3009 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  3010 |     await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
  3011 |     await openDiscoveryFilters(page);
  3012 |     await expect(page.locator('select[name="radiusKm"]:visible')).toHaveValue("30");
  3013 |     await openMobileDiscoveryTab(page, "map");
  3014 |     await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
  3015 |     await expectUniqueMapVendorMarkers(page);
  3016 |     await openMobileDiscoveryTab(page, "home");
  3017 | 
  3018 |     const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
  3019 |     await expect(restoredApplyButton).toBeEnabled();
  3020 |     await page.getByRole("textbox", { name: "Search" }).fill("grill");
  3021 |     await restoredApplyButton.click();
  3022 | 
  3023 |     await expect(page).toHaveURL(/q=grill/);
  3024 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  3025 |     await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
  3026 | 
  3027 |     await expectNoClientErrors(errors);
  3028 |   });
  3029 | 
  3030 |   test("back to map link restores discovery state", async ({ page }) => {
  3031 |     const errors = trackClientErrors(page);
  3032 | 
  3033 |     await page.setViewportSize({ width: 390, height: 844 });
  3034 |     await primePublicLocation(page);
  3035 |     await page.goto("/");
  3036 | 
  3037 |     await page.getByRole("textbox", { name: "Search" }).fill("rice");
  3038 |     await openDiscoveryFilters(page);
  3039 |     await page.locator('select[name="radiusKm"]:visible').selectOption("30");
  3040 |     const applyButton = page.locator('button:has-text("Apply"):visible');
  3041 |     await applyButton.scrollIntoViewIfNeeded();
```