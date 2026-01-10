/**
 * Spiralverse Protocol Types
 * RWP v2 - Rosetta Weave Protocol
 */

/** The six Sacred Tongues - semantic protocol domains */
export type SacredTongue = 'KO' | 'AV' | 'RU' | 'CA' | 'UM' | 'DR';

/** RWP v2 Envelope structure */
export interface RWPEnvelope {
  ver: '2';
  tongue: SacredTongue;
  aad: string;                    // Sorted key=value pairs
  ts: number;                     // Unix timestamp (seconds)
  nonce: string;                  // Base64URL random bytes
  kid: string;                    // Key identifier (tongue-version)
  payload: string;                // Base64URL encoded data
  sigs: Signature[];              // Multi-signature array
}

/** Individual signature within an envelope */
export interface Signature {
  tongue: SacredTongue;
  kid: string;
  sig: string;                    // Base64URL HMAC-SHA256
}

/** Verification result */
export interface VerificationResult {
  valid: boolean;
  tongue?: SacredTongue;
  reason?: VerificationFailureReason;
  details?: Record<string, unknown>;
}

/** Verification failure reasons */
export type VerificationFailureReason =
  | 'INVALID_SIGNATURE'
  | 'EXPIRED_MESSAGE'
  | 'FUTURE_MESSAGE'
  | 'DUPLICATE_NONCE'
  | 'UNKNOWN_KEY'
  | 'INVALID_ENVELOPE'
  | 'MISSING_FIELD'
  | 'INVALID_TONGUE';

/** Governance action levels */
export type ActionLevel = 'SAFE' | 'MODERATE' | 'CRITICAL' | 'FORBIDDEN';

/** Governance decision result */
export interface GovernanceDecision {
  allowed: boolean;
  action: string;
  level: ActionLevel;
  requiredSignatures: number;
  providedSignatures: number;
  tonguesPresent: SacredTongue[];
  reason?: string;
}


/** Tongue metadata and capabilities */
export interface TongueDefinition {
  id: SacredTongue;
  name: string;
  domain: string;
  keywords: string[];
  validPayloadTypes: string[];
}

/** Options for serin() function */
export interface SerinOptions {
  aad?: Record<string, string>;         // Additional authenticated data
  additionalTongues?: SacredTongue[];   // Co-sign with multiple tongues
}

/** Replay check result */
export interface ReplayCheckResult {
  valid: boolean;
  reason?: 'EXPIRED_MESSAGE' | 'FUTURE_MESSAGE' | 'DUPLICATE_NONCE';
}

/** Key rotation result */
export interface KeyRotationResult {
  oldKid: string;
  newKid: string;
  transitionPeriod: number;  // seconds
}

/** Custom error class for Spiralverse operations */
export class SpiralverseError extends Error {
  code: VerificationFailureReason | 'FORBIDDEN_ACTION' | 'INSUFFICIENT_SIGS';
  details?: Record<string, unknown>;
  envelope?: Partial<RWPEnvelope>;

  constructor(
    message: string,
    code: VerificationFailureReason | 'FORBIDDEN_ACTION' | 'INSUFFICIENT_SIGS',
    details?: Record<string, unknown>,
    envelope?: Partial<RWPEnvelope>
  ) {
    super(message);
    this.name = 'SpiralverseError';
    this.code = code;
    this.details = details;
    // Sanitize envelope - never include secrets
    if (envelope) {
      this.envelope = {
        ver: envelope.ver,
        tongue: envelope.tongue,
        aad: envelope.aad,
        ts: envelope.ts,
        kid: envelope.kid,
        // Exclude payload and sigs for security
      };
    }
  }
}

/** Valid Sacred Tongues array for validation */
export const SACRED_TONGUES: readonly SacredTongue[] = ['KO', 'AV', 'RU', 'CA', 'UM', 'DR'] as const;

/** Type guard for SacredTongue */
export function isSacredTongue(value: string): value is SacredTongue {
  return SACRED_TONGUES.includes(value as SacredTongue);
}
