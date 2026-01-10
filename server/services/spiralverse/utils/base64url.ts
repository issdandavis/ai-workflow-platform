/**
 * Base64URL Encoding Utilities
 * URL-safe Base64 encoding for RWP v2 payloads
 * 
 * Base64URL differs from standard Base64:
 * - '+' is replaced with '-'
 * - '/' is replaced with '_'
 * - Padding '=' is removed
 */

/**
 * Encode a Buffer to Base64URL string
 * @param buffer - The buffer to encode
 * @returns Base64URL encoded string
 */
export function encode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a Base64URL string to Buffer
 * @param str - The Base64URL string to decode
 * @returns Decoded buffer
 */
export function decode(str: string): Buffer {
  // Restore standard Base64 characters
  let base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);
  
  return Buffer.from(base64, 'base64');
}

/**
 * Encode a string to Base64URL
 * @param str - The string to encode
 * @returns Base64URL encoded string
 */
export function encodeString(str: string): string {
  return encode(Buffer.from(str, 'utf8'));
}

/**
 * Decode a Base64URL string to UTF-8 string
 * @param str - The Base64URL string to decode
 * @returns Decoded UTF-8 string
 */
export function decodeString(str: string): string {
  return decode(str).toString('utf8');
}

/**
 * Encode a JSON object to Base64URL
 * @param obj - The object to encode
 * @returns Base64URL encoded JSON string
 */
export function encodeJSON(obj: unknown): string {
  return encodeString(JSON.stringify(obj));
}

/**
 * Decode a Base64URL string to JSON object
 * @param str - The Base64URL string to decode
 * @returns Decoded JSON object
 */
export function decodeJSON<T = unknown>(str: string): T {
  return JSON.parse(decodeString(str)) as T;
}
