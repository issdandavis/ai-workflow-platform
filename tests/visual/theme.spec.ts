/**
 * Visual Regression Tests
 * 
 * Captures and compares screenshots for visual consistency.
 */

import { test, expect } from "@playwright/test";

test.describe("Visual Theme Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  test("dark theme matches design", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(500); // Wait for theme transition
    
    await expect(page).toHaveScreenshot("dashboard-dark.png", {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test("light theme matches design", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot("dashboard-light.png", {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test("login page visual", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveScreenshot("login-page.png", {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test("sidebar visual", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toHaveScreenshot("sidebar.png", {
      maxDiffPixels: 50,
      threshold: 0.2,
    });
  });

  test("triskelion logo renders correctly", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    
    const logo = page.locator(".login-triskelion, .triskelion-logo").first();
    if (await logo.isVisible()) {
      await expect(logo).toHaveScreenshot("triskelion-logo.png", {
        maxDiffPixels: 20,
        threshold: 0.1,
      });
    }
  });
});

test.describe("Responsive Visual Tests", () => {
  const viewports = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    test(`dashboard at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/login");
      await page.click('button:has-text("Try Free")');
      await page.waitForURL(/\/(dashboard|projects)/);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        maxDiffPixels: 150,
        threshold: 0.2,
      });
    });
  }
});

test.describe("Component Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  test("header component", async ({ page }) => {
    await page.goto("/dashboard");
    const header = page.locator(".header, header").first();
    
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot("header.png", {
        maxDiffPixels: 50,
        threshold: 0.2,
      });
    }
  });

  test("card component", async ({ page }) => {
    await page.goto("/dashboard");
    const card = page.locator(".card, .mystical-card").first();
    
    if (await card.isVisible()) {
      await expect(card).toHaveScreenshot("card.png", {
        maxDiffPixels: 30,
        threshold: 0.2,
      });
    }
  });

  test("button styles", async ({ page }) => {
    await page.goto("/dashboard");
    const button = page.locator(".btn, button").first();
    
    if (await button.isVisible()) {
      await expect(button).toHaveScreenshot("button.png", {
        maxDiffPixels: 20,
        threshold: 0.2,
      });
    }
  });
});
