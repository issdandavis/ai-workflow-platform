/**
 * Property-Based Tests for Spiralverse Multi-Vector Coordination
 * Tests multi-tongue governance, signature combinations, and consensus
 * 
 * Validates: Requirements 4.1-4.7 (Governance), 2.5, 2.7 (Multi-signature)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getTongue,
  getAllTongues,
  isValidTongue,
  getKeywords,
  findTongueByKeyword,
  findTonguesByDomain,
} from '../../server/services/spiralverse/tongueRegistry';
import {
  SACRED_TONGUES,
  type SacredTongue,
  type ActionLevel,
  type GovernanceDecision,
  type Signature,
} from '../../server/services/spiralverse/types';

// Governance matrix from the Codex
const GOVERNANCE_MATRIX: Record<ActionLevel, { minSigs: number; allowedTongues?: SacredTongue[] }> = {
  SAFE: { minSigs: 1 },
  MODERATE: { minSigs: 1, allowedTongues: ['RU', 'UM'] },
  CRITICAL: { minSigs: 2 },
  FORBIDDEN: { minSigs: Infinity }, // Always rejected
};

// Action patterns for classification
const ACTION_PATTERNS: Record<string, ActionLevel> = {
  'read:': 'SAFE',
  'list:': 'SAFE',
  'query:': 'SAFE',
  'create:': 'MODERATE',
  'update:': 'MODERATE',
  'send:': 'MODERATE',
  'delete:': 'CRITICAL',
  'execute:': 'CRITICAL',
  'deploy:': 'CRITICAL',
  'drop:': 'FORBIDDEN',
  'disable_security:': 'FORBIDDEN',
  'bypass:': 'FORBIDDEN',
};

/**
 * Classify an action based on its prefix
 */
function classifyAction(action: string): ActionLevel {
  for (const [prefix, level] of Object.entries(ACTION_PATTERNS)) {
    if (action.startsWith(prefix)) {
      return level;
    }
  }
  return 'SAFE'; // Default to safe for unknown actions
}

/**
 * Simulate governance decision based on signatures
 */
function simulateGovernance(
  action: string,
  signatures: SacredTongue[]
): GovernanceDecision {
  const level = classifyAction(action);
  const uniqueTongues = [...new Set(signatures)];
  const rules = GOVERNANCE_MATRIX[level];

  // FORBIDDEN actions are always rejected
  if (level === 'FORBIDDEN') {
    return {
      allowed: false,
      action,
      level,
      requiredSignatures: Infinity,
      providedSignatures: uniqueTongues.length,
      tonguesPresent: uniqueTongues,
      reason: 'FORBIDDEN_ACTION',
    };
  }

  // Check if we have enough signatures
  const hasEnoughSigs = uniqueTongues.length >= rules.minSigs;

  // For MODERATE, check if at least one signature is from allowed tongues
  let hasAllowedTongue = true;
  if (rules.allowedTongues) {
    hasAllowedTongue = uniqueTongues.some(t => rules.allowedTongues!.includes(t));
  }

  const allowed = hasEnoughSigs && hasAllowedTongue;

  return {
    allowed,
    action,
    level,
    requiredSignatures: rules.minSigs,
    providedSignatures: uniqueTongues.length,
    tonguesPresent: uniqueTongues,
    reason: !allowed
      ? !hasEnoughSigs
        ? 'INSUFFICIENT_SIGNATURES'
        : 'UNAUTHORIZED_TONGUE'
      : undefined,
  };
}

