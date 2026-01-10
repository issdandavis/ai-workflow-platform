/**
 * Tongue Registry - Sacred Tongue definitions and validation
 * Implements the Six Sacred Tongues of the Spiralverse Protocol
 */

import { type SacredTongue, type TongueDefinition, SACRED_TONGUES, isSacredTongue } from './types';

/** Complete definitions for all six Sacred Tongues */
const TONGUE_DEFINITIONS: Record<SacredTongue, TongueDefinition> = {
  KO: {
    id: 'KO',
    name: 'Kor\'aelin',
    domain: 'Control & Orchestration',
    keywords: ['vel', 'sil', 'keth', 'dor', 'mira'],
    validPayloadTypes: ['command', 'mission', 'orchestration', 'status', 'coordination'],
  },
  AV: {
    id: 'AV',
    name: 'Avali',
    domain: 'Input/Output & Messaging',
    keywords: ['serin', 'nurel', 'lumenna', 'echo', 'hush'],
    validPayloadTypes: ['message', 'data', 'stream', 'notification', 'broadcast'],
  },
  RU: {
    id: 'RU',
    name: 'Runethic',
    domain: 'Policy & Constraints',
    keywords: ['khar', 'drath', 'bront', 'veto', 'grant'],
    validPayloadTypes: ['policy', 'rule', 'constraint', 'permission', 'authorization'],
  },
  CA: {
    id: 'CA',
    name: 'Cassisivadan',
    domain: 'Logic & Computation',
    keywords: ['klik', 'spira', 'ifta', 'thena', 'elsa'],
    validPayloadTypes: ['computation', 'decision', 'condition', 'expression', 'algorithm'],
  },
  UM: {
    id: 'UM',
    name: 'Umbroth',
    domain: 'Security & Privacy',
    keywords: ['veil', 'hollow', 'nar\'shul', 'reveal', 'purge'],
    validPayloadTypes: ['encrypted', 'secret', 'sandbox', 'credential', 'audit'],
  },
  DR: {
    id: 'DR',
    name: 'Draumric',
    domain: 'Types & Structures',
    keywords: ['tharn', 'anvil', 'seal', 'forge', 'mold'],
    validPayloadTypes: ['schema', 'struct', 'interface', 'type', 'definition'],
  },
};

/**
 * Get tongue definition by ID
 * @param id - Sacred Tongue identifier
 * @returns Complete tongue definition
 * @throws Error if tongue ID is invalid
 */
export function getTongue(id: SacredTongue): TongueDefinition {
  const definition = TONGUE_DEFINITIONS[id];
  if (!definition) {
    throw new Error(`Unknown tongue: ${id}`);
  }
  // Deep copy to prevent mutation
  return {
    ...definition,
    keywords: [...definition.keywords],
    validPayloadTypes: [...definition.validPayloadTypes],
  };
}

/**
 * Validate if a string is a valid Sacred Tongue identifier
 * @param id - String to validate
 * @returns Type guard confirming if id is SacredTongue
 */
export function isValidTongue(id: string): id is SacredTongue {
  return isSacredTongue(id);
}

/**
 * Get keywords for a specific tongue
 * @param tongue - Sacred Tongue identifier
 * @returns Array of keywords for the tongue
 */
export function getKeywords(tongue: SacredTongue): string[] {
  const definition = TONGUE_DEFINITIONS[tongue];
  if (!definition) {
    return [];
  }
  return [...definition.keywords]; // Return copy
}

/**
 * Validate if a payload type is valid for a given tongue
 * @param tongue - Sacred Tongue identifier
 * @param payload - Payload to validate (checks type field if object)
 * @returns true if payload is valid for the tongue
 */
export function validatePayload(tongue: SacredTongue, payload: unknown): boolean {
  const definition = TONGUE_DEFINITIONS[tongue];
  if (!definition) {
    return false;
  }

  // Null/undefined payloads are invalid
  if (payload === null || payload === undefined) {
    return false;
  }

  // Primitive types are always valid (strings, numbers, booleans)
  if (typeof payload !== 'object') {
    return true;
  }

  // For objects, check if they have a 'type' field that matches valid types
  const payloadObj = payload as Record<string, unknown>;
  if ('type' in payloadObj && typeof payloadObj.type === 'string') {
    return definition.validPayloadTypes.includes(payloadObj.type);
  }

  // Objects without type field are valid (generic data)
  return true;
}

/**
 * Get all tongue definitions
 * @returns Array of all tongue definitions
 */
export function getAllTongues(): TongueDefinition[] {
  return SACRED_TONGUES.map(id => getTongue(id));
}

/**
 * Find tongue by keyword
 * @param keyword - Keyword to search for
 * @returns Tongue ID if found, undefined otherwise
 */
export function findTongueByKeyword(keyword: string): SacredTongue | undefined {
  const lowerKeyword = keyword.toLowerCase();
  for (const tongue of SACRED_TONGUES) {
    const definition = TONGUE_DEFINITIONS[tongue];
    if (definition.keywords.some(k => k.toLowerCase() === lowerKeyword)) {
      return tongue;
    }
  }
  return undefined;
}

/**
 * Get tongue by domain (partial match)
 * @param domain - Domain string to search for
 * @returns Matching tongue IDs
 */
export function findTonguesByDomain(domain: string): SacredTongue[] {
  const lowerDomain = domain.toLowerCase();
  return SACRED_TONGUES.filter(tongue => {
    const definition = TONGUE_DEFINITIONS[tongue];
    return definition.domain.toLowerCase().includes(lowerDomain);
  });
}
