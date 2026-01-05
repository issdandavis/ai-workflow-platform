/**
 * Property Test: API Key Encryption Round-Trip
 * Validates: Requirements 2.2 - API keys are encrypted at rest
 */

import * as fc from "fast-check";
import { test, expect, describe } from "vitest";
import crypto from "crypto";

// Simulate the encryption functions (same algorithm as vault.ts)
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT = "ai-orchestration-vault-v1";

function getEncryptionKey(masterSecret: string): Buffer {
  return crypto.pbkdf2Sync(masterSecret, SALT, 100000, KEY_LENGTH, "sha512");
}

function encryptCredential(plaintext: string, masterSecret: string): {
  encryptedKey: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey(masterSecret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptCredential(
  encryptedKey: string,
  iv: string,
  authTag: string,
  masterSecret: string
): string {
  const key = getEncryptionKey(masterSecret);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encryptedKey, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

describe("API Key Encryption Property Tests", () => {
  // Generate valid API key patterns
  const apiKeyArbitrary = fc.oneof(
    // OpenAI style: sk-...
    fc.string({ minLength: 40, maxLength: 60 }).map(s => `sk-${s.replace(/[^a-zA-Z0-9]/g, 'x')}`),
    // Anthropic style: sk-ant-...
    fc.string({ minLength: 40, maxLength: 60 }).map(s => `sk-ant-${s.replace(/[^a-zA-Z0-9]/g, 'x')}`),
    // Generic API key
    fc.string({ minLength: 20, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9_-]/g, 'x'))
  );

  const masterSecretArbitrary = fc.string({ minLength: 32, maxLength: 64 });

  test("Property 2: Encryption round-trip produces original key", () => {
    fc.assert(
      fc.property(
        apiKeyArbitrary,
        masterSecretArbitrary,
        (apiKey, masterSecret) => {
          const encrypted = encryptCredential(apiKey, masterSecret);
          const decrypted = decryptCredential(
            encrypted.encryptedKey,
            encrypted.iv,
            encrypted.authTag,
            masterSecret
          );

          // Round-trip produces original
          expect(decrypted).toBe(apiKey);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 2: Encrypted value differs from plaintext", () => {
    fc.assert(
      fc.property(
        apiKeyArbitrary,
        masterSecretArbitrary,
        (apiKey, masterSecret) => {
          const encrypted = encryptCredential(apiKey, masterSecret);

          // Encrypted is different from plaintext
          expect(encrypted.encryptedKey).not.toBe(apiKey);
          
          // Encrypted should be base64 encoded
          expect(() => Buffer.from(encrypted.encryptedKey, "base64")).not.toThrow();
          expect(() => Buffer.from(encrypted.iv, "base64")).not.toThrow();
          expect(() => Buffer.from(encrypted.authTag, "base64")).not.toThrow();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 2: Different IVs produce different ciphertexts", () => {
    fc.assert(
      fc.property(
        apiKeyArbitrary,
        masterSecretArbitrary,
        (apiKey, masterSecret) => {
          const encrypted1 = encryptCredential(apiKey, masterSecret);
          const encrypted2 = encryptCredential(apiKey, masterSecret);

          // Same plaintext with different IVs should produce different ciphertexts
          // (IVs are randomly generated)
          expect(encrypted1.iv).not.toBe(encrypted2.iv);
          expect(encrypted1.encryptedKey).not.toBe(encrypted2.encryptedKey);

          // But both should decrypt to the same value
          const decrypted1 = decryptCredential(
            encrypted1.encryptedKey,
            encrypted1.iv,
            encrypted1.authTag,
            masterSecret
          );
          const decrypted2 = decryptCredential(
            encrypted2.encryptedKey,
            encrypted2.iv,
            encrypted2.authTag,
            masterSecret
          );

          expect(decrypted1).toBe(apiKey);
          expect(decrypted2).toBe(apiKey);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 2: Wrong master secret fails decryption", () => {
    fc.assert(
      fc.property(
        apiKeyArbitrary,
        masterSecretArbitrary,
        masterSecretArbitrary,
        (apiKey, masterSecret1, masterSecret2) => {
          // Skip if secrets happen to be the same
          fc.pre(masterSecret1 !== masterSecret2);

          const encrypted = encryptCredential(apiKey, masterSecret1);

          // Decryption with wrong secret should fail
          expect(() => {
            decryptCredential(
              encrypted.encryptedKey,
              encrypted.iv,
              encrypted.authTag,
              masterSecret2
            );
          }).toThrow();

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 2: Tampered ciphertext fails authentication", () => {
    fc.assert(
      fc.property(
        apiKeyArbitrary,
        masterSecretArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (apiKey, masterSecret, tamperIndex) => {
          const encrypted = encryptCredential(apiKey, masterSecret);
          
          // Tamper with the ciphertext
          const ciphertextBytes = Buffer.from(encrypted.encryptedKey, "base64");
          if (ciphertextBytes.length > 0) {
            const idx = tamperIndex % ciphertextBytes.length;
            ciphertextBytes[idx] = (ciphertextBytes[idx] + 1) % 256;
            const tamperedCiphertext = ciphertextBytes.toString("base64");

            // Decryption should fail due to authentication
            expect(() => {
              decryptCredential(
                tamperedCiphertext,
                encrypted.iv,
                encrypted.authTag,
                masterSecret
              );
            }).toThrow();
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
