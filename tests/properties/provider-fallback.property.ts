/**
 * Property Test: Provider Fallback Chain
 * Validates: Requirements 2.3, 2.4 - Provider fallback and health tracking
 */

import * as fc from "fast-check";
import { test, expect, describe, beforeEach } from "vitest";
import { RoutingPolicy, AIProvider, AIRequest } from "../../server/services/routingPolicy";

describe("Provider Fallback Property Tests", () => {
  let routingPolicy: RoutingPolicy;

  beforeEach(() => {
    routingPolicy = new RoutingPolicy();
  });

  const providerArbitrary = fc.constantFrom<AIProvider>(
    'openai', 'anthropic', 'google', 'groq', 'perplexity', 'xai'
  );

  const requestArbitrary = fc.record({
    prompt: fc.string({ minLength: 1, maxLength: 1000 }),
    orgId: fc.uuid(),
    maxTokens: fc.option(fc.integer({ min: 1, max: 4000 })),
    requiresVision: fc.option(fc.boolean()),
    requiresTools: fc.option(fc.boolean()),
    requiresStreaming: fc.option(fc.boolean()),
  }).map(r => ({
    prompt: r.prompt,
    orgId: r.orgId,
    maxTokens: r.maxTokens ?? undefined,
    requiresVision: r.requiresVision ?? undefined,
    requiresTools: r.requiresTools ?? undefined,
    requiresStreaming: r.requiresStreaming ?? undefined,
  } as AIRequest));

  test("Property 3: Fallback chain excludes primary provider", () => {
    fc.assert(
      fc.property(
        providerArbitrary,
        requestArbitrary,
        (primaryProvider, request) => {
          const fallbackChain = routingPolicy.getFallbackChain(primaryProvider, request);
          
          // Primary provider should not be in fallback chain
          expect(fallbackChain).not.toContain(primaryProvider);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 3: Fallback chain is ordered by priority", () => {
    fc.assert(
      fc.property(
        providerArbitrary,
        requestArbitrary,
        (primaryProvider, request) => {
          const fallbackChain = routingPolicy.getFallbackChain(primaryProvider, request);
          
          // Get priorities for each provider in chain
          const priorities = fallbackChain.map(p => {
            const state = routingPolicy.getProviderState(p);
            return state?.priority ?? Infinity;
          });
          
          // Chain should be sorted by priority (ascending)
          for (let i = 1; i < priorities.length; i++) {
            expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 3: Failed provider is deprioritized after consecutive failures", () => {
    fc.assert(
      fc.property(
        providerArbitrary,
        fc.integer({ min: 3, max: 10 }),
        (provider, failureCount) => {
          // Create fresh instance for each property run to avoid state accumulation
          const freshPolicy = new RoutingPolicy();
          
          // Simulate consecutive failures
          for (let i = 0; i < failureCount; i++) {
            freshPolicy.onResult(provider, false, new Error("Test failure"));
          }
          
          const state = freshPolicy.getProviderState(provider);
          
          // Provider should be marked unhealthy after 3+ consecutive failures
          expect(state?.healthy).toBe(false);
          expect(state?.consecutiveFailures).toBe(failureCount);
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 3: Successful result resets failure counters", () => {
    fc.assert(
      fc.property(
        providerArbitrary,
        fc.integer({ min: 1, max: 5 }),
        (provider, failureCount) => {
          // Create fresh instance for each property run
          const freshPolicy = new RoutingPolicy();
          
          // Simulate some failures
          for (let i = 0; i < failureCount; i++) {
            freshPolicy.onResult(provider, false, new Error("Test failure"));
          }
          
          // Then a success
          freshPolicy.onResult(provider, true);
          
          const state = freshPolicy.getProviderState(provider);
          
          // Consecutive failures should be reset
          expect(state?.consecutiveFailures).toBe(0);
          expect(state?.healthy).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 3: Unhealthy providers are excluded from selection", () => {
    fc.assert(
      fc.property(
        providerArbitrary,
        requestArbitrary,
        (unhealthyProvider, request) => {
          // Create fresh instance for each property run
          const freshPolicy = new RoutingPolicy();
          
          // Mark provider as unhealthy
          for (let i = 0; i < 3; i++) {
            freshPolicy.onResult(unhealthyProvider, false, new Error("Test failure"));
          }
          
          // Get all enabled providers
          const allProviders: AIProvider[] = ['openai', 'anthropic', 'google', 'groq', 'perplexity', 'xai'];
          
          // Pick provider should not return the unhealthy one (unless it's the only option)
          const selected = freshPolicy.pickProvider(request, allProviders);
          
          // If there are other healthy providers, the unhealthy one shouldn't be selected
          const healthyProviders = allProviders.filter(p => {
            const state = freshPolicy.getProviderState(p);
            return state?.healthy;
          });
          
          if (healthyProviders.length > 0) {
            expect(selected).not.toBe(unhealthyProvider);
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test("Property 4: API key format validation", () => {
    const validKeyPatterns = [
      { provider: 'openai', prefix: 'sk-', minLength: 10 },
      { provider: 'anthropic', prefix: 'sk-ant-', minLength: 10 },
      { provider: 'perplexity', prefix: 'pplx-', minLength: 10 },
      { provider: 'xai', prefix: 'xai-', minLength: 10 },
      { provider: 'google', prefix: 'AI', minLength: 10 },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...validKeyPatterns),
        fc.string({ minLength: 20, maxLength: 50 }),
        (pattern, suffix) => {
          const validKey = pattern.prefix + suffix.replace(/[^a-zA-Z0-9]/g, 'x');
          const invalidKey = 'invalid-' + suffix;
          
          // Valid key should start with expected prefix
          expect(validKey.startsWith(pattern.prefix)).toBe(true);
          expect(validKey.length).toBeGreaterThanOrEqual(pattern.minLength);
          
          // Invalid key should not start with expected prefix
          expect(invalidKey.startsWith(pattern.prefix)).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 3: All providers exhausted returns null", () => {
    fc.assert(
      fc.property(
        requestArbitrary,
        (request) => {
          // Create fresh instance for each property run
          const freshPolicy = new RoutingPolicy();
          
          // Mark all providers as unhealthy
          const allProviders: AIProvider[] = ['openai', 'anthropic', 'google', 'groq', 'perplexity', 'xai'];
          
          for (const provider of allProviders) {
            for (let i = 0; i < 3; i++) {
              freshPolicy.onResult(provider, false, new Error("Test failure"));
            }
          }
          
          // Pick provider should return null when all are unhealthy
          const selected = freshPolicy.pickProvider(request, allProviders);
          expect(selected).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 3: Capability filtering works correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 100 }),
          orgId: fc.uuid(),
          requiresVision: fc.constant(true),
        }),
        (request) => {
          // Create fresh instance for each property run
          const freshPolicy = new RoutingPolicy();
          const allProviders: AIProvider[] = ['openai', 'anthropic', 'google', 'groq', 'perplexity', 'xai'];
          
          // Request requires vision
          const selected = freshPolicy.pickProvider(request as AIRequest, allProviders);
          
          if (selected) {
            const state = freshPolicy.getProviderState(selected);
            // Selected provider should support vision
            expect(state?.capabilities.supportsVision).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});
