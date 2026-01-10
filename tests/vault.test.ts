/**
 * Vault Service Tests
 * 
 * Tests for credential encryption, storage, and validation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  encryptCredential,
  decryptCredential,
  maskApiKey,
  validateApiKeyFormat,
  SUPPORTED_PROVIDERS,
} from "../server/services/vault";

// Mock SESSION_SECRET for tests
vi.stubEnv("SESSION_SECRET", "test-secret-key-for-vault-testing-32chars!");

describe("Vault Service", () => {
  describe("encryptCredential / decryptCredential", () => {
    it("should encrypt and decrypt a credential correctly", () => {
      const plaintext = "sk-test-api-key-12345";
      const encrypted = encryptCredential(plaintext);

      expect(encrypted.encryptedKey).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.encryptedKey).not.toBe(plaintext);

      const decrypted = decryptCredential(
        encrypted.encryptedKey,
        encrypted.iv,
        encrypted.authTag
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertexts for same plaintext (random IV)", () => {
      const plaintext = "sk-test-api-key-12345";
      const encrypted1 = encryptCredential(plaintext);
      const encrypted2 = encryptCredential(plaintext);

      expect(encrypted1.encryptedKey).not.toBe(encrypted2.encryptedKey);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it("should handle empty strings", () => {
      const plaintext = "";
      const encrypted = encryptCredential(plaintext);
      const decrypted = decryptCredential(
        encrypted.encryptedKey,
        encrypted.iv,
        encrypted.authTag
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should handle long API keys", () => {
      const plaintext = "sk-" + "a".repeat(500);
      const encrypted = encryptCredential(plaintext);
      const decrypted = decryptCredential(
        encrypted.encryptedKey,
        encrypted.iv,
        encrypted.authTag
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "sk-test!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encryptCredential(plaintext);
      const decrypted = decryptCredential(
        encrypted.encryptedKey,
        encrypted.iv,
        encrypted.authTag
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should fail decryption with wrong authTag", () => {
      const plaintext = "sk-test-api-key-12345";
      const encrypted = encryptCredential(plaintext);
      const wrongAuthTag = Buffer.from("wrong-auth-tag-here!").toString("base64");

      expect(() =>
        decryptCredential(encrypted.encryptedKey, encrypted.iv, wrongAuthTag)
      ).toThrow();
    });

    it("should fail decryption with wrong IV", () => {
      const plaintext = "sk-test-api-key-12345";
      const encrypted = encryptCredential(plaintext);
      const wrongIv = Buffer.from("0123456789abcdef").toString("base64");

      expect(() =>
        decryptCredential(encrypted.encryptedKey, wrongIv, encrypted.authTag)
      ).toThrow();
    });
  });

  describe("maskApiKey", () => {
    it("should mask middle of API key", () => {
      const apiKey = "sk-1234567890abcdef";
      const masked = maskApiKey(apiKey);
      expect(masked).toBe("sk-1****cdef");
    });

    it("should return **** for short keys", () => {
      expect(maskApiKey("short")).toBe("****");
      expect(maskApiKey("12345678")).toBe("****");
    });

    it("should handle exactly 9 character keys", () => {
      const masked = maskApiKey("123456789");
      expect(masked).toBe("1234****6789");
    });
  });

  describe("validateApiKeyFormat", () => {
    it("should validate OpenAI key format", () => {
      expect(validateApiKeyFormat("openai", "sk-1234567890")).toBe(true);
      expect(validateApiKeyFormat("openai", "invalid-key")).toBe(false);
      expect(validateApiKeyFormat("openai", "sk-short")).toBe(false);
    });

    it("should validate Anthropic key format", () => {
      expect(validateApiKeyFormat("anthropic", "sk-ant-1234567890")).toBe(true);
      expect(validateApiKeyFormat("anthropic", "sk-1234567890")).toBe(false);
    });

    it("should validate Perplexity key format", () => {
      expect(validateApiKeyFormat("perplexity", "pplx-1234567890")).toBe(true);
      expect(validateApiKeyFormat("perplexity", "sk-1234567890")).toBe(false);
    });

    it("should validate xAI key format", () => {
      expect(validateApiKeyFormat("xai", "xai-1234567890")).toBe(true);
      expect(validateApiKeyFormat("xai", "sk-1234567890")).toBe(false);
    });

    it("should validate GitHub key format", () => {
      expect(validateApiKeyFormat("github", "ghp_1234567890")).toBe(true);
      expect(validateApiKeyFormat("github", "sk-1234567890")).toBe(false);
    });

    it("should validate Google AI key format", () => {
      expect(validateApiKeyFormat("google", "AIzaSy1234567890")).toBe(true);
      expect(validateApiKeyFormat("google", "sk-1234567890")).toBe(false);
    });

    it("should accept any key >= 10 chars for unknown providers", () => {
      expect(validateApiKeyFormat("unknown", "1234567890")).toBe(true);
      expect(validateApiKeyFormat("unknown", "short")).toBe(false);
    });
  });

  describe("SUPPORTED_PROVIDERS", () => {
    it("should have all expected providers", () => {
      const providerNames = SUPPORTED_PROVIDERS.map((p) => p.name);
      expect(providerNames).toContain("openai");
      expect(providerNames).toContain("anthropic");
      expect(providerNames).toContain("perplexity");
      expect(providerNames).toContain("xai");
      expect(providerNames).toContain("github");
      expect(providerNames).toContain("google");
    });

    it("should have valid key prefixes", () => {
      for (const provider of SUPPORTED_PROVIDERS) {
        expect(provider.keyPrefix).toBeDefined();
        expect(provider.keyPrefix.length).toBeGreaterThan(0);
      }
    });
  });
});
