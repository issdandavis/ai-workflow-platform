/**
 * Test Context & Data Factory
 * 
 * Provides factory methods for creating test data with automatic cleanup.
 * All created entities are namespaced with runId for isolation.
 */

import { nanoid } from 'nanoid';

const API_BASE = process.env.API_URL || 'http://localhost:5000';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
  sessionCookie?: string;
}

export interface TestProject {
  id: string;
  name: string;
  orgId: string;
}

export interface TestOrg {
  id: string;
  name: string;
  ownerUserId: string;
}

export class TestContext {
  public readonly runId: string;
  private createdUsers: TestUser[] = [];
  private createdProjects: string[] = [];
  private createdOrgs: string[] = [];
  private sessionCookie: string = '';

  constructor() {
    this.runId = nanoid(8);
  }

  getNamespace(): string {
    return `e2e_${this.runId}_`;
  }

  private async api(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  }

  async createUser(overrides: Partial<{ email: string; password: string; role: string }> = {}): Promise<TestUser> {
    const email = overrides.email || `${this.getNamespace()}user_${nanoid(6)}@test.local`;
    const password = overrides.password || `TestPass123!${nanoid(4)}`;
    const role = overrides.role || 'owner';

    const response = await this.api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create user: ${error.error}`);
    }

    const data = await response.json();
    const setCookie = response.headers.get('set-cookie');
    
    const user: TestUser = {
      id: data.id,
      email,
      password,
      role: data.role,
      sessionCookie: setCookie?.split(';')[0],
    };

    this.createdUsers.push(user);
    
    // Store session for subsequent requests
    if (user.sessionCookie) {
      this.sessionCookie = user.sessionCookie;
    }

    return user;
  }

  async loginAs(user: TestUser): Promise<string> {
    const response = await this.api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    if (!response.ok) {
      throw new Error('Failed to login');
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.sessionCookie = setCookie.split(';')[0];
      user.sessionCookie = this.sessionCookie;
    }

    return this.sessionCookie;
  }

  async createProject(overrides: Partial<{ name: string; description: string }> = {}): Promise<TestProject> {
    const name = overrides.name || `${this.getNamespace()}project_${nanoid(6)}`;

    const response = await this.api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        description: overrides.description || 'Test project' 
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create project: ${error.error}`);
    }

    const data = await response.json();
    this.createdProjects.push(data.id);

    return {
      id: data.id,
      name: data.name,
      orgId: data.orgId,
    };
  }

  async cleanup(): Promise<void> {
    const errors: string[] = [];

    // Delete projects first (they depend on orgs)
    for (const projectId of this.createdProjects) {
      try {
        await this.api(`/api/projects/${projectId}`, { method: 'DELETE' });
      } catch (e) {
        errors.push(`Failed to delete project ${projectId}: ${e}`);
      }
    }

    // Note: Users and orgs are typically cleaned up by cascade or left for manual cleanup
    // In a real scenario, you'd have admin endpoints for this

    if (errors.length > 0) {
      console.warn('Cleanup errors:', errors);
    }

    // Reset state
    this.createdUsers = [];
    this.createdProjects = [];
    this.createdOrgs = [];
    this.sessionCookie = '';
  }

  getSessionCookie(): string {
    return this.sessionCookie;
  }

  setSessionCookie(cookie: string): void {
    this.sessionCookie = cookie;
  }
}

// Singleton for shared context across test files
let sharedContext: TestContext | null = null;

export function getSharedContext(): TestContext {
  if (!sharedContext) {
    sharedContext = new TestContext();
  }
  return sharedContext;
}

export function resetSharedContext(): void {
  sharedContext = null;
}
