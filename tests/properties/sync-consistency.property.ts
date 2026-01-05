/**
 * Property Test: Bidirectional Sync Consistency
 * Validates: Requirements 4.6 - Sync conflict detection and resolution
 */

import * as fc from "fast-check";
import { test, expect, describe } from "vitest";

interface DataItem {
  id: string;
  name: string;
  content: string;
  modifiedAt: Date;
  syncHash?: string;
}

interface SyncConflict {
  id: string;
  itemId: string;
  providerVersion: DataItem;
  platformVersion: DataItem;
  conflictingFields: string[];
  detectedAt: Date;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  conflicts: SyncConflict[];
}

// Simulate sync hash calculation
function calculateSyncHash(item: DataItem): string {
  return `${item.name}:${item.content}:${item.modifiedAt.getTime()}`;
}

// Detect conflicts between provider and platform versions
function detectConflict(
  providerItem: DataItem,
  platformItem: DataItem,
  lastSyncHash: string
): SyncConflict | null {
  const providerHash = calculateSyncHash(providerItem);
  const platformHash = calculateSyncHash(platformItem);

  // No conflict if hashes match
  if (providerHash === platformHash) {
    return null;
  }

  // No conflict if only one side changed
  if (providerHash === lastSyncHash || platformHash === lastSyncHash) {
    return null;
  }

  // Both sides changed - conflict!
  const conflictingFields: string[] = [];
  if (providerItem.name !== platformItem.name) conflictingFields.push('name');
  if (providerItem.content !== platformItem.content) conflictingFields.push('content');

  return {
    id: `conflict-${providerItem.id}`,
    itemId: providerItem.id,
    providerVersion: providerItem,
    platformVersion: platformItem,
    conflictingFields,
    detectedAt: new Date(),
  };
}

// Resolve conflict using specified strategy
function resolveConflict(
  conflict: SyncConflict,
  strategy: 'use_provider' | 'use_platform' | 'last_write_wins'
): DataItem {
  switch (strategy) {
    case 'use_provider':
      return conflict.providerVersion;
    case 'use_platform':
      return conflict.platformVersion;
    case 'last_write_wins':
      return conflict.providerVersion.modifiedAt > conflict.platformVersion.modifiedAt
        ? conflict.providerVersion
        : conflict.platformVersion;
  }
}

// Simulate bidirectional sync
function bidirectionalSync(
  providerItems: DataItem[],
  platformItems: DataItem[],
  lastSyncHashes: Map<string, string>
): SyncResult {
  const conflicts: SyncConflict[] = [];
  let itemsSynced = 0;

  // Check each item for conflicts
  for (const providerItem of providerItems) {
    const platformItem = platformItems.find(p => p.id === providerItem.id);
    if (!platformItem) {
      // New item from provider
      itemsSynced++;
      continue;
    }

    const lastHash = lastSyncHashes.get(providerItem.id) || '';
    const conflict = detectConflict(providerItem, platformItem, lastHash);
    
    if (conflict) {
      conflicts.push(conflict);
    } else {
      itemsSynced++;
    }
  }

  // Check for new items on platform
  for (const platformItem of platformItems) {
    const providerItem = providerItems.find(p => p.id === platformItem.id);
    if (!providerItem) {
      itemsSynced++;
    }
  }

  return {
    success: conflicts.length === 0,
    itemsSynced,
    conflicts,
  };
}

