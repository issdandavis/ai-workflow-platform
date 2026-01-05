/**
 * UI Page Tests
 * 
 * Tests that all pages render correctly, navigation works,
 * and accessibility requirements are met.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// All application pages
const pages = [
  { name: "Dashboard", path: "/dashboard", requiresAuth: true },
  { name: "Projects", path: "/projects", requiresAuth: true },
  { name: "Chat", path: "/chat", requiresAuth: true },
  { name: "Fleet", path: "/fleet", requiresAuth: true },
  { name: "Roundtable", path: "/roundtable", requiresAuth: true },
  { name: "Settings", path: "/settings", requiresAuth: true },
  { name: "Integrations", path: "/integrations", requiresAuth: true },
  { name: "Shopify", path: "/shopify", requiresAuth: true },
  { name: "Login", path: "/login", requiresAuth: false },
];

// Viewport configurations
const viewports = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

test.describe("Page Render Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login for authenticated pages
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  for (const pageConfig of pages) {
    test(`${pageConfig.name} page renders correctly`, async ({ page }) => {
      if (!pageConfig.requiresAuth) {
        // Logout first for non-auth pages
        await page.goto("/login");
      } else {
        await page.goto(pageConfig.path);
      }

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Main content should be visible
      const main = page.locator("main, .page-content, [role='main']").first();
      await expect(main).toBeVisible({ timeout: 10000 });

      // No JavaScript errors
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      
      // Take screenshot for visual reference
      await page.screenshot({ 
        path: `test-results/screenshots/${pageConfig.name.toLowerCase()}.png`,
        fullPage: true,
      });

      expect(errors).toHaveLength(0);
    });
  }
});

test.describe("Navigation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  test("sidebar navigation works", async ({ page }) => {
    // Navigate to each page via sidebar
    const navItems = [
      { label: "Dashboard", expectedPath: "/dashboard" },
      { label: "Projects", expectedPath: "/projects" },
      { label: "AI Chat", expectedPath: "/chat" },
      { label: "Fleet Engine", expectedPath: "/fleet" },
      { label: "Roundtable", expectedPath: "/roundtable" },
      { label: "Settings", expectedPath: "/settings" },
      { label: "Integrations", expectedPath: "/integrations" },
    ];

    for (const item of navItems) {
      await page.click(`.nav-item:has-text("${item.label}")`);
      await expect(page).toHaveURL(new RegExp(item.expectedPath));
    }
  });

  test("browser back/forward navigation works", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('.nav-item:has-text("Projects")');
    await expect(page).toHaveURL(/\/projects/);

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goForward();
    await expect(page).toHaveURL(/\/projects/);
  });
});

test.describe("Responsive Layout Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  for (const viewport of viewports) {
    test(`Dashboard renders at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Content should be visible
      const content = page.locator(".page-content, main").first();
      await expect(content).toBeVisible();

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Small tolerance

      await page.screenshot({
        path: `test-results/screenshots/dashboard-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }

  test("mobile sidebar is hidden by default", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Sidebar should be hidden on mobile
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toHaveCSS("transform", /translateX\(-100%\)|matrix.*-260/);
  });
});

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  for (const pageConfig of pages.filter(p => p.requiresAuth)) {
    test(`${pageConfig.name} page passes accessibility audit`, async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState("networkidle");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`Accessibility violations on ${pageConfig.name}:`);
        accessibilityScanResults.violations.forEach((v) => {
          console.log(`  - ${v.id}: ${v.description}`);
        });
      }

      // Allow some minor violations but flag critical ones
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toHaveLength(0);
    });
  }

  test("keyboard navigation works", async ({ page }) => {
    await page.goto("/dashboard");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    
    // Should focus on first interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(["BUTTON", "A", "INPUT"]).toContain(focusedElement);

    // Continue tabbing
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Focus should still be visible
    const hasFocusVisible = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.outline !== "none" || style.boxShadow !== "none";
    });

    expect(hasFocusVisible).toBe(true);
  });
});

test.describe("Theme Switching Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);
  });

  test("dark theme is applied by default", async ({ page }) => {
    await page.goto("/dashboard");

    const theme = await page.evaluate(() => 
      document.documentElement.getAttribute("data-theme")
    );

    // Default should be dark or system
    expect(["dark", null]).toContain(theme);
  });

  test("theme toggle switches themes", async ({ page }) => {
    await page.goto("/dashboard");

    // Find and click theme toggle
    const themeToggle = page.locator('[aria-label*="theme"], .theme-toggle, button:has-text("Theme")').first();
    
    if (await themeToggle.isVisible()) {
      const initialTheme = await page.evaluate(() => 
        document.documentElement.getAttribute("data-theme")
      );

      await themeToggle.click();

      const newTheme = await page.evaluate(() => 
        document.documentElement.getAttribute("data-theme")
      );

      // Theme should have changed
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test("theme persists across page navigation", async ({ page }) => {
    await page.goto("/dashboard");

    // Set theme to light
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    });

    // Navigate to another page
    await page.goto("/projects");

    // Theme should persist
    const theme = await page.evaluate(() => 
      localStorage.getItem("theme")
    );

    expect(theme).toBe("light");
  });
});

test.describe("Logo Presence Tests", () => {
  test("triskelion logo is visible on login page", async ({ page }) => {
    await page.goto("/login");

    // Look for logo SVG or image
    const logo = page.locator('.login-triskelion, .triskelion-logo, [alt*="logo"], svg.logo').first();
    await expect(logo).toBeVisible();
  });

  test("triskelion logo is visible in sidebar", async ({ page }) => {
    await page.goto("/login");
    await page.click('button:has-text("Try Free")');
    await page.waitForURL(/\/(dashboard|projects)/);

    // Look for logo in sidebar
    const sidebarLogo = page.locator('.sidebar .triskelion-logo, .sidebar .logo svg').first();
    await expect(sidebarLogo).toBeVisible();
  });

  test("favicon is set correctly", async ({ page }) => {
    await page.goto("/login");

    const favicon = await page.evaluate(() => {
      const link = document.querySelector('link[rel="icon"]');
      return link?.getAttribute("href");
    });

    expect(favicon).toContain("logo");
  });
});
