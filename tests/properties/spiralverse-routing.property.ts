import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getTongue,
  getAllTongues,
  isValidTongue,
  getKeywords,
  validatePayload,
  findTongueByKeyword,
  findTonguesByDomain,
} from '../../server/services/spiralverse/tongueRegistry';
import {
  SACRED_TONGUES,
  type SacredTongue,
} from '../../server/services/spiralverse/types';

/**
 * Property-Based Tests for Spiralverse Message Routing
 * Tests tongue selection, domain routing, and message flow coordination
 * Validates: Requirements 5.1-5.8 (Tongue Semantics), 7.1-7.7 (Fleet Integration)
 */

const MESSAGE_TYPE_ROUTING: Record<string, SacredTongue> = {
  'mission.start': 'KO',
  'mission.complete': 'KO',
  'agent.summon': 'KO',
  'task.assign': 'KO',
  'message.send': 'AV',
  'message.broadcast': 'AV',
  'data.stream': 'AV',
  'notification.push': 'AV',
  'policy.apply': 'RU',
  'permission.grant': 'RU',
  'permission.revoke': 'RU',
  'constraint.set': 'RU',
  'compute.execute': 'CA',
  'decision.evaluate': 'CA',
  'condition.check': 'CA',
  'algorithm.run': 'CA',
  'secret.store': 'UM',
  'credential.encrypt': 'UM',
  'sandbox.create': 'UM',
  'audit.log': 'UM',
  'schema.define': 'DR',
  'type.validate': 'DR',
  'struct.create': 'DR',
  'interface.declare': 'DR',
};

function routeMessage(messageType: string): SacredTongue | undefined {
  return MESSAGE_TYPE_ROUTING[messageType];
}

function canHandleDomain(tongue: SacredTongue, domain: string): boolean {
  const definition = getTongue(tongue);
  return definition.domain.toLowerCase().includes(domain.toLowerCase());
}

function recommendTongueForPayload(payload: { type?: string }): SacredTongue | undefined {
  if (!payload.type) return undefined;
  const tongues = getAllTongues();
  for (const tongue of tongues) {
    if (tongue.validPayloadTypes.includes(payload.type)) {
      return tongue.id;
    }
  }
  return undefined;
}

describe('Spiralverse Message Routing', () => {
  const sacredTongueArb = fc.constantFrom(...SACRED_TONGUES);
  const messageTypeArb = fc.constantFrom(...Object.keys(MESSAGE_TYPE_ROUTING));

  describe('Message Type Routing', () => {
    it('each message type routes to exactly one tongue', () => {
      fc.assert(
        fc.property(messageTypeArb, (messageType) => {
          const tongue = routeMessage(messageType);
          expect(tongue).toBeDefined();
          expect(isValidTongue(tongue!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('routing is deterministic', () => {
      fc.assert(
        fc.property(messageTypeArb, (messageType) => {
          expect(routeMessage(messageType)).toBe(routeMessage(messageType));
        }),
        { numRuns: 100 }
      );
    });

    it('all tongues have routable message types', () => {
      const routedTongues = new Set(Object.values(MESSAGE_TYPE_ROUTING));
      SACRED_TONGUES.forEach(tongue => {
        expect(routedTongues.has(tongue)).toBe(true);
      });
    });
  });

  describe('Domain-Based Routing', () => {
    it('KO handles control domains', () => {
      expect(canHandleDomain('KO', 'control')).toBe(true);
      expect(canHandleDomain('KO', 'orchestration')).toBe(true);
    });

    it('AV handles messaging domains', () => {
      expect(canHandleDomain('AV', 'messaging')).toBe(true);
    });

    it('RU handles policy domains', () => {
      expect(canHandleDomain('RU', 'policy')).toBe(true);
    });

    it('UM handles security domains', () => {
      expect(canHandleDomain('UM', 'security')).toBe(true);
    });

    it('findTonguesByDomain returns results for valid domains', () => {
      const validDomains = ['Control', 'Security', 'Logic', 'Policy', 'Types'];
      validDomains.forEach(domain => {
        expect(findTonguesByDomain(domain).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Payload Type Validation', () => {
    it('tongues accept their own payload types', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          const definition = getTongue(tongue);
          definition.validPayloadTypes.forEach(payloadType => {
            expect(validatePayload(tongue, { type: payloadType })).toBe(true);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('payload recommendation matches tongue capabilities', () => {
      const testPayloads = [
        { type: 'command', expected: 'KO' },
        { type: 'message', expected: 'AV' },
        { type: 'policy', expected: 'RU' },
        { type: 'computation', expected: 'CA' },
        { type: 'secret', expected: 'UM' },
        { type: 'schema', expected: 'DR' },
      ];
      testPayloads.forEach(({ type, expected }) => {
        expect(recommendTongueForPayload({ type })).toBe(expected);
      });
    });
  });

  describe('Fleet Engine Routing', () => {
    it('mission messages route to KO', () => {
      ['mission.start', 'mission.complete', 'agent.summon'].forEach(msg => {
        expect(routeMessage(msg)).toBe('KO');
      });
    });

    it('data exchange routes to AV', () => {
      ['message.send', 'data.stream'].forEach(msg => {
        expect(routeMessage(msg)).toBe('AV');
      });
    });

    it('security ops route to UM', () => {
      ['secret.store', 'credential.encrypt'].forEach(msg => {
        expect(routeMessage(msg)).toBe('UM');
      });
    });
  });

  describe('Cross-Tongue Coordination', () => {
    it('mission workflow uses correct tongue sequence', () => {
      const workflow = [
        { step: 'mission.start', expectedTongue: 'KO' },
        { step: 'policy.apply', expectedTongue: 'RU' },
        { step: 'message.send', expectedTongue: 'AV' },
        { step: 'compute.execute', expectedTongue: 'CA' },
        { step: 'secret.store', expectedTongue: 'UM' },
        { step: 'schema.define', expectedTongue: 'DR' },
        { step: 'mission.complete', expectedTongue: 'KO' },
      ];
      workflow.forEach(({ step, expectedTongue }) => {
        expect(routeMessage(step)).toBe(expectedTongue);
      });
    });

    it('complete workflow uses all six tongues', () => {
      const msgs = ['mission.start', 'message.send', 'policy.apply', 
                    'compute.execute', 'secret.store', 'schema.define'];
      const usedTongues = new Set(msgs.map(msg => routeMessage(msg)));
      expect(usedTongues.size).toBe(6);
    });
  });

  describe('Keyword Discovery', () => {
    it('keywords uniquely identify their tongue', () => {
      fc.assert(
        fc.property(sacredTongueArb, (tongue) => {
          getKeywords(tongue).forEach(keyword => {
            expect(findTongueByKeyword(keyword)).toBe(tongue);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('keyword search is case-insensitive', () => {
      expect(findTongueByKeyword('VEL')).toBe('KO');
      expect(findTongueByKeyword('Serin')).toBe('AV');
      expect(findTongueByKeyword('KHAR')).toBe('RU');
    });
  });
});
