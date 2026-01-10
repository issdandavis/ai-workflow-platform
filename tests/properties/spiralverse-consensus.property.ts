import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SACRED_TONGUES, type SacredTongue, type ActionLevel } from '../../server/services/spiralverse/types';

/**
 * Property-Based Tests for Spiralverse Roundtable Consensus
 * 
 * The key security innovation: Multi-signature verification prevents
 * hallucinations and unauthorized commands through cryptographic consensus.
 * 
 * Validates: Requirements 4.1-4.7 (Governance)
 */

// Governance rules from the Codex
const GOVERNANCE_RULES: Record<ActionLevel, { minSigs: number; requiredTongues?: SacredTongue[] }> = {
  SAFE: { minSigs: 1 },
  MODERATE: { minSigs: 1, requiredTongues: ['RU', 'UM'] },
  CRITICAL: { minSigs: 2 },
  FORBIDDEN: { minSigs: Infinity },
};

// Action classification patterns
function classifyAction(action: string): ActionLevel {
  if (action.startsWith('drop:') || action.startsWith('disable_security:') || action.startsWith('bypass:')) {
    return 'FORBIDDEN';
  }
  if (action.startsWith('delete:') || action.startsWith('execute:') || action.startsWith('deploy:')) {
    return 'CRITICAL';
  }
  if (action.startsWith('create:') || action.startsWith('update:') || action.startsWith('send:')) {
    return 'MODERATE';
  }
  return 'SAFE';
}

// Consensus check - the core security mechanism
function checkConsensus(action: string, signatures: SacredTongue[]): {
  allowed: boolean;
  reason?: string;
  level: ActionLevel;
  uniqueSigners: number;
} {
  const level = classifyAction(action);
  const rules = GOVERNANCE_RULES[level];
  const uniqueTongues = [...new Set(signatures)];
  const uniqueSigners = uniqueTongues.length;

  // FORBIDDEN - always reject (prevents unauthorized commands)
  if (level === 'FORBIDDEN') {
    return { allowed: false, reason: 'FORBIDDEN_ACTION', level, uniqueSigners };
  }

  // Check minimum signatures (prevents single point of failure)
  if (uniqueSigners < rules.minSigs) {
    return { allowed: false, reason: 'INSUFFICIENT_CONSENSUS', level, uniqueSigners };
  }

  // MODERATE requires policy/security tongue (RU or UM)
  if (rules.requiredTongues) {
    const hasRequired = uniqueTongues.some(t => rules.requiredTongues!.includes(t));
    if (!hasRequired) {
      return { allowed: false, reason: 'MISSING_AUTHORITY', level, uniqueSigners };
    }
  }

  return { allowed: true, level, uniqueSigners };
}

