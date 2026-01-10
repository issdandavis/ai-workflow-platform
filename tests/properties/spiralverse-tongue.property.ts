/**
 * Property-Based Tests for Spiralverse Tongue Registry
 * Property 9: Tongue Validation
 * Validates: Requirements 1.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getTongue,
  isValidTongue,
  getKeywords,
  validatePayload,
  getAllTongues,
  findTongueByKeyword,
  findTonguesByDomain,
} from '../../server/services/spiralverse/tongueRegistry';
import { SACRED_TONGUES, type SacredTongue } from '../../server/services/spiralverse/types';

describe('Spiralverse Tongue Registry - Property Tests', () => {
  // Arbitrary for valid Sacred Tongues
  const sacredTongueArb = fc.constantFrom(...SACRED_TONGUES);

  // Arbitrary for invalid tongue strings
  const invalidTongueArb = fc.string().filter(s => !SACRED_TONGUES.includes(s as SacredTongue));

  describe('Property 9: Tongue Validation', () => {
    it('isValidTongue returns true for all valid Sacred Tongues', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          expect(isValidTongue(tongue)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('isValidTongue returns false for invalid strings', () => {
      fc.assert(
        fc.property(invalidTongueArb, (str) => {
          expect(isValidTongue(str)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('getTongue returns valid definition for all Sacred Tongues', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          const definition = getTongue(tongue);
          expect(definition.id).toBe(tongue);
          expect(definition.name).toBeTruthy();
          expect(definition.domain).toBeTruthy();
          expect(definition.keywords.length).toBeGreaterThan(0);
          expect(definition.validPayloadTypes.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('getKeywords returns non-empty array for all Sacred Tongues', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          const keywords = getKeywords(tongue);
          expect(Array.isArray(keywords)).toBe(true);
          expect(keywords.length).toBeGreaterThan(0);
          keywords.forEach(kw => expect(typeof kw).toBe('string'));
        }),
        { numRuns: 100 }
      );
    });

    it('each tongue has exactly 5 keywords', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          const keywords = getKeywords(tongue);
          expect(keywords.length).toBe(5);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Payload Validation Properties', () => {
    it('primitive payloads are always valid for any tongue', () => {
      const primitiveArb = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.double(),
        fc.boolean()
      );

      fc.assert(
        fc.property(sacredTongueArb, primitiveArb, (tongue, payload) => {
          expect(validatePayload(tongue, payload)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('null and undefined payloads are always invalid', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          expect(validatePayload(tongue, null)).toBe(false);
          expect(validatePayload(tongue, undefined)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('objects without type field are valid', () => {
      const objectWithoutTypeArb = fc.record({
        data: fc.string(),
        value: fc.integer(),
      });

      fc.assert(
        fc.property(sacredTongueArb, objectWithoutTypeArb, (tongue, payload) => {
          expect(validatePayload(tongue, payload)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('objects with valid type field are accepted', () => {
      // Test KO tongue with valid payload types
      const koPayloadArb = fc.record({
        type: fc.constantFrom('command', 'mission', 'orchestration', 'status', 'coordination'),
        data: fc.string(),
      });

      fc.assert(
        fc.property(koPayloadArb, (payload) => {
          expect(validatePayload('KO', payload)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('objects with invalid type field are rejected', () => {
      const invalidTypeArb = fc.record({
        type: fc.constant('invalid_type_xyz'),
        data: fc.string(),
      });

      fc.assert(
        fc.property(sacredTongueArb, invalidTypeArb, (tongue, payload) => {
          expect(validatePayload(tongue, payload)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Tongue Lookup Properties', () => {
    it('findTongueByKeyword finds correct tongue for known keywords', () => {
      // Test specific known keyword-tongue mappings
      const knownMappings: Array<[string, SacredTongue]> = [
        ['vel', 'KO'],
        ['serin', 'AV'],
        ['khar', 'RU'],
        ['klik', 'CA'],
        ['veil', 'UM'],
        ['tharn', 'DR'],
      ];

      knownMappings.forEach(([keyword, expectedTongue]) => {
        expect(findTongueByKeyword(keyword)).toBe(expectedTongue);
      });
    });

    it('findTongueByKeyword returns undefined for unknown keywords', () => {
      const unknownKeywordArb = fc.string().filter(s => {
        // Filter out any string that might match a real keyword
        const allKeywords = getAllTongues().flatMap(t => t.keywords);
        return !allKeywords.some(k => k.toLowerCase() === s.toLowerCase());
      });

      fc.assert(
        fc.property(unknownKeywordArb, (keyword) => {
          expect(findTongueByKeyword(keyword)).toBeUndefined();
        }),
        { numRuns: 50 }
      );
    });

    it('getAllTongues returns exactly 6 tongues', () => {
      const tongues = getAllTongues();
      expect(tongues.length).toBe(6);
      expect(new Set(tongues.map(t => t.id)).size).toBe(6);
    });

    it('findTonguesByDomain returns results for valid domain substrings', () => {
      const domainSubstrings = ['Control', 'Security', 'Logic', 'Policy', 'Types', 'Messaging'];
      
      domainSubstrings.forEach(domain => {
        const results = findTonguesByDomain(domain);
        expect(results.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Immutability Properties', () => {
    it('getTongue returns a copy that cannot mutate the registry', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          const def1 = getTongue(tongue);
          def1.name = 'MUTATED';
          def1.keywords.push('mutated');
          
          const def2 = getTongue(tongue);
          expect(def2.name).not.toBe('MUTATED');
          expect(def2.keywords).not.toContain('mutated');
        }),
        { numRuns: 100 }
      );
    });

    it('getKeywords returns a copy that cannot mutate the registry', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          const keywords1 = getKeywords(tongue);
          keywords1.push('mutated');
          
          const keywords2 = getKeywords(tongue);
          expect(keywords2).not.toContain('mutated');
        }),
        { numRuns: 100 }
      );
    });
  });
});
