/**
 * Security Tests
 * 
 * Enterprise-grade security validation tests
 */

import { describe, it, expect } from 'vitest';

const API_BASE = process.env.API_URL || 'http://localhost:5000';

async function api(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as any },
    ...options,
  });
  return { 
    status: response.status, 
    headers: response.headers,
    data: await response.json().catch(() => null) 
  };
}

describe('Security Headers', () => {
  it('should include security headers on responses', async () => {
    const { headers } = await api('/api/health');
    
    // Check for common security headers (may vary by config)
    // These are set by helmet middleware
    expect(headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('XSS Prevention', () => {
  it('should sanitize script tags in input', async () => {
    const { status, data } = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: '<script>alert("xss")</script>@test.com',
        password: 'TestPassword123!'
      }),
    });
    
    // Should reject invalid email format
    expect([400, 422, 429]).toContain(status);
  });
});

describe('SQL Injection Prevention', () => {
  it('should handle SQL injection attempts in login', async () => {
    const { status } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: "admin'--",
        password: "' OR '1'='1"
      }),
    });
    
    // Should reject as invalid credentials, not execute SQL
    expect([400, 401, 422, 429]).toContain(status);
  });
});
