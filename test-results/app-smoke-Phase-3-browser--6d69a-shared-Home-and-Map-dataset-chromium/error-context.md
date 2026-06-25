# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> mobile radius filters refetch and render the shared Home and Map dataset
- Location: tests/e2e/app-smoke.spec.ts:4958:3

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
  4955 |     await expectNoClientErrors(errors);
  4956 |   });
  4957 | 
  4958 |   test("mobile radius filters refetch and render the shared Home and Map dataset", async ({ page }) => {
  4959 |     const errors = trackClientErrors(page);
  4960 |     const requestUrls: string[] = [];
  4961 |     const radiusVendors: MockNearbyVendor[] = [
  4962 |       {
  4963 |         vendor_id: "5a000000-0000-4000-8000-000000000001",
  4964 |         name: "One Kilometer Akara",
  4965 |         slug: "one-kilometer-akara",
  4966 |         short_description: "Breakfast akara close to the search point.",
  4967 |         phone_number: "+2348000000201",
  4968 |         area: "Wuse",
  4969 |         latitude: 9.081,
  4970 |         longitude: 7.401,
  4971 |         price_band: "budget",
  4972 |         average_rating: 4.2,
  4973 |         review_count: 9,
  4974 |         distance_km: 0.8,
  4975 |         is_open_now: true,
  4976 |         featured_dish: {
  4977 |           dish_name: "Akara",
  4978 |           description: "Hot akara and pap",
  4979 |         },
  4980 |         today_hours: "7:00 AM - 12:00 PM",
  4981 |       },
  4982 |       {
  4983 |         vendor_id: "5a000000-0000-4000-8000-000000000002",
  4984 |         name: "Five Kilometer Rice",
  4985 |         slug: "five-kilometer-rice",
  4986 |         short_description: "Rice bowls inside the five kilometer radius.",
  4987 |         phone_number: "+2348000000202",
  4988 |         area: "Jabi",
  4989 |         latitude: 9.064,
  4990 |         longitude: 7.43,
  4991 |         price_band: "standard",
  4992 |         average_rating: 4.5,
  4993 |         review_count: 18,
  4994 |         distance_km: 3.4,
  4995 |         is_open_now: true,
  4996 |         featured_dish: {
  4997 |           dish_name: "Jollof rice",
  4998 |           description: "Jollof and chicken",
  4999 |         },
  5000 |         today_hours: "10:00 AM - 8:00 PM",
  5001 |       },
  5002 |       {
  5003 |         vendor_id: "5a000000-0000-4000-8000-000000000003",
  5004 |         name: "Ten Kilometer Suya",
  5005 |         slug: "ten-kilometer-suya",
  5006 |         short_description: "Suya stand inside the ten kilometer radius.",
  5007 |         phone_number: "+2348000000203",
  5008 |         area: "Utako",
  5009 |         latitude: 9.071,
  5010 |         longitude: 7.456,
  5011 |         price_band: "standard",
  5012 |         average_rating: 4.7,
  5013 |         review_count: 20,
  5014 |         distance_km: 8.2,
  5015 |         is_open_now: false,
  5016 |         featured_dish: {
  5017 |           dish_name: "Beef suya",
  5018 |           description: "Spiced suya",
  5019 |         },
  5020 |         today_hours: "5:00 PM - 11:00 PM",
  5021 |       },
  5022 |       {
  5023 |         vendor_id: "5a000000-0000-4000-8000-000000000004",
  5024 |         name: "Thirty Kilometer Grill",
  5025 |         slug: "thirty-kilometer-grill",
  5026 |         short_description: "Grill vendor only visible on wider radius.",
  5027 |         phone_number: "+2348000000204",
  5028 |         area: "Guzape",
  5029 |         latitude: 9.004,
  5030 |         longitude: 7.519,
  5031 |         price_band: "premium",
  5032 |         average_rating: 4.8,
  5033 |         review_count: 30,
  5034 |         distance_km: 22.5,
  5035 |         is_open_now: false,
  5036 |         featured_dish: {
  5037 |           dish_name: "Grilled chicken",
  5038 |           description: "Evening grill",
  5039 |         },
  5040 |         today_hours: "6:00 PM - 12:00 AM",
  5041 |       },
  5042 |     ];
  5043 | 
  5044 |     page.on("request", (request: Request) => {
  5045 |       if (request.url().includes("/api/vendors/nearby")) {
  5046 |         requestUrls.push(request.url());
  5047 |       }
  5048 |     });
  5049 | 
  5050 |     await page.setViewportSize({ width: 390, height: 844 });
  5051 |     await primePublicLocation(page);
  5052 |     await mockSearchableNearbyDiscovery(page, radiusVendors);
  5053 | 
  5054 |     await page.goto("/");
> 5055 |     await expect.poll(async () => page.locator(".vendor-card:visible").count()).toBe(3);
       |     ^ Error: expect(received).toBe(expected) // Object.is equality
  5056 | 
  5057 |     const homeFilters = page.getByTestId("mobile-home-filters");
  5058 |     await homeFilters.locator('button[aria-label="Open filters"]').click();
  5059 | 
  5060 |     const expectedVisibleCounts: Record<string, number> = {
  5061 |       "1": 1,
  5062 |       "5": 2,
  5063 |       "10": 3,
  5064 |       "30": 4,
  5065 |     };
  5066 | 
  5067 |     for (const radius of ["1", "5", "10", "30"]) {
  5068 |       const responsePromise = page.waitForResponse((response) => {
  5069 |         const url = new URL(response.url());
  5070 | 
  5071 |         return (
  5072 |           url.pathname === "/api/vendors/nearby" &&
  5073 |           url.searchParams.get("radius_km") === radius
  5074 |         );
  5075 |       });
  5076 | 
  5077 |       await homeFilters.locator('select[name="radiusKm"]').selectOption(radius);
  5078 |       await homeFilters.getByRole("button", { name: "Apply filters" }).click();
  5079 |       await responsePromise;
  5080 |       await expect(page.locator(".vendor-card:visible")).toHaveCount(expectedVisibleCounts[radius]);
  5081 | 
  5082 |       const openFiltersButton = homeFilters.locator('button[aria-label="Open filters"]');
  5083 |       if (await openFiltersButton.isVisible()) {
  5084 |         await openFiltersButton.click();
  5085 |       }
  5086 |     }
  5087 | 
  5088 |     expect(requestUrls.some((url) => url.includes("radius_km=1"))).toBe(true);
  5089 |     expect(requestUrls.some((url) => url.includes("radius_km=5"))).toBe(true);
  5090 |     expect(requestUrls.some((url) => url.includes("radius_km=10"))).toBe(true);
  5091 |     expect(requestUrls.some((url) => url.includes("radius_km=30"))).toBe(true);
  5092 | 
  5093 |     await openMobileDiscoveryTab(page, "map");
  5094 |     const mapFilters = page.getByTestId("mobile-map-filters");
  5095 |     await expect(mapFilters.locator('input[name="search"]')).toBeVisible();
  5096 |     await expect(mapFilters.locator('input[name="search"]')).toHaveValue("");
  5097 |     await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[3].vendor_id}"]`)).toBeVisible({
  5098 |       timeout: 10_000,
  5099 |     });
  5100 | 
  5101 |     await mapFilters.locator('button[aria-label="Open filters"]').click();
  5102 |     const mapResponsePromise = page.waitForResponse((response) => {
  5103 |       const url = new URL(response.url());
  5104 | 
  5105 |       return (
  5106 |         url.pathname === "/api/vendors/nearby" &&
  5107 |         url.searchParams.get("radius_km") === "5"
  5108 |       );
  5109 |     });
  5110 | 
  5111 |     await mapFilters.locator('select[name="radiusKm"]').selectOption("5");
  5112 |     await mapFilters.getByRole("button", { name: "Apply filters" }).click();
  5113 |     await mapResponsePromise;
  5114 |     await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[0].vendor_id}"]`)).toBeVisible();
  5115 |     await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[1].vendor_id}"]`)).toBeVisible();
  5116 |     await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[2].vendor_id}"]`)).toHaveCount(0);
  5117 |     await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[3].vendor_id}"]`)).toHaveCount(0);
  5118 | 
  5119 |     await openMobileDiscoveryTab(page, "home");
  5120 |     await expect(homeFilters.locator('select[name="radiusKm"]')).toHaveValue("5");
  5121 |     await expect(page.locator(".vendor-card:visible")).toHaveCount(2);
  5122 | 
  5123 |     await expectNoClientErrors(errors);
  5124 |   });
  5125 | 
  5126 |   test("mobile radius filters ignore stale wider-radius cached snapshots", async ({ page }) => {
  5127 |     const errors = trackClientErrors(page);
  5128 |     const cachedFarVendor: MockNearbyVendor = {
  5129 |       vendor_id: "5d000000-0000-4000-8000-000000000030",
  5130 |       name: "Cached Thirty Kilometer Suya",
  5131 |       slug: "cached-thirty-kilometer-suya",
  5132 |       short_description: "This stale cache entry should not survive a 1km radius restore.",
  5133 |       phone_number: "+2348000000210",
  5134 |       area: "Guzape",
  5135 |       latitude: 9.004,
  5136 |       longitude: 7.519,
  5137 |       price_band: "premium",
  5138 |       average_rating: 4.8,
  5139 |       review_count: 30,
  5140 |       distance_km: 22.5,
  5141 |       is_open_now: true,
  5142 |       featured_dish: {
  5143 |         dish_name: "Beef suya",
  5144 |         description: "Stale wide-radius vendor",
  5145 |       },
  5146 |       today_hours: "6:00 PM - 12:00 AM",
  5147 |     };
  5148 |     const liveNearVendor: MockNearbyVendor = {
  5149 |       vendor_id: "5d000000-0000-4000-8000-000000000001",
  5150 |       name: "Live One Kilometer Akara",
  5151 |       slug: "live-one-kilometer-akara",
  5152 |       short_description: "Fresh vendor inside the selected tight radius.",
  5153 |       phone_number: "+2348000000211",
  5154 |       area: "Wuse",
  5155 |       latitude: 9.081,
```