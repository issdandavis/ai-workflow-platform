/**
 * Cryptographic Helpers
 * HMAC-SHA256 signing and constant-time comparison
 */

import crypto from 'crypto';
import { encode } from './base64url';

/**
 * Generate a cryptographically random nonce
 * @param bytes - Number of random bytes (minimum 16)
 * @returns Base64URL encoded nonce
 */
export function generateNonce(bytes: number = 16): string {
  if (bytes < 16) {
    throw new Error('Nonce must be at least 16 bytes for security');
  }
  const buffer = crypto.randomBytes(bytes);
  return encode(buffer);
}

/**
 * Sign data using HMAC-SHA256
 * @param key - The signing key
 * @param data - The data to sign
 * @returns Base64URL encoded signature
 */
export function hmacSign(key: Buffer, data: string): string {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data, 'utf8');
  return encode(hmac.digest());
}

/**
 * Constant-time comparison of two buffers
 * Prevents timing attacks by always comparing all bytes
 * @param a - First buffer
 * @param b - Second buffer
 * @returns true if buffers are equal
 */
export function constantTimeCompare(a: Buffer, b: Buffer): boolean {
  // If lengths differ, still do a comparison to maintain constant time
  // but return false
  if (a.length !== b.length) {
    // Compare against itself to maintain timing consistency
    crypto.timingSafeEqual(a, a);
    return false;
  }
  
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verify an HMAC-SHA256 signature using constant-time comparison
 * @param key - The signing key
 * @param data - The original data
 * @param signature - The Base64URL encoded signature to verify
 * @returns true if signature is valid
 */
export function verifyHmac(key: Buffer, data: string, signature: string): boolean {
  const expectedSig = hmacSign(key, data);
  const expectedBuffer = Buffer.from(expectedSig, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');
  
  return constantTimeCompare(expectedBuffer, actualBuffer);
}

/**
 * Derive a domain-separated key from a master key
 * @param masterKey - The master key
 * @param domain - The domain identifier (e.g., tongue name)
 * @returns Derived key buffer
 */
export function deriveKey(masterKey: Buffer, domain: string): Buffer {
  return crypto.createHmac('sha256', masterKey)
    .update(`spiralverse:${domain}`)
    .digest();
}

/**
 * Get current Unix timestamp in seconds
 * @returns Unix timestamp
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
