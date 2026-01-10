/**
 * Spelltext Renderer - Human-readable signature display
 * Renders cryptographic signatures in a mystical, readable format
 */

import type { Signature, SacredTongue } from '../types';

/** Tongue display names */
const TONGUE_NAMES: Record<SacredTongue, string> = {
  KO: "Kor'aelin",
  AV: 'Avali',
  RU: 'Runethic',
  CA: 'Cassisivadan',
  UM: 'Umbroth',
  DR: 'Draumric',
};

/** Tongue domain descriptions */
const TONGUE_DOMAINS: Record<SacredTongue, string> = {
  KO: 'Control',
  AV: 'I/O',
  RU: 'Policy',
  CA: 'Logic',
  UM: 'Security',
  DR: 'Types',
};

/** Tongue symbols for visual display */
const TONGUE_SYMBOLS: Record<SacredTongue, string> = {
  KO: '👑',
  AV: '📜',
  RU: '🛡️',
  CA: '⚙️',
  UM: '🔒',
  DR: '📐',
};

/**
 * Render a signature as human-readable spelltext
 * @param signature - The signature to render
 * @returns Human-readable signature string
 */
export function renderSigAsSpelltext(signature: Signature): string {
  const name = TONGUE_NAMES[signature.tongue];
  const domain = TONGUE_DOMAINS[signature.tongue];
  const symbol = TONGUE_SYMBOLS[signature.tongue];
  
  // Truncate signature for display (first 8 and last 4 chars)
  const sigPreview = signature.sig.length > 16
    ? `${signature.sig.slice(0, 8)}...${signature.sig.slice(-4)}`
    : signature.sig;
  
  return `${symbol} [${signature.tongue}] ${name} (${domain}) | Key: ${signature.kid} | Sig: ${sigPreview}`;
}

/**
 * Render multiple signatures as a formatted block
 * @param signatures - Array of signatures
 * @returns Multi-line formatted string
 */
export function renderSignatureBlock(signatures: Signature[]): string {
  if (signatures.length === 0) {
    return '⚠️ No signatures present';
  }
  
  const header = `═══ Spiralverse Signatures (${signatures.length}) ═══`;
  const lines = signatures.map((sig, i) => `  ${i + 1}. ${renderSigAsSpelltext(sig)}`);
  const footer = '═'.repeat(header.length);
  
  return [header, ...lines, footer].join('\n');
}

/**
 * Get tongue display info
 * @param tongue - The sacred tongue
 * @returns Display information object
 */
export function getTongueDisplay(tongue: SacredTongue): {
  name: string;
  domain: string;
  symbol: string;
} {
  return {
    name: TONGUE_NAMES[tongue],
    domain: TONGUE_DOMAINS[tongue],
    symbol: TONGUE_SYMBOLS[tongue],
  };
}

/**
 * Format a governance decision as spelltext
 * @param decision - The governance decision
 * @returns Human-readable decision string
 */
export function renderGovernanceDecision(decision: {
  allowed: boolean;
  action: string;
  level: string;
  tonguesPresent: SacredTongue[];
  reason?: string;
}): string {
  const status = decision.allowed ? '✅ GRANTED' : '❌ DENIED';
  const tongues = decision.tonguesPresent
    .map(t => `${TONGUE_SYMBOLS[t]} ${t}`)
    .join(', ') || 'none';
  
  let result = `${status} | Action: ${decision.action} | Level: ${decision.level} | Tongues: [${tongues}]`;
  
  if (decision.reason) {
    result += ` | Reason: ${decision.reason}`;
  }
  
  return result;
}
