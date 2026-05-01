# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> precise location falls back to coordinates when reverse geocoding fails
- Location: tests/e2e/app-smoke.spec.ts:1095:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.location-panel strong')
Expected: "Using your current location"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('.location-panel strong')

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
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
> 1102 |     await expect(page.locator(".location-panel strong")).toHaveText("Using your current location");
       |                                                          ^ Error: expect(locator).toHaveText(expected) failed
  1103 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  1104 |       "9.08000, 7.40000",
  1105 |     );
  1106 |     await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
  1107 | 
  1108 |     await expectNoClientErrors(errors);
  1109 |   });
  1110 | 
  1111 |   test("unavailable location keeps fallback copy calm on desktop and mobile", async ({ page }) => {
  1112 |     const errors = trackClientErrors(page);
  1113 | 
  1114 |     await installMockGeolocation(page, {
  1115 |       kind: "error",
  1116 |       code: 2,
  1117 |       message: "Geolocation unavailable.",
  1118 |     });
  1119 |     await page.goto("/");
  1120 | 
  1121 |     await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
  1122 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  1123 |       "Turn on location for more accurate nearby vendors.",
  1124 |     );
  1125 |     await expect(page.locator(".location-trust-line")).toHaveCount(0);
  1126 |     await expect(page.getByText("Showing Abuja")).toHaveCount(0);
  1127 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1128 | 
  1129 |     await page.setViewportSize({ width: 390, height: 844 });
  1130 |     await page.reload();
  1131 | 
  1132 |     await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
  1133 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  1134 |       "Turn on location for more accurate nearby vendors.",
  1135 |     );
  1136 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1137 | 
  1138 |     await expectNoClientErrors(errors);
  1139 |   });
  1140 | 
  1141 |   test("tablet layout keeps map and list balanced", async ({ page }) => {
  1142 |     const errors = trackClientErrors(page);
  1143 | 
  1144 |     await page.setViewportSize({ width: 768, height: 1024 });
  1145 |     await primePublicLocation(page);
  1146 |     await page.goto("/");
  1147 | 
  1148 |     const layout = page.locator(".discovery-layout");
  1149 |     await expect(layout).toBeVisible();
  1150 |     await expect(page.locator(".discovery-map")).toBeVisible();
  1151 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  1152 |     const firstCard = page.locator(".vendor-card").first();
  1153 |     await expect(firstCard).toBeVisible();
  1154 | 
  1155 |     const layoutBox = await layout.boundingBox();
  1156 |     const mapBox = await page.locator(".discovery-map").boundingBox();
  1157 |     const sidebarBox = await page.locator(".discovery-sidebar").boundingBox();
  1158 | 
  1159 |     expect(layoutBox).not.toBeNull();
  1160 |     expect(mapBox).not.toBeNull();
  1161 |     expect(sidebarBox).not.toBeNull();
  1162 |     expect(mapBox?.width).toBeGreaterThan(0);
  1163 |     expect(sidebarBox?.width).toBeGreaterThan(0);
  1164 | 
  1165 |     const hasHorizontalOverflow = await page.evaluate(
  1166 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  1167 |     );
  1168 |     expect(hasHorizontalOverflow).toBe(false);
  1169 | 
  1170 |     await expectNoClientErrors(errors);
  1171 |   });
  1172 | 
  1173 |   test("keyboard focus is visible", async ({ page }) => {
  1174 |     const errors = trackClientErrors(page);
  1175 | 
  1176 |     await primePublicLocation(page);
  1177 |     await page.goto("/");
  1178 | 
  1179 |     let activeElementInfo = null as {
  1180 |       tagName: string | null;
  1181 |       outlineStyle: string | null;
  1182 |       outlineWidth: string | null;
  1183 |     } | null;
  1184 | 
  1185 |     for (let attempt = 0; attempt < 4; attempt += 1) {
  1186 |       activeElementInfo = await page.evaluate(() => {
  1187 |         const element = document.activeElement as HTMLElement | null;
  1188 | 
  1189 |         return {
  1190 |           tagName: element?.tagName ?? null,
  1191 |           outlineStyle: element ? getComputedStyle(element).outlineStyle : null,
  1192 |           outlineWidth: element ? getComputedStyle(element).outlineWidth : null,
  1193 |         };
  1194 |       });
  1195 | 
  1196 |       if (activeElementInfo.tagName && activeElementInfo.tagName !== "BODY") {
  1197 |         break;
  1198 |       }
  1199 | 
  1200 |       await page.keyboard.press("Tab");
  1201 |     }
  1202 | 
```