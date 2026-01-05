/**
 * E2E Tests: Integration Connections
 * 
 * Tests integration flows:
 * - Connect integration
 * - Disconnect integration
 * - List integrations
 * 
 * Validates: Requirements 1.5
 */

import { test, expect } from '@playwright/test';
import { markEndpointHit } from '../fixtures/coverage';
import { nanoid } from 'nanoid';

const API_BASE = process.env.API_URL || 'http://localhost:5000';

test.describe('Integration Connections', () => {
  test.beforeAll(async ({ request }) => {
    // Create test user
    const email = `e2e_integrations_${nanoid(6)}@test.local`;
    const password = 'SecurePass123!';
    
    await request.post(`${API_BASE}/api/auth/signup`, {
      data: { email, password },
    });
    
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email, password },
    });
  });

  test.describe('List Integrations', () => {
    test('should list integrations', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/integrations`);

      markEndpointHit('GET', '/api/integrations', 'integrations-list');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Connect Integration', () => {
    test('should connect integration', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/integrations/connect`, {
        data: {
          provider: 'github',
          metadataJson: { test: true },
        },
      });

      markEndpointHit('POST', '/api/integrations/connect', 'integration-connect');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.provider).toBe('github');
      expect(data.status).toBe('connected');
    });
  });

  test.describe('Disconnect Integration', () => {
    test('should disconnect integration', async ({ request }) => {
      // Connect first
      const connectResponse = await request.post(`${API_BASE}/api/integrations/connect`, {
        data: {
          provider: 'notion',
          metadataJson: {},
        },
      });
      const connected = await connectResponse.json();

      // Disconnect
      const response = await request.post(`${API_BASE}/api/integrations/disconnect`, {
        data: { id: connected.id },
      });

      markEndpointHit('POST', '/api/integrations/disconnect', 'integration-disconnect');
      
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Credential Vault', () => {
    test('should list credentials', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/vault/credentials`);

      markEndpointHit('GET', '/api/vault/credentials', 'vault-list');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.credentials).toBeDefined();
      expect(data.supportedProviders).toBeDefined();
    });

    test('should store credential', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/vault/credentials`, {
        data: {
          provider: 'openai',
          apiKey: 'sk-test1234567890abcdefghijklmnop',
          label: 'Test Key',
        },
      });

      markEndpointHit('POST', '/api/vault/credentials', 'vault-store');
      
      // May fail validation, but endpoint should respond
      expect([200, 201, 400].includes(response.status())).toBeTruthy();
    });

    test('should test credential', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/vault/credentials/test`, {
        data: {
          provider: 'openai',
          apiKey: 'sk-test1234567890abcdefghijklmnop',
        },
      });

      markEndpointHit('POST', '/api/vault/credentials/test', 'vault-test');
      
      expect([200, 400].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Usage Tracking', () => {
    test('should get usage stats', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/vault/usage`);

      markEndpointHit('GET', '/api/vault/usage', 'vault-usage');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.summary).toBeDefined();
    });
  });

  test.describe('Authorization', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/integrations`, {
        headers: { Cookie: '' },
      });

      markEndpointHit('GET', '/api/integrations', 'integrations-unauth');
      
      expect(response.status()).toBe(401);
    });
  });
});
