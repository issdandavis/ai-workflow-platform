/**
 * Data Provider Types
 * 
 * Common interfaces for all data provider integrations.
 */

export type DataProviderType = 'notion' | 'google-drive' | 'dropbox' | 'supabase';

export interface ProviderCredentials {
  type: DataProviderType;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  projectUrl?: string;
  anonKey?: string;
}

export interface ConnectionResult {
  success: boolean;
  provider: DataProviderType;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface DataItem {
  id: string;
  name: string;
  type: string;
  path?: string;
  size?: number;
  modifiedAt?: Date;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateDataItem {
  name: string;
  type: string;
  content?: string | Buffer;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  conflicts: SyncConflict[];
  errors: string[];
}

export interface SyncConflict {
  id: string;
  provider: DataProviderType;
  providerItemId: string;
  platformItemId: string;
  detectedAt: Date;
  fields: string[];
  providerSnapshot: unknown;
  platformSnapshot: unknown;
  resolution?: 'use_provider' | 'use_platform' | 'manual_merge';
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Base interface for all data providers
 */
export interface DataProvider {
  readonly type: DataProviderType;
  
  // Connection
  connect(credentials: ProviderCredentials): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Operations
  list(path?: string): Promise<DataItem[]>;
  get(id: string): Promise<DataItem | null>;
  create(item: CreateDataItem): Promise<DataItem>;
  update(id: string, item: Partial<DataItem>): Promise<DataItem>;
  delete(id: string): Promise<void>;
  
  // Sync
  sync(direction: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult>;
}

// Notion-specific types
export interface NotionPage extends DataItem {
  type: 'page';
  icon?: string;
  cover?: string;
  archived: boolean;
  parentId?: string;
}

export interface NotionDatabase extends DataItem {
  type: 'database';
  properties: Record<string, NotionProperty>;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

export interface NotionBlock {
  id: string;
  type: string;
  content: unknown;
  children?: NotionBlock[];
}

export interface NotionFilter {
  property: string;
  [key: string]: unknown;
}

// Google Drive-specific types
export interface DriveFile extends DataItem {
  mimeType: string;
  webViewLink?: string;
  downloadUrl?: string;
  parents?: string[];
}

export interface DriveFolder extends DataItem {
  type: 'folder';
}

export interface StorageQuota {
  used: number;
  limit: number;
  percentUsed: number;
}

export interface FileMetadata {
  name: string;
  mimeType: string;
  parentId?: string;
  description?: string;
}

// Dropbox-specific types
export interface DropboxFile extends DataItem {
  isFolder: boolean;
  contentHash?: string;
}

export interface DropboxFolder extends DataItem {
  type: 'folder';
}

export interface SharedLink {
  url: string;
  path: string;
  linkPermissions: {
    canDownload: boolean;
    canEdit: boolean;
  };
  expiresAt?: Date;
}

export interface SpaceUsage {
  used: number;
  allocated: number;
  percentUsed: number;
}

// Supabase-specific types
export interface SupabaseQuery {
  select?: string;
  filter?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface Subscription {
  unsubscribe(): void;
}
