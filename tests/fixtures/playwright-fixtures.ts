/**
 * Playwright Test Fixtures
 * 
 * Custom fixtures for authenticated pages and test data.
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import { TestContext } from './TestContext';

interface TestFixtures {
  testContext: TestContext;
  authenticatedPage: Page;
  testUser: { email: string; password: string };
}

export const test = base.extend<TestFixtures>({
  testContext: async ({}, use) => {
    const ctx = new TestContext();
    await use(ctx);
    await ctx.cleanup();
  },

  testUser: async ({ testContext }, use) => {
    const user = await testContext.createUser();
    await use({ email: user.email, password: user.password });
  },

  authenticatedPage: async ({ page, testContext }, use) => {
    // Create user and login
    const user = await testContext.createUser();
    
    // Navigate to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"], input[name="email"], [data-testid="email-input"]', user.email);
    await page.fill('input[type="password"], input[name="password"], [data-testid="password-input"]', user.password);
    
    // Submit
    await page.click('button[type="submit"], [data-testid="login-button"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/(dashboard|projects|$)/, { timeout: 10000 });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';

// Helper to login programmatically via API
export async function loginViaApi(
  context: BrowserContext, 
  email: string, 
  password: string
): Promise<void> {
  const response = await context.request.post('/api/auth/login', {
    data: { email, password },
  });
  
  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()}`);
  }
}

// Helper to create user via API
export async function createUserViaApi(
  context: BrowserContext,
  email: string,
  password: string
): Promise<{ id: string; email: string }> {
  const response = await context.request.post('/api/auth/signup', {
    data: { email, password },
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Signup failed: ${error.error}`);
  }
  
  return response.json();
}
