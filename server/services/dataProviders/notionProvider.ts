/**
 * Notion Data Provider
 * 
 * Integration with Notion API for pages and databases.
 */

import type {
  DataProvider,
  DataProviderType,
  ProviderCredentials,
  ConnectionResult,
  DataItem,
  CreateDataItem,
  SyncResult,
  NotionPage,
  NotionDatabase,
  NotionBlock,
  NotionFilter,
} from "./types";

export class NotionProvider implements DataProvider {
  readonly type: DataProviderType = 'notion';
  private apiKey: string | null = null;
  private baseUrl = 'https://api.notion.com/v1';
  private notionVersion = '2022-06-28';

  async connect(credentials: ProviderCredentials): Promise<ConnectionResult> {
    if (credentials.type !== 'notion') {
      return { success: false, provider: this.type, error: 'Invalid provider type' };
    }

    const apiKey = credentials.apiKey || credentials.accessToken;
    if (!apiKey) {
      return { success: false, provider: this.type, error: 'API key or access token required' };
    }

    try {
      // Test connection by fetching user info
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: this.getHeaders(apiKey),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { 
          success: false, 
          provider: this.type, 
          error: error.message || `HTTP ${response.status}` 
        };
      }

      const user = await response.json();
      this.apiKey = apiKey;

      return {
        success: true,
        provider: this.type,
        metadata: {
          userId: user.id,
          userName: user.name,
          userType: user.type,
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
    this.apiKey = null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: this.getHeaders(this.apiKey),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async list(path?: string): Promise<DataItem[]> {
    this.ensureConnected();

    // List all pages and databases the integration has access to
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: this.getHeaders(this.apiKey!),
      body: JSON.stringify({
        filter: path ? { property: 'object', value: path } : undefined,
        page_size: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list items: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map(this.mapToDataItem);
  }

  async get(id: string): Promise<DataItem | null> {
    this.ensureConnected();

    try {
      // Try as page first
      const pageResponse = await fetch(`${this.baseUrl}/pages/${id}`, {
        headers: this.getHeaders(this.apiKey!),
      });

      if (pageResponse.ok) {
        const page = await pageResponse.json();
        return this.mapToDataItem(page);
      }

      // Try as database
      const dbResponse = await fetch(`${this.baseUrl}/databases/${id}`, {
        headers: this.getHeaders(this.apiKey!),
      });

      if (dbResponse.ok) {
        const db = await dbResponse.json();
        return this.mapToDataItem(db);
      }

      return null;
    } catch {
      return null;
    }
  }

  async create(item: CreateDataItem): Promise<DataItem> {
    this.ensureConnected();

    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: this.getHeaders(this.apiKey!),
      body: JSON.stringify({
        parent: item.parentId 
          ? { page_id: item.parentId }
          : { type: 'workspace', workspace: true },
        properties: {
          title: {
            title: [{ text: { content: item.name } }],
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create: ${response.status}`);
    }

    const page = await response.json();
    return this.mapToDataItem(page);
  }

  async update(id: string, item: Partial<DataItem>): Promise<DataItem> {
    this.ensureConnected();

    const response = await fetch(`${this.baseUrl}/pages/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(this.apiKey!),
      body: JSON.stringify({
        properties: item.name ? {
          title: {
            title: [{ text: { content: item.name } }],
          },
        } : undefined,
        archived: item.metadata?.archived,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to update: ${response.status}`);
    }

    const page = await response.json();
    return this.mapToDataItem(page);
  }

  async delete(id: string): Promise<void> {
    this.ensureConnected();

    // Notion doesn't have true delete, only archive
    await this.update(id, { metadata: { archived: true } });
  }

  async sync(direction: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult> {
    // Notion sync would require tracking local state
    // For now, return a basic result
    return {
      success: true,
      itemsSynced: 0,
      conflicts: [],
      errors: [],
    };
  }

  // Notion-specific methods
  async listPages(pageSize: number = 100): Promise<NotionPage[]> {
    this.ensureConnected();

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: this.getHeaders(this.apiKey!),
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        page_size: pageSize,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list pages: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map(this.mapToNotionPage);
  }

  async listDatabases(): Promise<NotionDatabase[]> {
    this.ensureConnected();

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: this.getHeaders(this.apiKey!),
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list databases: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map(this.mapToNotionDatabase);
  }

  async getPageContent(pageId: string): Promise<NotionBlock[]> {
    this.ensureConnected();

    const response = await fetch(`${this.baseUrl}/blocks/${pageId}/children`, {
      headers: this.getHeaders(this.apiKey!),
    });

    if (!response.ok) {
      throw new Error(`Failed to get page content: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map(this.mapToNotionBlock);
  }

  async queryDatabase(databaseId: string, filter?: NotionFilter): Promise<unknown[]> {
    this.ensureConnected();

    const response = await fetch(`${this.baseUrl}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: this.getHeaders(this.apiKey!),
      body: JSON.stringify({ filter }),
    });

    if (!response.ok) {
      throw new Error(`Failed to query database: ${response.status}`);
    }

    const data = await response.json();
    return data.results;
  }

  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': this.notionVersion,
      'Content-Type': 'application/json',
    };
  }

  private ensureConnected(): void {
    if (!this.apiKey) {
      throw new Error('Not connected to Notion');
    }
  }

  private mapToDataItem(item: any): DataItem {
    const isPage = item.object === 'page';
    return {
      id: item.id,
      name: this.extractTitle(item),
      type: item.object,
      createdAt: new Date(item.created_time),
      modifiedAt: new Date(item.last_edited_time),
      metadata: {
        url: item.url,
        archived: item.archived,
        parent: item.parent,
      },
    };
  }

  private mapToNotionPage(item: any): NotionPage {
    return {
      id: item.id,
      name: this.extractTitle(item),
      type: 'page',
      icon: item.icon?.emoji || item.icon?.external?.url,
      cover: item.cover?.external?.url,
      archived: item.archived,
      parentId: item.parent?.page_id || item.parent?.database_id,
      createdAt: new Date(item.created_time),
      modifiedAt: new Date(item.last_edited_time),
    };
  }

  private mapToNotionDatabase(item: any): NotionDatabase {
    return {
      id: item.id,
      name: this.extractTitle(item),
      type: 'database',
      properties: item.properties,
      createdAt: new Date(item.created_time),
      modifiedAt: new Date(item.last_edited_time),
    };
  }

  private mapToNotionBlock(block: any): NotionBlock {
    return {
      id: block.id,
      type: block.type,
      content: block[block.type],
      children: block.has_children ? [] : undefined,
    };
  }

  private extractTitle(item: any): string {
    if (item.properties?.title?.title?.[0]?.plain_text) {
      return item.properties.title.title[0].plain_text;
    }
    if (item.properties?.Name?.title?.[0]?.plain_text) {
      return item.properties.Name.title[0].plain_text;
    }
    if (item.title?.[0]?.plain_text) {
      return item.title[0].plain_text;
    }
    return 'Untitled';
  }
}

export const notionProvider = new NotionProvider();
