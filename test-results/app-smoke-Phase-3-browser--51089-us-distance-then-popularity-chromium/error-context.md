# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> nearby vendor cards rank open status, distance, then popularity
- Location: tests/e2e/app-smoke.spec.ts:3084:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 5
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
  3114 |         longitude: 7.401,
  3115 |         price_band: "standard",
  3116 |         average_rating: 4.1,
  3117 |         review_count: 9,
  3118 |         ranking_score: 50,
  3119 |         distance_km: 6,
  3120 |         is_open_now: true,
  3121 |         featured_dish: {
  3122 |           dish_name: "Rice",
  3123 |           description: null,
  3124 |         },
  3125 |         today_hours: "12:00 AM - 11:59 PM",
  3126 |       },
  3127 |       {
  3128 |         vendor_id: "40000000-0000-4000-8000-000000000003",
  3129 |         name: "Open Popular 1.3km",
  3130 |         slug: "open-popular-1-3km",
  3131 |         short_description: "Open similarly nearby popular vendor.",
  3132 |         phone_number: "+2348000000003",
  3133 |         area: "Maitama",
  3134 |         latitude: 9.083,
  3135 |         longitude: 7.403,
  3136 |         price_band: "premium",
  3137 |         average_rating: 4.8,
  3138 |         review_count: 40,
  3139 |         ranking_score: 12,
  3140 |         distance_km: 1.3,
  3141 |         is_open_now: true,
  3142 |         featured_dish: {
  3143 |           dish_name: "Suya",
  3144 |           description: null,
  3145 |         },
  3146 |         today_hours: "12:00 AM - 11:59 PM",
  3147 |       },
  3148 |       {
  3149 |         vendor_id: "40000000-0000-4000-8000-000000000002",
  3150 |         name: "Open Near 1km",
  3151 |         slug: "open-near-1km",
  3152 |         short_description: "Open nearby vendor.",
  3153 |         phone_number: "+2348000000002",
  3154 |         area: "Jabi",
  3155 |         latitude: 9.082,
  3156 |         longitude: 7.402,
  3157 |         price_band: "budget",
  3158 |         average_rating: 4.4,
  3159 |         review_count: 12,
  3160 |         ranking_score: 0,
  3161 |         distance_km: 1.2,
  3162 |         is_open_now: true,
  3163 |         featured_dish: {
  3164 |           dish_name: "Beans",
  3165 |           description: null,
  3166 |         },
  3167 |         today_hours: "12:00 AM - 11:59 PM",
  3168 |       },
  3169 |       {
  3170 |         vendor_id: "40000000-0000-4000-8000-000000000004",
  3171 |         name: "Closed Popular Close",
  3172 |         slug: "closed-popular-close",
  3173 |         short_description: "Closed popular vendor.",
  3174 |         phone_number: "+2348000000004",
  3175 |         area: "Garki",
  3176 |         latitude: 9.084,
  3177 |         longitude: 7.404,
  3178 |         price_band: "budget",
  3179 |         average_rating: 3.9,
  3180 |         review_count: 5,
  3181 |         ranking_score: 50,
  3182 |         distance_km: 0.5,
  3183 |         is_open_now: false,
  3184 |         featured_dish: {
  3185 |           dish_name: "Akara",
  3186 |           description: null,
  3187 |         },
  3188 |         today_hours: "Closed",
  3189 |       },
  3190 |       {
  3191 |         vendor_id: "40000000-0000-4000-8000-000000000005",
  3192 |         name: "Closed Near 2km",
  3193 |         slug: "closed-near-2km",
  3194 |         short_description: "Closed nearby vendor.",
  3195 |         phone_number: "+2348000000005",
  3196 |         area: "Utako",
  3197 |         latitude: 9.085,
  3198 |         longitude: 7.405,
  3199 |         price_band: "standard",
  3200 |         average_rating: 4,
  3201 |         review_count: 8,
  3202 |         ranking_score: 0,
  3203 |         distance_km: 2,
  3204 |         is_open_now: false,
  3205 |         featured_dish: {
  3206 |           dish_name: "Moi moi",
  3207 |           description: null,
  3208 |         },
  3209 |         today_hours: "Closed",
  3210 |       },
  3211 |     ]);
  3212 | 
  3213 |     await page.goto("/");
