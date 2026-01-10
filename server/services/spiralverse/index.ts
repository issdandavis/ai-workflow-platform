/**
 * Spiralverse Protocol SDK
 * RWP v2 - Rosetta Weave Protocol
 * 
 * Cryptographic AI-to-AI communication with multi-signature governance
 */

// Types
export type {
  SacredTongue,
  RWPEnvelope,
  Signature,
  VerificationResult,
  VerificationFailureReason,
  ActionLevel,
  GovernanceDecision,
  TongueDefinition,
  SerinOptions,
  ReplayCheckResult,
  KeyRotationResult,
} from './types';

export { SpiralverseError, SACRED_TONGUES, isSacredTongue } from './types';

// Tongue Registry
export {
  getTongue,
  isValidTongue,
  getKeywords,
  validatePayload,
  getAllTongues,
  findTongueByKeyword,
  findTonguesByDomain,
} from './tongueRegistry';

// Utilities
export { encode as base64UrlEncode, decode as base64UrlDecode } from './utils/base64url';
export { hmacSign, generateNonce, constantTimeCompare } from './utils/crypto';
export { renderSigAsSpelltext } from './utils/spelltext';

// Core SDK (to be implemented)
// export { serin, verifyRWP2, verifyAllSignatures, enforceRoundtable } from './spiralverseSDK';

// Key management (to be implemented)
// export { rotateKey, getKeyManager } from './keyManager';

// Adapters (to be implemented)
// export { FleetSpiralverseAdapter } from './adapters/fleetAdapter';
// export { RoundtableSpiralverseAdapter } from './adapters/roundtableAdapter';