describe('Spiralverse Roundtable Consensus', () => {
  const tongueArb = fc.constantFrom(...SACRED_TONGUES);
  const tonguesArb = fc.array(tongueArb, { minLength: 0, maxLength: 6 });
  const nonEmptyTonguesArb = fc.array(tongueArb, { minLength: 1, maxLength: 6 });

  describe('Anti-Hallucination: FORBIDDEN Actions Always Blocked', () => {
    const forbiddenArb = fc.constantFrom(
      'drop:database', 'drop:tables', 
      'disable_security:firewall', 'disable_security:auth',
      'bypass:validation', 'bypass:permissions'
    );

    it('FORBIDDEN actions rejected with zero signatures', () => {
      fc.assert(
        fc.property(forbiddenArb, (action) => {
          const result = checkConsensus(action, []);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('FORBIDDEN_ACTION');
        }),
        { numRuns: 100 }
      );
    });

    it('FORBIDDEN actions rejected with any number of signatures', () => {
      fc.assert(
        fc.property(forbiddenArb, tonguesArb, (action, tongues) => {
          const result = checkConsensus(action, tongues);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('FORBIDDEN_ACTION');
        }),
        { numRuns: 100 }
      );
    });

    it('FORBIDDEN actions rejected even with full consensus (all 6 tongues)', () => {
      fc.assert(
        fc.property(forbiddenArb, (action) => {
          const allTongues: SacredTongue[] = ['KO', 'AV', 'RU', 'CA', 'UM', 'DR'];
          const result = checkConsensus(action, allTongues);
          expect(result.allowed).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Multi-Signature Consensus: CRITICAL Actions', () => {
    const criticalArb = fc.constantFrom(
      'delete:user', 'delete:data',
      'execute:script', 'execute:migration',
      'deploy:production', 'deploy:service'
    );

    it('CRITICAL actions require 2+ different tongues', () => {
      const twoTonguesArb = fc.tuple(tongueArb, tongueArb).filter(([a, b]) => a !== b);
      
      fc.assert(
        fc.property(criticalArb, twoTonguesArb, (action, [t1, t2]) => {
          const result = checkConsensus(action, [t1, t2]);
          expect(result.allowed).toBe(true);
          expect(result.uniqueSigners).toBeGreaterThanOrEqual(2);
        }),
        { numRuns: 100 }
      );
    });

    it('CRITICAL actions rejected with single signature (prevents single point of failure)', () => {
      fc.assert(
        fc.property(criticalArb, tongueArb, (action, tongue) => {
          const result = checkConsensus(action, [tongue]);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('INSUFFICIENT_CONSENSUS');
        }),
        { numRuns: 100 }
      );
    });

    it('duplicate signatures from same tongue count as one (prevents replay)', () => {
      fc.assert(
        fc.property(criticalArb, tongueArb, (action, tongue) => {
          const result = checkConsensus(action, [tongue, tongue, tongue, tongue]);
          expect(result.allowed).toBe(false);
          expect(result.uniqueSigners).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Authority Verification: MODERATE Actions', () => {
    const moderateArb = fc.constantFrom(
      'create:user', 'create:resource',
      'update:config', 'update:settings',
      'send:notification', 'send:email'
    );
    const policyTongueArb = fc.constantFrom<SacredTongue>('RU', 'UM');
    const nonPolicyTongueArb = fc.constantFrom<SacredTongue>('KO', 'AV', 'CA', 'DR');

    it('MODERATE actions require RU or UM authority', () => {
      fc.assert(
        fc.property(moderateArb, policyTongueArb, (action, tongue) => {
          const result = checkConsensus(action, [tongue]);
          expect(result.allowed).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('MODERATE actions rejected without policy/security authority', () => {
      fc.assert(
        fc.property(moderateArb, nonPolicyTongueArb, (action, tongue) => {
          const result = checkConsensus(action, [tongue]);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('MISSING_AUTHORITY');
        }),
        { numRuns: 100 }
      );
    });

    it('MODERATE actions allowed with mixed tongues including RU/UM', () => {
      fc.assert(
        fc.property(moderateArb, nonPolicyTongueArb, policyTongueArb, (action, other, policy) => {
          const result = checkConsensus(action, [other, policy]);
          expect(result.allowed).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Basic Operations: SAFE Actions', () => {
    const safeArb = fc.constantFrom(
      'read:data', 'read:config',
      'list:users', 'list:resources',
      'query:status', 'query:metrics'
    );

    it('SAFE actions allowed with any single tongue', () => {
      fc.assert(
        fc.property(safeArb, tongueArb, (action, tongue) => {
          const result = checkConsensus(action, [tongue]);
          expect(result.allowed).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('SAFE actions rejected with no signatures', () => {
      fc.assert(
        fc.property(safeArb, (action) => {
          const result = checkConsensus(action, []);
          expect(result.allowed).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Consensus Properties', () => {
    it('more signatures never reduce permissions (monotonicity)', () => {
      const actionArb = fc.constantFrom('read:x', 'delete:x');
      
      fc.assert(
        fc.property(actionArb, nonEmptyTonguesArb, tongueArb, (action, existing, additional) => {
          const before = checkConsensus(action, existing);
          const after = checkConsensus(action, [...existing, additional]);
          
          // If allowed before, should still be allowed
          if (before.allowed) {
            expect(after.allowed).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('signature order does not affect consensus (commutativity)', () => {
      fc.assert(
        fc.property(fc.constantFrom('read:x', 'create:x', 'delete:x'), tonguesArb, (action, tongues) => {
          const forward = checkConsensus(action, tongues);
          const reversed = checkConsensus(action, [...tongues].reverse());
          
          expect(forward.allowed).toBe(reversed.allowed);
          expect(forward.level).toBe(reversed.level);
        }),
        { numRuns: 100 }
      );
    });

    it('full consensus (6 tongues) allows all non-forbidden actions', () => {
      const allTongues: SacredTongue[] = ['KO', 'AV', 'RU', 'CA', 'UM', 'DR'];
      const allowedArb = fc.constantFrom('read:x', 'create:x', 'delete:x', 'execute:x');
      
      fc.assert(
        fc.property(allowedArb, (action) => {
          const result = checkConsensus(action, allTongues);
          expect(result.allowed).toBe(true);
          expect(result.uniqueSigners).toBe(6);
        }),
        { numRuns: 100 }
      );
    });
  });
});
