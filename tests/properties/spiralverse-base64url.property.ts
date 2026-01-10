/**
 * Property Test: Base64URL Encoding Round-Trip
 * Feature: spiralverse-protocol, Property 10: Base64URL Encoding Correctness
 * Validates: Requirements 1.3
 */

import * as fc from 'fast-check';
import { test, expect, describe } from 'vitest';
import { encode, decode, encodeString, decodeString, encodeJSON, decodeJSON } from '../../server/services/spiralverse/utils/base64url';

describe('Spiralverse Base64URL Property Tests', () => {
  /**
   * Property 10: Base64URL Encoding Correctness
   * For any binary payload, the Base64URL encoding should be reversible
   * and produce the original bytes when decoded.
   */
  test('Property 10: Buffer round-trip produces original bytes', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 1000 }),
        (bytes) => {
          const buffer = Buffer.from(bytes);
          const encoded = encode(buffer);
          const decoded = decode(encoded);
          
          // Round-trip produces original
          expect(decoded.equals(buffer)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: String round-trip produces original string', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (str) => {
          const encoded = encodeString(str);
          const decoded = decodeString(encoded);
          
          // Round-trip produces original
          expect(decoded).toBe(str);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: JSON round-trip produces equivalent object', () => {
    fc.assert(
      fc.property(
        fc.jsonValue(),
        (obj) => {
          const encoded = encodeJSON(obj);
          const decoded = decodeJSON(encoded);
          
          // Round-trip produces equivalent object
          // Note: JSON.stringify normalizes -0 to 0, so we compare stringified versions
          expect(JSON.stringify(decoded)).toBe(JSON.stringify(obj));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Encoded string is URL-safe (no +, /, or =)', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 500 }),
        (bytes) => {
          const buffer = Buffer.from(bytes);
          const encoded = encode(buffer);
          
          // Should not contain URL-unsafe characters
          expect(encoded).not.toMatch(/[+/=]/);
          
          // Should only contain URL-safe Base64 characters
          expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Encoding is deterministic', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 500 }),
        (bytes) => {
          const buffer = Buffer.from(bytes);
          const encoded1 = encode(buffer);
          const encoded2 = encode(buffer);
          
          // Same input produces same output
          expect(encoded1).toBe(encoded2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Empty buffer encodes to empty string', () => {
    const buffer = Buffer.alloc(0);
    const encoded = encode(buffer);
    expect(encoded).toBe('');
    
    const decoded = decode('');
    expect(decoded.length).toBe(0);
  });

  test('Property 10: Unicode strings round-trip correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (str) => {
          const encoded = encodeString(str);
          const decoded = decodeString(encoded);
          
          expect(decoded).toBe(str);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
