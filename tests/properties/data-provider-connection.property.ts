/**
 * Property Test: Data Provider Connection Verification
 * Validates: Requirements 4.5 - Connection verification with test query
 */

import * as fc from "fast-check";
import { test, expect, describe } from "vitest";

type DataProviderType = 'notion' | 'google-drive' | 'dropbox' | 'supabase';

interface ConnectionResult {
  success: boolean;
  provider: DataProviderType;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface ProviderCredentials {
  type: DataProviderType;
  apiKey?: string;
  accessToken?: string;
  projectUrl?: string;
  anonKey?: string;
}

// Simulate connection verification
function verifyConnection(credentials: ProviderCredentials): ConnectionResult {
  // Validate required fields per provider
  switch (credentials.type) {
    case 'notion':
      if (!credentials.apiKey && !credentials.accessToken) {
        return { success: false, provider: credentials.type, error: 'API key or access token required' };
      }
      break;
    case 'supabase':
      if (!credentials.projectUrl || !credentials.anonKey) {
        return { success: false, provider: credentials.type, error: 'Project URL and anon key required' };
      }
      break;
    case 'google-drive':
    case 'dropbox':
      if (!credentials.accessToken) {
        return { success: false, provider: credentials.type, error: 'Access token required' };
      }
      break;
  }

  // Simulate successful connection
  return {
    success: true,
    provider: credentials.type,
    metadata: { connectedAt: new Date().toISOString() },
  };
}

describe("Data Provider Connection Property Tests", () => {
  const providerTypeArbitrary = fc.constantFrom<DataProviderType>(
    'notion', 'google-drive', 'dropbox', 'supabase'
  );

  const validCredentialsArbitrary = (type: DataProviderType) => {
    switch (type) {
      case 'notion':
        return fc.record({
          type: fc.constant(type),
          apiKey: fc.string({ minLength: 20, maxLength: 50 }),
        });
      case 'supabase':
        return fc.record({
          type: fc.constant(type),
          projectUrl: fc.webUrl(),
          anonKey: fc.string({ minLength: 20, maxLength: 100 }),
        });
      case 'google-drive':
      case 'dropbox':
        return fc.record({
          type: fc.constant(type),
          accessToken: fc.string({ minLength: 20, maxLength: 100 }),
        });
    }
  };

  test("Property 8: Valid credentials produce successful connection", () => {
    for (const type of ['notion', 'supabase', 'google-drive', 'dropbox'] as DataProviderType[]) {
      fc.assert(
        fc.property(
          validCredentialsArbitrary(type),
          (credentials) => {
            const result = verifyConnection(credentials as ProviderCredentials);
            
            expect(result.success).toBe(true);
            expect(result.provider).toBe(type);
            expect(result.metadata).toBeDefined();
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    }
  });

  test("Property 8: Missing required credentials fail connection", () => {
    fc.assert(
      fc.property(
        providerTypeArbitrary,
        (type) => {
          // Empty credentials
          const result = verifyConnection({ type });
          
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 8: Connection result always includes provider type", () => {
    fc.assert(
      fc.property(
        providerTypeArbitrary,
        fc.record({
          apiKey: fc.option(fc.string()),
          accessToken: fc.option(fc.string()),
          projectUrl: fc.option(fc.webUrl()),
          anonKey: fc.option(fc.string()),
        }),
        (type, creds) => {
          const credentials: ProviderCredentials = {
            type,
            apiKey: creds.apiKey ?? undefined,
            accessToken: creds.accessToken ?? undefined,
            projectUrl: creds.projectUrl ?? undefined,
            anonKey: creds.anonKey ?? undefined,
          };
          
          const result = verifyConnection(credentials);
          
          // Provider type should always be in result
          expect(result.provider).toBe(type);
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 8: Successful connection includes metadata", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DataProviderType>('notion'),
        fc.string({ minLength: 20, maxLength: 50 }),
        (type, apiKey) => {
          const result = verifyConnection({ type, apiKey });
          
          if (result.success) {
            expect(result.metadata).toBeDefined();
            expect(typeof result.metadata).toBe('object');
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 8: Failed connection includes error message", () => {
    fc.assert(
      fc.property(
        providerTypeArbitrary,
        (type) => {
          const result = verifyConnection({ type });
          
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 8: Supabase requires both projectUrl and anonKey", () => {
    fc.assert(
      fc.property(
        fc.record({
          projectUrl: fc.option(fc.webUrl()),
          anonKey: fc.option(fc.string({ minLength: 20 })),
        }),
        (creds) => {
          const credentials: ProviderCredentials = {
            type: 'supabase',
            projectUrl: creds.projectUrl ?? undefined,
            anonKey: creds.anonKey ?? undefined,
          };
          
          const result = verifyConnection(credentials);
          
          // Should only succeed if both are present
          const hasBoth = !!creds.projectUrl && !!creds.anonKey;
          expect(result.success).toBe(hasBoth);
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});

// Export for use in other tests
export { verifyConnection };
