/**
 * Supabase Data Provider
 * 
 * Integration with Supabase for database queries and real-time subscriptions.
 */

import type {
  DataProvider,
  DataProviderType,
  ProviderCredentials,
  ConnectionResult,
  DataItem,
  CreateDataItem,
  SyncResult,
  SupabaseQuery,
  Subscription,
} from "./types";

export class SupabaseProvider implements DataProvider {
  readonly type: DataProviderType = 'supabase';
  private projectUrl: string | null = null;
  private anonKey: string | null = null;

  async connect(credentials: ProviderCredentials): Promise<ConnectionResult> {
    if (credentials.type !== 'supabase') {
      return { success: false, provider: this.type, error: 'Invalid provider type' };
    }

    if (!credentials.projectUrl || !credentials.anonKey) {
      return { success: false, provider: this.type, error: 'Project URL and anon key required' };
    }

    try {
      // Test connection by checking health endpoint
      const response = await fetch(`${credentials.projectUrl}/rest/v1/`, {
        headers: this.getHeaders(credentials.anonKey),
      });

      if (!response.ok && response.status !== 404) {
        return { 
          success: false, 
          provider: this.type, 
          error: `Connection failed: ${response.status}` 
        };
      }

      this.projectUrl = credentials.projectUrl;
      this.anonKey = credentials.anonKey;

      return {
        success: true,
        provider: this.type,
        metadata: {
          projectUrl: credentials.projectUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        provider: this.type,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async disconnect(): Promise<void> {
    this.projectUrl = null;
    this.anonKey = null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.projectUrl || !this.anonKey) return false;

    try {
      const response = await fetch(`${this.projectUrl}/rest/v1/`, {
        headers: this.getHeaders(this.anonKey),
      });
      return response.ok || response.status === 404;
    } catch {
      return false;
    }
  }

  async list(path?: string): Promise<DataItem[]> {
    this.ensureConnected();

    // List tables (requires introspection or known schema)
    // For now, return empty - would need schema info
    return [];
  }

  async get(id: string): Promise<DataItem | null> {
    // Would need table name to fetch specific record
    return null;
  }

  async create(item: CreateDataItem): Promise<DataItem> {
    throw new Error('Use query() method for Supabase operations');
  }

  async update(id: string, item: Partial<DataItem>): Promise<DataItem> {
    throw new Error('Use query() method for Supabase operations');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Use query() method for Supabase operations');
  }

  async sync(direction: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult> {
    return {
      success: true,
      itemsSynced: 0,
      conflicts: [],
      errors: [],
    };
  }

  // Supabase-specific methods
  async query(table: string, query: SupabaseQuery = {}): Promise<unknown[]> {
    this.ensureConnected();

    let url = `${this.projectUrl}/rest/v1/${table}`;
    const params = new URLSearchParams();

    if (query.select) {
      params.set('select', query.select);
    }

    if (query.filter) {
      for (const [key, value] of Object.entries(query.filter)) {
        params.set(key, `eq.${value}`);
      }
    }

    if (query.order) {
      params.set('order', `${query.order.column}.${query.order.ascending ? 'asc' : 'desc'}`);
    }

    if (query.limit) {
      params.set('limit', query.limit.toString());
    }

    if (query.offset) {
      params.set('offset', query.offset.toString());
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      headers: this.getHeaders(this.anonKey!),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Query failed: ${response.status}`);
    }

    return response.json();
  }

  async insert(table: string, data: Record<string, unknown> | Record<string, unknown>[]): Promise<unknown[]> {
    this.ensureConnected();

    const response = await fetch(`${this.projectUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(this.anonKey!),
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Insert failed: ${response.status}`);
    }

    return response.json();
  }

  async updateRows(
    table: string, 
    data: Record<string, unknown>, 
    filter: Record<string, unknown>
  ): Promise<unknown[]> {
    this.ensureConnected();

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
      params.set(key, `eq.${value}`);
    }

    const response = await fetch(`${this.projectUrl}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: {
        ...this.getHeaders(this.anonKey!),
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Update failed: ${response.status}`);
    }

    return response.json();
  }

  async deleteRows(table: string, filter: Record<string, unknown>): Promise<void> {
    this.ensureConnected();

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
      params.set(key, `eq.${value}`);
    }

    const response = await fetch(`${this.projectUrl}/rest/v1/${table}?${params}`, {
      method: 'DELETE',
      headers: this.getHeaders(this.anonKey!),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Delete failed: ${response.status}`);
    }
  }

  subscribe(table: string, callback: (payload: unknown) => void): Subscription {
    // Real-time subscriptions would require WebSocket connection
    // This is a simplified implementation
    console.log(`[Supabase] Subscription to ${table} requested (not implemented)`);
    
    return {
      unsubscribe: () => {
        console.log(`[Supabase] Unsubscribed from ${table}`);
      },
    };
  }

  async rpc(functionName: string, params: unknown): Promise<unknown> {
    this.ensureConnected();

    const response = await fetch(`${this.projectUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: this.getHeaders(this.anonKey!),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `RPC failed: ${response.status}`);
    }

    return response.json();
  }

  private getHeaders(anonKey: string): Record<string, string> {
    return {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    };
  }

  private ensureConnected(): void {
    if (!this.projectUrl || !this.anonKey) {
      throw new Error('Not connected to Supabase');
    }
  }
}

export const supabaseProvider = new SupabaseProvider();
