/**
 * E2E Tests: Project CRUD Operations
 * 
 * Tests all project management paths:
 * - Create project
 * - Read project (single and list)
 * - Update project
 * - Delete project
 * 
 * Validates: Requirements 1.2
 */

import { test, expect } from '@playwright/test';
import { markEndpointHit } from '../fixtures/coverage';
import { nanoid } from 'nanoid';

const API_BASE = process.env.API_URL || 'http://localhost:5000';

test.describe('Project CRUD Operations', () => {
  let authCookie: string;
  
  test.beforeAll(async ({ request }) => {
    // Create and login test user
    const email = `e2e_projects_${nanoid(6)}@test.local`;
    const password = 'SecurePass123!';
    
    await request.post(`${API_BASE}/api/auth/signup`, {
      data: { email, password },
    });
    
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email, password },
    });
    
    const setCookie = loginResponse.headers()['set-cookie'];
    if (setCookie) {
      authCookie = setCookie.split(';')[0];
    }
  });

  test.describe('Create Project', () => {
    test('should create project with valid data', async ({ request }) => {
      const projectName = `Test Project ${nanoid(6)}`;
      
      const response = await request.post(`${API_BASE}/api/projects`, {
        data: { 
          name: projectName,
          description: 'E2E test project',
        },
      });

      markEndpointHit('POST', '/api/projects', 'project-create');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.name).toBe(projectName);
      expect(data.id).toBeDefined();
    });

    test('should reject project without name', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/projects`, {
        data: { description: 'No name project' },
      });

      markEndpointHit('POST', '/api/projects', 'project-create-no-name');
      
      expect(response.ok()).toBeFalsy();
    });
  });

  test.describe('Read Projects', () => {
    test('should list all projects', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/projects`);

      markEndpointHit('GET', '/api/projects', 'project-list');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should get single project by ID', async ({ request }) => {
      // Create a project first
      const createResponse = await request.post(`${API_BASE}/api/projects`, {
        data: { name: `Get Test ${nanoid(6)}` },
      });
      const created = await createResponse.json();

      // Get the project
      const response = await request.get(`${API_BASE}/api/projects/${created.id}`);

      markEndpointHit('GET', '/api/projects/:id', 'project-get');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.id).toBe(created.id);
    });

    test('should return 404 for non-existent project', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/projects/nonexistent_${nanoid(8)}`);

      markEndpointHit('GET', '/api/projects/:id', 'project-get-404');
      
      expect(response.status()).toBe(404);
    });
  });

  test.describe('Update Project', () => {
    test('should update project name', async ({ request }) => {
      // Create a project
      const createResponse = await request.post(`${API_BASE}/api/projects`, {
        data: { name: `Update Test ${nanoid(6)}` },
      });
      const created = await createResponse.json();

      // Update the project
      const newName = `Updated ${nanoid(6)}`;
      const response = await request.put(`${API_BASE}/api/projects/${created.id}`, {
        data: { name: newName },
      });

      markEndpointHit('PUT', '/api/projects/:id', 'project-update');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.name).toBe(newName);
    });
  });

  test.describe('Delete Project', () => {
    test('should delete project', async ({ request }) => {
      // Create a project
      const createResponse = await request.post(`${API_BASE}/api/projects`, {
        data: { name: `Delete Test ${nanoid(6)}` },
      });
      const created = await createResponse.json();

      // Delete the project
      const response = await request.delete(`${API_BASE}/api/projects/${created.id}`);

      markEndpointHit('DELETE', '/api/projects/:id', 'project-delete');
      
      expect(response.ok()).toBeTruthy();

      // Verify it's deleted
      const getResponse = await request.get(`${API_BASE}/api/projects/${created.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Authorization', () => {
    test('should require authentication for project operations', async ({ request }) => {
      // Create fresh context without auth
      const response = await request.get(`${API_BASE}/api/projects`, {
        headers: { Cookie: '' }, // Clear any cookies
      });

      markEndpointHit('GET', '/api/projects', 'project-list-unauth');
      
      expect(response.status()).toBe(401);
    });
  });
});
