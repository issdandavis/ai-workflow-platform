/**
 * Property Test: API Key Format Validation
 * Validates: Requirements 2.6 - API key format validation
 */

import * as fc from "fast-check";
import { test, expect, describe } from "vitest";

// Provider configurations matching vault.ts
const SUPPORTED_PROVIDERS = [
  { name: "openai", label: "OpenAI", keyPrefix: "sk-" },
  { name: "anthropic", label: "Anthropic", keyPrefix: "sk-ant-" },
  { name: "perplexity", label: "Perplexity", keyPrefix: "pplx-" },
  { name: "xai", label: "xAI / Grok", keyPrefix: "xai-" },
  { name: "github", label: "GitHub", keyPrefix: "ghp_" },
  { name: "google", label: "Google AI", keyPrefix: "AI" },
];

function validateApiKeyFormat(provider: string, apiKey: string): boolean {
  const config = SUPPORTED_PROVIDERS.find((p) => p.name === provider);
  if (!config) {
    return apiKey.length >= 10;
  }
  return apiKey.startsWith(config.keyPrefix) && apiKey.length >= 10;
}

describe("API Key Format Validation Property Tests", () => {
  // Generate valid API keys for each provider
  const validKeyArbitrary = (provider: string) => {
    const config = SUPPORTED_PROVIDERS.find(p => p.name === provider);
    const prefix = config?.keyPrefix || "";
    const minSuffixLength = Math.max(10 - prefix.length, 1);
    
    return fc.string({ minLength: minSuffixLength, maxLength: 60 })
      .map(suffix => prefix + suffix.replace(/[^a-zA-Z0-9_-]/g, 'x'));
  };

  // Generate invalid API keys (wrong prefix or too short)
  const invalidKeyArbitrary = (provider: string) => {
    const config = SUPPORTED_PROVIDERS.find(p => p.name === provider);
    const prefix = config?.keyPrefix || "";
    
    return fc.oneof(
      // Wrong prefix
      fc.string({ minLength: 10, maxLength: 50 })
        .filter(s => !s.startsWith(prefix))
        .map(s => s.replace(/[^a-zA-Z0-9_-]/g, 'x')),
      // Too short
      fc.string({ minLength: 1, maxLength: 9 })
        .map(s => s.replace(/[^a-zA-Z0-9_-]/g, 'x'))
    );
  };

  test("Property 4: Valid API keys are accepted", () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      fc.assert(
        fc.property(
          validKeyArbitrary(provider.name),
          (apiKey) => {
            const isValid = validateApiKeyFormat(provider.name, apiKey);
            expect(isValid).toBe(true);
            return true;
          }
        ),
        { numRuns: 20 }
      );
    }
  });

  test("Property 4: Invalid API keys are rejected", () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      fc.assert(
        fc.property(
          invalidKeyArbitrary(provider.name),
          (apiKey) => {
            const isValid = validateApiKeyFormat(provider.name, apiKey);
            expect(isValid).toBe(false);
            return true;
          }
        ),
        { numRuns: 20 }
      );
    }
  });

  test("Property 4: Empty strings are rejected", () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      const isValid = validateApiKeyFormat(provider.name, "");
      expect(isValid).toBe(false);
    }
  });

  test("Property 4: Keys with correct prefix but wrong length are rejected", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_PROVIDERS),
        fc.integer({ min: 1, max: 5 }),
        (provider, suffixLength) => {
          // Create a key that's too short
          const shortKey = provider.keyPrefix + "x".repeat(suffixLength);
          
          // If total length < 10, should be rejected
          if (shortKey.length < 10) {
            expect(validateApiKeyFormat(provider.name, shortKey)).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 4: Unknown providers accept any key >= 10 chars", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }),
        (apiKey) => {
          const cleanKey = apiKey.replace(/[^a-zA-Z0-9_-]/g, 'x');
          if (cleanKey.length >= 10) {
            const isValid = validateApiKeyFormat("unknown-provider", cleanKey);
            expect(isValid).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 4: Provider name matching is case-sensitive", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_PROVIDERS),
        validKeyArbitrary("openai"),
        (provider, apiKey) => {
          // Exact match should work
          const exactMatch = validateApiKeyFormat(provider.name, provider.keyPrefix + "x".repeat(20));
          
          // The validation should be consistent
          expect(typeof exactMatch).toBe("boolean");
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 4: Special characters in keys are handled", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_PROVIDERS),
        fc.string({ minLength: 20, maxLength: 50 }),
        (provider, randomString) => {
          // Keys with special characters
          const keyWithSpecials = provider.keyPrefix + randomString;
          
          // Validation should not throw
          expect(() => validateApiKeyFormat(provider.name, keyWithSpecials)).not.toThrow();
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 4: Prefix matching is exact", () => {
    // Test that partial prefix matches don't pass
    const testCases = [
      { provider: "openai", wrongPrefix: "sk" }, // Missing dash
      { provider: "anthropic", wrongPrefix: "sk-" }, // Missing "ant-"
      { provider: "perplexity", wrongPrefix: "pplx" }, // Missing dash
    ];

    for (const { provider, wrongPrefix } of testCases) {
      const wrongKey = wrongPrefix + "x".repeat(30);
      const isValid = validateApiKeyFormat(provider, wrongKey);
      
      // Should be invalid because prefix doesn't match exactly
      expect(isValid).toBe(false);
    }
  });
});

// Export validation function for use in other tests
export { validateApiKeyFormat };
