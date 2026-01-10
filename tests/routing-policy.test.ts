/**
 * Routing Policy Tests
 * 
 * Tests for AI provider selection, health tracking, and fallback chains.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RoutingPolicy, AIProvider, AIRequest } from "../server/services/routingPolicy";

describe("RoutingPolicy", () => {
  let policy: RoutingPolicy;

  beforeEach(() => {
    policy = new RoutingPolicy();
  });

  describe("pickProvider", () => {
    it("should pick highest priority provider by default", () => {
      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const provider = policy.pickProvider(request);
      expect(provider).toBe("openai"); // Priority 1
    });

    it("should filter by enabled providers list", () => {
      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const provider = policy.pickProvider(request, ["groq", "perplexity"]);
      expect(provider).toBe("groq"); // Lower priority number = higher priority
    });

    it("should return null if no providers match", () => {
      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const provider = policy.pickProvider(request, []);
      expect(provider).toBeNull();
    });

    it("should filter by vision capability", () => {
      const request: AIRequest = {
        prompt: "Describe this image",
        orgId: "org-1",
        requiresVision: true,
      };
      // Groq doesn't support vision
      const provider = policy.pickProvider(request, ["groq", "openai"]);
      expect(provider).toBe("openai");
    });

    it("should filter by tools capability", () => {
      const request: AIRequest = {
        prompt: "Use tools",
        orgId: "org-1",
        requiresTools: true,
      };
      // Perplexity doesn't support tools
      const provider = policy.pickProvider(request, ["perplexity", "anthropic"]);
      expect(provider).toBe("anthropic");
    });

    it("should filter by JSON mode capability", () => {
      const request: AIRequest = {
        prompt: "Return JSON",
        orgId: "org-1",
        requiresJsonMode: true,
      };
      // Anthropic doesn't support JSON mode
      const provider = policy.pickProvider(request, ["anthropic", "openai"]);
      expect(provider).toBe("openai");
    });

    it("should respect cost budget", () => {
      const request: AIRequest = {
        prompt: "Hello",
        orgId: "org-1",
        maxTokens: 1000,
        costBudgetRemaining: 0.001, // Very low budget
      };
      // Should pick cheaper provider (groq is cheapest)
      const provider = policy.pickProvider(request);
      expect(["groq", "google"]).toContain(provider);
    });

    it("should skip unhealthy providers", () => {
      // Mark openai as unhealthy
      policy.onResult("openai", false);
      policy.onResult("openai", false);
      policy.onResult("openai", false); // 3 failures = unhealthy

      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const provider = policy.pickProvider(request);
      expect(provider).not.toBe("openai");
      expect(provider).toBe("anthropic"); // Next in priority
    });

    it("should filter by context length", () => {
      // Create a very long prompt that exceeds groq's 32K limit
      const longPrompt = "x".repeat(150000); // ~37.5K tokens
      const request: AIRequest = { prompt: longPrompt, orgId: "org-1" };
      
      // Groq has 32K limit, should be filtered out
      const provider = policy.pickProvider(request, ["groq", "google"]);
      expect(provider).toBe("google"); // Google has 1M context
    });
  });

  describe("getFallbackChain", () => {
    it("should return providers in priority order excluding primary", () => {
      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const chain = policy.getFallbackChain("openai", request);
      
      expect(chain).not.toContain("openai");
      expect(chain[0]).toBe("anthropic");
      expect(chain[1]).toBe("google");
    });

    it("should filter fallbacks by capabilities", () => {
      const request: AIRequest = {
        prompt: "Use vision",
        orgId: "org-1",
        requiresVision: true,
      };
      const chain = policy.getFallbackChain("openai", request);
      
      // Groq and Perplexity don't support vision
      expect(chain).not.toContain("groq");
      expect(chain).not.toContain("perplexity");
    });

    it("should exclude unhealthy providers from fallback", () => {
      // Mark anthropic as unhealthy
      policy.onResult("anthropic", false);
      policy.onResult("anthropic", false);
      policy.onResult("anthropic", false);

      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const chain = policy.getFallbackChain("openai", request);
      
      expect(chain).not.toContain("anthropic");
    });
  });

  describe("onResult", () => {
    it("should track successful results", () => {
      policy.onResult("openai", true);
      const state = policy.getProviderState("openai");
      
      expect(state?.healthy).toBe(true);
      expect(state?.consecutiveFailures).toBe(0);
      expect(state?.lastSuccess).toBeDefined();
    });

    it("should track failed results", () => {
      policy.onResult("openai", false, new Error("API error"));
      const state = policy.getProviderState("openai");
      
      expect(state?.errorCount).toBe(1);
      expect(state?.consecutiveFailures).toBe(1);
      expect(state?.lastError).toBeDefined();
    });

    it("should mark provider unhealthy after 3 consecutive failures", () => {
      policy.onResult("openai", false);
      policy.onResult("openai", false);
      expect(policy.getProviderState("openai")?.healthy).toBe(true);
      
      policy.onResult("openai", false);
      expect(policy.getProviderState("openai")?.healthy).toBe(false);
    });

    it("should reset consecutive failures on success", () => {
      policy.onResult("openai", false);
      policy.onResult("openai", false);
      policy.onResult("openai", true);
      
      const state = policy.getProviderState("openai");
      expect(state?.consecutiveFailures).toBe(0);
      expect(state?.healthy).toBe(true);
    });
  });

  describe("markHealthy", () => {
    it("should manually recover unhealthy provider", () => {
      // Make unhealthy
      policy.onResult("openai", false);
      policy.onResult("openai", false);
      policy.onResult("openai", false);
      expect(policy.getProviderState("openai")?.healthy).toBe(false);

      // Manually recover
      policy.markHealthy("openai");
      expect(policy.getProviderState("openai")?.healthy).toBe(true);
      expect(policy.getProviderState("openai")?.consecutiveFailures).toBe(0);
    });
  });

  describe("getHealthSummary", () => {
    it("should return health status for all providers", () => {
      policy.onResult("openai", false);
      policy.onResult("anthropic", true);

      const summary = policy.getHealthSummary();
      
      expect(summary.openai.errorCount).toBe(1);
      expect(summary.anthropic.healthy).toBe(true);
      expect(Object.keys(summary)).toHaveLength(6);
    });
  });

  describe("updateProvider", () => {
    it("should update provider configuration", () => {
      policy.updateProvider("openai", { priority: 10 });
      const state = policy.getProviderState("openai");
      expect(state?.priority).toBe(10);
    });

    it("should allow disabling providers", () => {
      policy.updateProvider("openai", { enabled: false });
      
      const request: AIRequest = { prompt: "Hello", orgId: "org-1" };
      const provider = policy.pickProvider(request);
      expect(provider).not.toBe("openai");
    });
  });

  describe("getAllProviderStates", () => {
    it("should return all 6 providers", () => {
      const states = policy.getAllProviderStates();
      expect(states).toHaveLength(6);
      
      const providers = states.map(s => s.provider);
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("google");
      expect(providers).toContain("groq");
      expect(providers).toContain("perplexity");
      expect(providers).toContain("xai");
    });
  });
});
