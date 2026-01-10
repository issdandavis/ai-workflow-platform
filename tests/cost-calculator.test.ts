import { describe, it, expect } from "vitest";
import { estimateCost, estimateTokens } from "../server/services/cost-calculator";

describe("Cost Calculator", () => {
  describe("estimateCost", () => {
    it("should calculate OpenAI GPT-4o costs correctly", () => {
      const cost = estimateCost("openai", "gpt-4o", 1000, 500);
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it("should calculate OpenAI GPT-4o-mini costs correctly", () => {
      const cost = estimateCost("openai", "gpt-4o-mini", 1000, 1000);
      expect(cost).toBeCloseTo(0.00075, 5);
    });

    it("should calculate Anthropic Claude costs correctly", () => {
      const cost = estimateCost("anthropic", "claude-sonnet-4-20250514", 2000, 1000);
      expect(cost).toBeCloseTo(0.021, 4);
    });

    it("should calculate Google Gemini costs correctly", () => {
      const cost = estimateCost("google", "gemini-2.0-flash", 10000, 5000);
      expect(cost).toBeCloseTo(0.00225, 5);
    });

    it("should calculate Groq costs correctly", () => {
      const cost = estimateCost("groq", "llama3-8b-8192", 5000, 2000);
      expect(cost).toBeCloseTo(0.00041, 5);
    });

    it("should use default costs for unknown models", () => {
      const cost = estimateCost("openai", "unknown-model", 1000, 1000);
      expect(cost).toBeCloseTo(0.008, 4);
    });

    it("should return 0 for Ollama (local)", () => {
      const cost = estimateCost("ollama", "llama2", 10000, 5000);
      expect(cost).toBe(0);
    });

    it("should return 0 for unknown providers", () => {
      const cost = estimateCost("unknown-provider", "any-model", 1000, 1000);
      expect(cost).toBe(0);
    });

    it("should handle zero tokens", () => {
      const cost = estimateCost("openai", "gpt-4o", 0, 0);
      expect(cost).toBe(0);
    });

    it("should handle large token counts", () => {
      const cost = estimateCost("openai", "gpt-4o", 100000, 50000);
      expect(cost).toBeCloseTo(0.75, 2);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens for short text", () => {
      const tokens = estimateTokens("Hello world");
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it("should estimate tokens for longer text", () => {
      const text = "This is a longer piece of text that should result in more tokens.";
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(10);
    });

    it("should return 0 for empty string", () => {
      const tokens = estimateTokens("");
      expect(tokens).toBe(0);
    });

    it("should scale roughly with text length", () => {
      const short = estimateTokens("Hello");
      const long = estimateTokens("Hello world, this is a much longer test");
      expect(short).toBeLessThan(long);
    });
  });
});