> 3214 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBe(5);
       |     ^ Error: expect(received).toBe(expected) // Object.is equality
  3215 | 
  3216 |     const beforeSelectionSnapshot = await readVendorCardStateSnapshot(page);
  3217 |     expect(beforeSelectionSnapshot.map((vendor) => vendor.name)).toEqual([
  3218 |       "Open Near 1km",
  3219 |       "Open Popular 1.3km",
  3220 |       "Open Far Popular 6km",
  3221 |       "Closed Popular Close",
  3222 |       "Closed Near 2km",
  3223 |     ]);
  3224 | 
  3225 |     await expect(
  3226 |       page.locator(".vendor-card").filter({ hasText: "Open Popular 1.3km" }).locator(".vendor-card-popular-badge"),
  3227 |     ).toHaveText("Popular nearby");
  3228 |     await expect(
  3229 |       page.locator(".vendor-card").filter({ hasText: "Closed Popular Close" }).locator(".vendor-card-popular-badge"),
  3230 |     ).toHaveText("Popular nearby");
  3231 | 
  3232 |     const middleOpenCard = page.locator(".vendor-card").filter({ hasText: "Open Near 1km" });
  3233 |     await middleOpenCard.getByRole("button", { name: /Preview .* on map/ }).click();
  3234 |     await expect(page.locator(".selected-vendor-panel")).toContainText("Open Near 1km");
  3235 | 
  3236 |     const afterSelectionSnapshot = await readVendorCardStateSnapshot(page);
  3237 |     expect(afterSelectionSnapshot.map((vendor) => vendor.name)).toEqual(
  3238 |       beforeSelectionSnapshot.map((vendor) => vendor.name),
  3239 |     );
  3240 |     expect(trackedBodies.some((body) => body.event_type === "vendor_selected")).toBe(true);
  3241 | 
  3242 |     await expectNoClientErrors(errors);
  3243 |   });
  3244 | 
  3245 |   test("cleanup invalidation prevents stale discovery snapshot and retention state from resurfacing deleted vendors", async ({ page }) => {
  3246 |     const errors = trackClientErrors(page);
  3247 |     const staleVendorId = "39999999-0000-4000-8000-000000000001";
  3248 |     const staleVendorSlug = "qa-admin-vendor-playwright-stale";
  3249 | 
  3250 |     await seedPublicDiscoverySnapshot(page.context(), {
  3251 |       snapshot: {
  3252 |         nearbyData: {
  3253 |           location: {
  3254 |             source: "precise",
  3255 |             label: "Current location",
  3256 |             coordinates: {
  3257 |               lat: 9.08,
  3258 |               lng: 7.4,
  3259 |             },
  3260 |             isApproximate: false,
  3261 |           },
  3262 |           vendors: [
  3263 |             {
  3264 |               vendor_id: staleVendorId,
  3265 |               name: "QA Admin Vendor PLAYWRIGHT_STALE",
  3266 |               slug: staleVendorSlug,
  3267 |               short_description: "Stale deleted vendor",
  3268 |               phone_number: "+2348000000099",
  3269 |               area: "Jabi",
  3270 |               latitude: 9.0606,
  3271 |               longitude: 7.4219,
  3272 |               price_band: "standard",
  3273 |               average_rating: 0,
  3274 |               review_count: 0,
  3275 |               ranking_score: 0,
  3276 |               distance_km: 1.1,
  3277 |               is_open_now: true,
  3278 |               featured_dish: {
  3279 |                 dish_name: "Old dish",
  3280 |                 description: null,
  3281 |               },
  3282 |               today_hours: "9:00 AM - 5:00 PM",
  3283 |             },
  3284 |           ],
  3285 |         },
  3286 |         nearbyDataUpdatedAt: "2026-05-07T17:00:00.000Z",
  3287 |         selectedVendorId: staleVendorId,
  3288 |         selectedVendorSlug: staleVendorSlug,
  3289 |         scrollY: 180,
  3290 |       },
  3291 |       invalidationPayload: {
  3292 |         reason: "vendor_cleanup",
  3293 |         vendorId: staleVendorId,
  3294 |         timestamp: "2026-05-07T17:01:00.000Z",
  3295 |       },
  3296 |       recentlyViewed: [
  3297 |         {
  3298 |           vendor_id: staleVendorId,
  3299 |           slug: staleVendorSlug,
  3300 |           name: "QA Admin Vendor PLAYWRIGHT_STALE",
  3301 |           area: "Jabi",
  3302 |           today_hours: "9:00 AM - 5:00 PM",
  3303 |           is_open_now: true,
  3304 |           timestamp: "2026-05-07T17:00:00.000Z",
  3305 |         },
  3306 |       ],
  3307 |       lastSelected: {
  3308 |         vendor_id: staleVendorId,
  3309 |         slug: staleVendorSlug,
  3310 |         name: "QA Admin Vendor PLAYWRIGHT_STALE",
  3311 |         area: "Jabi",
  3312 |         today_hours: "9:00 AM - 5:00 PM",
  3313 |         is_open_now: true,
  3314 |         timestamp: "2026-05-07T17:00:00.000Z",
```