describe('Spiralverse Multi-Vector Coordination - Property Tests', () => {
  // Arbitraries
  const sacredTongueArb = fc.constantFrom(...SACRED_TONGUES);
  const tongueArrayArb = fc.array(sacredTongueArb, { minLength: 0, maxLength: 6 });
  const nonEmptyTongueArrayArb = fc.array(sacredTongueArb, { minLength: 1, maxLength: 6 });

  const safeActionArb = fc.constantFrom('read:data', 'list:users', 'query:status');
  const moderateActionArb = fc.constantFrom('create:user', 'update:config', 'send:message');
  const criticalActionArb = fc.constantFrom('delete:user', 'execute:script', 'deploy:service');
  const forbiddenActionArb = fc.constantFrom('drop:database', 'disable_security:all', 'bypass:auth');

  describe('Property: Tongue Domain Separation', () => {
    it('each tongue has a unique domain', () => {
      const tongues = getAllTongues();
      const domains = tongues.map(t => t.domain);
      const uniqueDomains = new Set(domains);
      expect(uniqueDomains.size).toBe(6);
    });

    it('each tongue has unique keywords (no overlap)', () => {
      const tongues = getAllTongues();
      const allKeywords: string[] = [];
      
      tongues.forEach(tongue => {
        tongue.keywords.forEach(kw => {
          expect(allKeywords).not.toContain(kw);
          allKeywords.push(kw);
        });
      });
    });

    it('keyword lookup is deterministic - same keyword always returns same tongue', () => {
      const tongues = getAllTongues();
      const keywordToTongue = new Map<string, SacredTongue>();
      
      tongues.forEach(tongue => {
        tongue.keywords.forEach(kw => {
          keywordToTongue.set(kw, tongue.id);
        });
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(keywordToTongue.keys())),
          (keyword) => {
            const result1 = findTongueByKeyword(keyword);
            const result2 = findTongueByKeyword(keyword);
            expect(result1).toBe(result2);
            expect(result1).toBe(keywordToTongue.get(keyword));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Governance - SAFE Actions', () => {
    it('SAFE actions require only 1 signature from any tongue', () => {
      fc.assert(
        fc.property(safeActionArb, sacredTongueArb, (action, tongue) => {
          const decision = simulateGovernance(action, [tongue]);
          expect(decision.allowed).toBe(true);
          expect(decision.level).toBe('SAFE');
          expect(decision.requiredSignatures).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('SAFE actions with multiple signatures are still allowed', () => {
      fc.assert(
        fc.property(safeActionArb, nonEmptyTongueArrayArb, (action, tongues) => {
          const decision = simulateGovernance(action, tongues);
          expect(decision.allowed).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('SAFE actions with no signatures are rejected', () => {
      fc.assert(
        fc.property(safeActionArb, (action) => {
          const decision = simulateGovernance(action, []);
          expect(decision.allowed).toBe(false);
          expect(decision.reason).toBe('INSUFFICIENT_SIGNATURES');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Governance - MODERATE Actions', () => {
    it('MODERATE actions require RU or UM tongue', () => {
      fc.assert(
        fc.property(
          moderateActionArb,
          fc.constantFrom<SacredTongue>('RU', 'UM'),
          (action, tongue) => {
            const decision = simulateGovernance(action, [tongue]);
            expect(decision.allowed).toBe(true);
            expect(decision.level).toBe('MODERATE');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('MODERATE actions with only non-RU/UM tongues are rejected', () => {
      fc.assert(
        fc.property(
          moderateActionArb,
          fc.array(fc.constantFrom<SacredTongue>('KO', 'AV', 'CA', 'DR'), { minLength: 1, maxLength: 4 }),
          (action, tongues) => {
            const decision = simulateGovernance(action, tongues);
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toBe('UNAUTHORIZED_TONGUE');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('MODERATE actions with mixed tongues including RU/UM are allowed', () => {
      fc.assert(
        fc.property(
          moderateActionArb,
          fc.constantFrom<SacredTongue>('KO', 'AV', 'CA', 'DR'),
          fc.constantFrom<SacredTongue>('RU', 'UM'),
          (action, otherTongue, authTongue) => {
            const decision = simulateGovernance(action, [otherTongue, authTongue]);
            expect(decision.allowed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Governance - CRITICAL Actions', () => {
    it('CRITICAL actions require 2+ signatures from different tongues', () => {
      // Use tuple of two different tongues
      const twoDistinctTonguesArb = fc.tuple(sacredTongueArb, sacredTongueArb)
        .filter(([t1, t2]) => t1 !== t2);

      fc.assert(
        fc.property(
          criticalActionArb,
          twoDistinctTonguesArb,
          (action, [tongue1, tongue2]) => {
            const decision = simulateGovernance(action, [tongue1, tongue2]);
            expect(decision.allowed).toBe(true);
            expect(decision.level).toBe('CRITICAL');
            expect(decision.providedSignatures).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('CRITICAL actions with only 1 signature are rejected', () => {
      fc.assert(
        fc.property(criticalActionArb, sacredTongueArb, (action, tongue) => {
          const decision = simulateGovernance(action, [tongue]);
          expect(decision.allowed).toBe(false);
          expect(decision.reason).toBe('INSUFFICIENT_SIGNATURES');
        }),
        { numRuns: 100 }
      );
    });

    it('CRITICAL actions with duplicate tongues count as 1 signature', () => {
      fc.assert(
        fc.property(criticalActionArb, sacredTongueArb, (action, tongue) => {
          // Same tongue multiple times should count as 1
          const decision = simulateGovernance(action, [tongue, tongue, tongue]);
          expect(decision.allowed).toBe(false);
          expect(decision.providedSignatures).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Governance - FORBIDDEN Actions Always Rejected', () => {
    it('FORBIDDEN actions are rejected regardless of signatures', () => {
      fc.assert(
        fc.property(forbiddenActionArb, tongueArrayArb, (action, tongues) => {
          const decision = simulateGovernance(action, tongues);
          expect(decision.allowed).toBe(false);
          expect(decision.level).toBe('FORBIDDEN');
          expect(decision.reason).toBe('FORBIDDEN_ACTION');
        }),
        { numRuns: 100 }
      );
    });

    it('FORBIDDEN actions rejected even with all 6 tongues', () => {
      fc.assert(
        fc.property(forbiddenActionArb, (action) => {
          const allTongues: SacredTongue[] = ['KO', 'AV', 'RU', 'CA', 'UM', 'DR'];
          const decision = simulateGovernance(action, allTongues);
          expect(decision.allowed).toBe(false);
          expect(decision.reason).toBe('FORBIDDEN_ACTION');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Multi-Signature Independence', () => {
    it('signature order does not affect governance decision', () => {
      fc.assert(
        fc.property(
          fc.oneof(safeActionArb, moderateActionArb, criticalActionArb),
          nonEmptyTongueArrayArb,
          (action, tongues) => {
            const decision1 = simulateGovernance(action, tongues);
            const reversed = [...tongues].reverse();
            const decision2 = simulateGovernance(action, reversed);
            
            expect(decision1.allowed).toBe(decision2.allowed);
            expect(decision1.level).toBe(decision2.level);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding more valid signatures never reduces permissions', () => {
      fc.assert(
        fc.property(
          fc.oneof(safeActionArb, criticalActionArb),
          nonEmptyTongueArrayArb,
          sacredTongueArb,
          (action, existingTongues, newTongue) => {
            const decision1 = simulateGovernance(action, existingTongues);
            const decision2 = simulateGovernance(action, [...existingTongues, newTongue]);
            
            // If it was allowed before, it should still be allowed
            if (decision1.allowed) {
              expect(decision2.allowed).toBe(true);
            }
            // More signatures should never decrease the count
            expect(decision2.providedSignatures).toBeGreaterThanOrEqual(
              decision1.providedSignatures === decision1.tonguesPresent.length
                ? decision1.providedSignatures
                : 0
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Tongue Coordination Patterns', () => {
    it('KO + AV combination covers orchestration and messaging', () => {
      const koTongue = getTongue('KO');
      const avTongue = getTongue('AV');
      
      expect(koTongue.domain).toContain('Control');
      expect(avTongue.domain).toContain('Messaging');
      
      // Together they can handle mission coordination
      const combinedPayloadTypes = [
        ...koTongue.validPayloadTypes,
        ...avTongue.validPayloadTypes,
      ];
      expect(combinedPayloadTypes).toContain('command');
      expect(combinedPayloadTypes).toContain('message');
    });

    it('RU + UM combination provides full security coverage', () => {
      const ruTongue = getTongue('RU');
      const umTongue = getTongue('UM');
      
      expect(ruTongue.domain).toContain('Policy');
      expect(umTongue.domain).toContain('Security');
      
      // Together they handle authorization and encryption
      const combinedPayloadTypes = [
        ...ruTongue.validPayloadTypes,
        ...umTongue.validPayloadTypes,
      ];
      expect(combinedPayloadTypes).toContain('permission');
      expect(combinedPayloadTypes).toContain('credential');
    });

    it('CA + DR combination covers computation and data structures', () => {
      const caTongue = getTongue('CA');
      const drTongue = getTongue('DR');
      
      expect(caTongue.domain).toContain('Logic');
      expect(drTongue.domain).toContain('Types');
      
      // Together they handle algorithms and schemas
      const combinedPayloadTypes = [
        ...caTongue.validPayloadTypes,
        ...drTongue.validPayloadTypes,
      ];
      expect(combinedPayloadTypes).toContain('algorithm');
      expect(combinedPayloadTypes).toContain('schema');
    });
  });

  describe('Property: Consensus Requirements', () => {
    it('full consensus (all 6 tongues) always meets any non-forbidden requirement', () => {
      const allTongues: SacredTongue[] = ['KO', 'AV', 'RU', 'CA', 'UM', 'DR'];
      
      fc.assert(
        fc.property(
          fc.oneof(safeActionArb, moderateActionArb, criticalActionArb),
          (action) => {
            const decision = simulateGovernance(action, allTongues);
            expect(decision.allowed).toBe(true);
            expect(decision.providedSignatures).toBe(6);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('minimum viable consensus for each level', () => {
      // SAFE: 1 any tongue
      expect(simulateGovernance('read:data', ['KO']).allowed).toBe(true);
      
      // MODERATE: 1 RU or UM
      expect(simulateGovernance('create:user', ['RU']).allowed).toBe(true);
      expect(simulateGovernance('create:user', ['UM']).allowed).toBe(true);
      
      // CRITICAL: 2 different tongues
      expect(simulateGovernance('delete:user', ['KO', 'RU']).allowed).toBe(true);
    });
  });
});
