import { expect, test, type Page } from "@playwright/test";

function trackClientErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

async function expectNoClientErrors(errors: string[]) {
  expect(errors, errors.join("\n")).toEqual([]);
}

test.describe("Phase 3 browser smoke", () => {
  test("homepage loads, vendor cards render, and details are clickable", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The Local Man" })).toBeVisible();
    await expect(page.locator(".discovery-layout")).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await page.locator(".vendor-card").first().getByRole("link", { name: "Details" }).click();

    await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("vendor detail page loads successfully", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/vendors/jabi-office-lunch-bowl");
    await expect(page.getByRole("heading", { name: "Jabi Office Lunch Bowl" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(page.locator(".vendor-detail-image")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("search route works", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/search?q=rice");
    await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await expect(page.locator(".discovery-layout")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin route loads", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Runtime token" })).toBeVisible();
    await expect(page.getByLabel("Supabase access token")).toBeVisible();
    await expect(page.getByRole("button", { name: "Load vendors" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("mobile homepage keeps core content visible", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("small phone layout stays readable", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/");

    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("tablet layout keeps map and list balanced", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const layout = page.locator(".discovery-layout");
    await expect(layout).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    const layoutBox = await layout.boundingBox();
    const mapBox = await page.locator(".discovery-map").boundingBox();
    const sidebarBox = await page.locator(".discovery-sidebar").boundingBox();

    expect(layoutBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();
    expect(mapBox?.width).toBeGreaterThan(0);
    expect(sidebarBox?.width).toBeGreaterThan(0);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("keyboard focus is visible", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/");

    let activeElementInfo = null as {
      tagName: string | null;
      outlineStyle: string | null;
      outlineWidth: string | null;
    } | null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      activeElementInfo = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;

        return {
          tagName: element?.tagName ?? null,
          outlineStyle: element ? getComputedStyle(element).outlineStyle : null,
          outlineWidth: element ? getComputedStyle(element).outlineWidth : null,
        };
      });

      if (activeElementInfo.tagName && activeElementInfo.tagName !== "BODY") {
        break;
      }

      await page.keyboard.press("Tab");
    }

    expect(activeElementInfo).not.toBeNull();
    expect(activeElementInfo?.tagName).not.toBe("BODY");
    expect(activeElementInfo?.outlineStyle).not.toBe("none");
    expect(activeElementInfo?.outlineWidth).not.toBe("0px");

    await expectNoClientErrors(errors);
  });
});
