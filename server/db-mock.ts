/**
 * Mock Database v2.0
 * 
 * In-memory mock database for testing and development without
 * a real database connection. Useful for:
 * - Running tests
 * - Quick prototyping
 * - Environments without database access
 * 
 * @version 2.0.0
 * @environment Testing/Development
 */

// In-memory storage for mock data
const mockStorage = {
  users: new Map(),
  orgs: new Map(),
  projects: new Map(),
  sessions: new Map(),
};

export const db = new Proxy({} as any, {
  get(_target, prop) {
    const operation = String(prop);
    console.log(`[Mock DB] Operation: ${operation}`);
    
    // Return appropriate mock responses based on operation
    if (operation === 'select') {
      return () => ({
        from: () => ({
          where: () => Promise.resolve([]),
          orderBy: () => Promise.resolve([]),
          limit: () => Promise.resolve([]),
        }),
      });
    }
    
    if (operation === 'insert') {
      return () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: `mock-${Date.now()}` }]),
        }),
      });
    }
    
    if (operation === 'update') {
      return () => ({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
      });
    }
    
    if (operation === 'delete') {
      return () => ({
        where: () => Promise.resolve(),
      });
    }
    
    return () => Promise.resolve([]);
  }
});

export async function testDatabaseConnection(): Promise<boolean> {
  console.log('[Mock DB] Using mock database - no real connection needed');
  console.log('[Mock DB] This is suitable for testing and development only');
  return true;
}

// Export mock storage for direct access in tests
export { mockStorage };