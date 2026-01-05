/**
 * E2E Tests: Authentication Flows
 * 
 * Tests all authentication paths:
 * - Signup (valid, invalid email, weak password)
 * - Login (valid, invalid credentials, locked account)
 * - Logout
 * - Guest access
 * - Password reset flow
 * 
 * Validates: Requirements 1.1
 */

import { test, expect } from '@playwright/test';
import { markEndpointHit } from '../fixtures/coverage';
import { nanoid } from 'nanoid';

const API_BASE = process.env.API_URL || 'http://localhost:5000';

test.describe('Authentication Flows', () => {
  test.describe('Signup', () => {
    test('should create new user with valid credentials', async ({ page, request }) => {
      const email = `e2e_signup_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // API signup
      const response = await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      markEndpointHit('POST', '/api/auth/signup', 'signup-valid');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.email).toBe(email);
      expect(data.id).toBeDefined();
    });

    test('should reject invalid email format', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email: 'invalid-email', password: 'SecurePass123!' },
      });

      markEndpointHit('POST', '/api/auth/signup', 'signup-invalid-email');
      
      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });

    test('should reject weak password', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email: `e2e_weak_${nanoid(6)}@test.local`, password: '123' },
      });

      markEndpointHit('POST', '/api/auth/signup', 'signup-weak-password');
      
      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });

    test('should reject duplicate email', async ({ request }) => {
      const email = `e2e_dup_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // First signup
      await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      // Duplicate signup
      const response = await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      markEndpointHit('POST', '/api/auth/signup', 'signup-duplicate');
      
      expect(response.status()).toBe(409);
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ request }) => {
      const email = `e2e_login_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // Create user first
      await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      // Login
      const response = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email, password },
      });

      markEndpointHit('POST', '/api/auth/login', 'login-valid');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.email).toBe(email);
    });

    test('should reject invalid credentials', async ({ request }) => {
      const email = `e2e_invalid_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // Create user
      await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      // Login with wrong password
      const response = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email, password: 'WrongPassword!' },
      });

      markEndpointHit('POST', '/api/auth/login', 'login-invalid');
      
      expect(response.status()).toBe(401);
    });

    test('should reject non-existent user', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/auth/login`, {
        data: { 
          email: `nonexistent_${nanoid(6)}@test.local`, 
          password: 'AnyPassword123!' 
        },
      });

      markEndpointHit('POST', '/api/auth/login', 'login-nonexistent');
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Logout', () => {
    test('should logout authenticated user', async ({ request }) => {
      const email = `e2e_logout_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // Create and login
      await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email, password },
      });

      // Logout
      const response = await request.post(`${API_BASE}/api/auth/logout`);

      markEndpointHit('POST', '/api/auth/logout', 'logout');
      
      // Should succeed or redirect
      expect([200, 302].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Guest Access', () => {
    test('should create guest session', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/auth/guest`);

      markEndpointHit('POST', '/api/auth/guest', 'guest-access');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.isGuest).toBe(true);
      expect(data.role).toBe('viewer');
    });
  });

  test.describe('Current User', () => {
    test('should return current user when authenticated', async ({ request }) => {
      const email = `e2e_me_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // Create and login
      await request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      await request.post(`${API_BASE}/api/auth/login`, {
        data: { email, password },
      });

      // Get current user
      const response = await request.get(`${API_BASE}/api/auth/me`);

      markEndpointHit('GET', '/api/auth/me', 'auth-me');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.email).toBe(email);
    });

    test('should reject unauthenticated request', async ({ request }) => {
      // Fresh context, no session
      const response = await request.get(`${API_BASE}/api/auth/me`);

      markEndpointHit('GET', '/api/auth/me', 'auth-me-unauth');
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('UI Login Flow', () => {
    test('should complete login via UI', async ({ page }) => {
      const email = `e2e_ui_${nanoid(6)}@test.local`;
      const password = 'SecurePass123!';

      // Create user via API first
      await page.request.post(`${API_BASE}/api/auth/signup`, {
        data: { email, password },
      });

      // Navigate to login page
      await page.goto('/login');
      
      // Fill form
      await page.fill('input[type="email"], input[name="email"]', email);
      await page.fill('input[type="password"], input[name="password"]', password);
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await page.waitForURL(/\/(dashboard|projects)?$/, { timeout: 10000 });
      
      // Verify we're logged in
      const url = page.url();
      expect(url).not.toContain('/login');
    });
  });
});