describe("Bidirectional Sync Property Tests", () => {
  const dataItemArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 1000 }),
    modifiedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  });

  test("Property 9: Identical items produce no conflicts", () => {
    fc.assert(
      fc.property(
        dataItemArbitrary,
        (item) => {
          const providerItem = { ...item };
          const platformItem = { ...item };
          const lastHash = calculateSyncHash(item);

          const conflict = detectConflict(providerItem, platformItem, lastHash);
          
          expect(conflict).toBeNull();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 9: Single-side changes produce no conflicts", () => {
    fc.assert(
      fc.property(
        dataItemArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }),
        (item, newName) => {
          const originalHash = calculateSyncHash(item);
          
          // Only provider changed
          const providerItem = { ...item, name: newName, modifiedAt: new Date() };
          const platformItem = { ...item };

          const conflict = detectConflict(providerItem, platformItem, originalHash);
          
          // No conflict because platform didn't change
          expect(conflict).toBeNull();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 9: Both-side changes produce conflicts", () => {
    fc.assert(
      fc.property(
        dataItemArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (item, providerName, platformName) => {
          fc.pre(providerName !== platformName);
          fc.pre(providerName !== item.name);
          fc.pre(platformName !== item.name);

          const originalHash = calculateSyncHash(item);
          
          const providerItem = { ...item, name: providerName, modifiedAt: new Date() };
          const platformItem = { ...item, name: platformName, modifiedAt: new Date() };

          const conflict = detectConflict(providerItem, platformItem, originalHash);
          
          expect(conflict).not.toBeNull();
          expect(conflict!.conflictingFields).toContain('name');
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 9: Conflict resolution produces valid item", () => {
    // Use a shared ID arbitrary to ensure both items have the same ID
    const sharedIdArbitrary = fc.uuid();
    
    fc.assert(
      fc.property(
        sharedIdArbitrary,
        dataItemArbitrary,
        dataItemArbitrary,
        fc.constantFrom('use_provider', 'use_platform', 'last_write_wins'),
        (sharedId, baseProviderItem, basePlatformItem, strategy) => {
          // Assign the same ID to both items
          const providerItem = { ...baseProviderItem, id: sharedId };
          const platformItem = { ...basePlatformItem, id: sharedId };

          const conflict: SyncConflict = {
            id: `conflict-${providerItem.id}`,
            itemId: providerItem.id,
            providerVersion: providerItem,
            platformVersion: platformItem,
            conflictingFields: ['name', 'content'],
            detectedAt: new Date(),
          };

          const resolved = resolveConflict(conflict, strategy as any);
          
          // Resolved item should be one of the versions (by value comparison)
          const matchesProvider = resolved.id === providerItem.id && 
            resolved.name === providerItem.name && 
            resolved.content === providerItem.content;
          const matchesPlatform = resolved.id === platformItem.id && 
            resolved.name === platformItem.name && 
            resolved.content === platformItem.content;
          
          expect(matchesProvider || matchesPlatform).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 9: Last-write-wins uses most recent modification", () => {
    fc.assert(
      fc.property(
        dataItemArbitrary,
        dataItemArbitrary,
        (item1, item2) => {
          fc.pre(item1.modifiedAt.getTime() !== item2.modifiedAt.getTime());

          const conflict: SyncConflict = {
            id: 'test-conflict',
            itemId: item1.id,
            providerVersion: item1,
            platformVersion: item2,
            conflictingFields: ['name'],
            detectedAt: new Date(),
          };

          const resolved = resolveConflict(conflict, 'last_write_wins');
          
          // Should be the more recently modified item
          const expected = item1.modifiedAt > item2.modifiedAt ? item1 : item2;
          expect(resolved).toBe(expected);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 9: Sync result counts are consistent", () => {
    fc.assert(
      fc.property(
        fc.array(dataItemArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(dataItemArbitrary, { minLength: 0, maxLength: 10 }),
        (providerItems, platformItems) => {
          const lastSyncHashes = new Map<string, string>();
          
          const result = bidirectionalSync(providerItems, platformItems, lastSyncHashes);
          
          // Counts should be non-negative
          expect(result.itemsSynced).toBeGreaterThanOrEqual(0);
          expect(result.conflicts.length).toBeGreaterThanOrEqual(0);
          
          // Success should be true only if no conflicts
          expect(result.success).toBe(result.conflicts.length === 0);
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 9: Sync hash is deterministic", () => {
    fc.assert(
      fc.property(
        dataItemArbitrary,
        (item) => {
          const hash1 = calculateSyncHash(item);
          const hash2 = calculateSyncHash(item);
          
          expect(hash1).toBe(hash2);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 9: Different items produce different hashes", () => {
    fc.assert(
      fc.property(
        dataItemArbitrary,
        dataItemArbitrary,
        (item1, item2) => {
          fc.pre(
            item1.name !== item2.name ||
            item1.content !== item2.content ||
            item1.modifiedAt.getTime() !== item2.modifiedAt.getTime()
          );

          const hash1 = calculateSyncHash(item1);
          const hash2 = calculateSyncHash(item2);
          
          expect(hash1).not.toBe(hash2);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Export for use in other tests
export { calculateSyncHash, detectConflict, resolveConflict, bidirectionalSync };
