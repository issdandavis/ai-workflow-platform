/**
 * Property Test: Webhook Signature Verification
 * Validates: Requirements 3.3 - HMAC-SHA256 signature verification
 */

import * as fc from "fast-check";
import { test, expect, describe } from "vitest";
import crypto from "crypto";

// Signature functions matching zapierService.ts
function signPayload(payload: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string, secretKey: string): boolean {
  const expectedSignature = signPayload(payload, secretKey);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

describe("Webhook Signature Property Tests", () => {
  const secretKeyArbitrary = fc.string({ minLength: 32, maxLength: 64 })
    .map(s => s.replace(/[^a-zA-Z0-9]/g, 'x'));

  const payloadArbitrary = fc.record({
    id: fc.uuid(),
    type: fc.constantFrom("user.created", "project.created", "agent_run.completed"),
    orgId: fc.uuid(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
    data: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }),
  }).map(p => JSON.stringify(p));

  test("Property 5: Valid signature verifies correctly", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        secretKeyArbitrary,
        (payload, secretKey) => {
          const signature = signPayload(payload, secretKey);
          const isValid = verifySignature(payload, signature, secretKey);
          
          expect(isValid).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 5: Wrong secret key fails verification", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        secretKeyArbitrary,
        secretKeyArbitrary,
        (payload, secretKey1, secretKey2) => {
          fc.pre(secretKey1 !== secretKey2);
          
          const signature = signPayload(payload, secretKey1);
          const isValid = verifySignature(payload, signature, secretKey2);
          
          expect(isValid).toBe(false);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 5: Tampered payload fails verification", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        secretKeyArbitrary,
        fc.string({ minLength: 1, maxLength: 10 }),
        (payload, secretKey, tamperString) => {
          const signature = signPayload(payload, secretKey);
          const tamperedPayload = payload + tamperString;
          
          const isValid = verifySignature(tamperedPayload, signature, secretKey);
          
          expect(isValid).toBe(false);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 5: Signature is deterministic", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        secretKeyArbitrary,
        (payload, secretKey) => {
          const signature1 = signPayload(payload, secretKey);
          const signature2 = signPayload(payload, secretKey);
          
          expect(signature1).toBe(signature2);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 5: Different payloads produce different signatures", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        payloadArbitrary,
        secretKeyArbitrary,
        (payload1, payload2, secretKey) => {
          fc.pre(payload1 !== payload2);
          
          const signature1 = signPayload(payload1, secretKey);
          const signature2 = signPayload(payload2, secretKey);
          
          expect(signature1).not.toBe(signature2);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 5: Signature is hex-encoded", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        secretKeyArbitrary,
        (payload, secretKey) => {
          const signature = signPayload(payload, secretKey);
          
          // Should be valid hex
          expect(/^[0-9a-f]+$/i.test(signature)).toBe(true);
          
          // SHA256 produces 64 hex characters
          expect(signature.length).toBe(64);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test("Property 5: Invalid hex signature fails gracefully", () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        secretKeyArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }),
        (payload, secretKey, invalidSignature) => {
          // Non-hex strings should fail verification without throwing
          const isValid = verifySignature(payload, invalidSignature, secretKey);
          
          expect(isValid).toBe(false);
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});

// Export for use in other tests
export { signPayload, verifySignature };
