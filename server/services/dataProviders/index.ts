/**
 * Data Providers Index
 * 
 * Central export for all data provider implementations.
 */

export * from "./types";
export { notionProvider, NotionProvider } from "./notionProvider";
export { supabaseProvider, SupabaseProvider } from "./supabaseProvider";

import type { DataProvider, DataProviderType } from "./types";
import { notionProvider } from "./notionProvider";
import { supabaseProvider } from "./supabaseProvider";

// Provider registry
const providers: Record<DataProviderType, DataProvider> = {
  'notion': notionProvider,
  'supabase': supabaseProvider,
  'google-drive': null as any, // TODO: Implement
  'dropbox': null as any, // TODO: Implement
};

/**
 * Get a data provider by type
 */
export function getProvider(type: DataProviderType): DataProvider | null {
  return providers[type] || null;
}

/**
 * Get all available provider types
 */
export function getAvailableProviders(): DataProviderType[] {
  return Object.entries(providers)
    .filter(([_, provider]) => provider !== null)
    .map(([type]) => type as DataProviderType);
}
