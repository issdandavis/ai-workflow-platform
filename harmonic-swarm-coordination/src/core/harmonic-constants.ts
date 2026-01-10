/**
 * Harmonic Constants and Interval Definitions
 * Based on just intonation and extended harmonic series
 */

export interface IntervalSpec {
  name: string;
  ratio: number;
  primeLimit: number;
  cents: number; // For acoustic applications
  description: string;
}

export const StandardIntervals: Record<string, IntervalSpec> = {
  unison: {
    name: "Unison",
    ratio: 1.0,
    primeLimit: 1,
    cents: 0,
    description: "Perfect unison - baseline coordination"
  },
  minorSecond: {
    name: "Minor 2nd",
    ratio: 16/15,
    primeLimit: 15,
    cents: 111.73,
    description: "Tight coordination with slight offset"
  },
  majorSecond: {
    name: "Major 2nd",
    ratio: 9/8,
    primeLimit: 9,
    cents: 203.91,
    description: "Moderate separation for parallel operations"
  },
  minorThird: {
    name: "Minor 3rd",
    ratio: 6/5,
    primeLimit: 5,
    cents: 315.64,
    description: "Stable triangular formation"
  },
  majorThird: {
    name: "Major 3rd",
    ratio: 5/4,
    primeLimit: 5,
    cents: 386.31,
    description: "Optimal for 4-agent coordination"
  },
  perfectFourth: {
    name: "Perfect 4th",
    ratio: 4/3,
    primeLimit: 3,
    cents: 498.04,
    description: "Strong harmonic for robust coordination"
  },
  tritone: {
    name: "Tritone",
    ratio: 45/32,
    primeLimit: 32,
    cents: 590.22,
    description: "Maximum separation - anti-coordination"
  },
  perfectFifth: {
    name: "Perfect 5th",
    ratio: 3/2,
    primeLimit: 3,
    cents: 701.96,
    description: "Most stable harmonic - primary coordination"
  },
  minorSixth: {
    name: "Minor 6th",
    ratio: 8/5,
    primeLimit: 5,
    cents: 813.69,
    description: "Complementary to major third"
  },
  majorSixth: {
    name: "Major 6th",
    ratio: 5/3,
    primeLimit: 5,
    cents: 884.36,
    description: "Wide stable formation"
  },
  minorSeventh: {
    name: "Minor 7th",
    ratio: 16/9,
    primeLimit: 9,
    cents: 996.09,
    description: "Near-octave with tension"
  },
  majorSeventh: {
    name: "Major 7th",
    ratio: 15/8,
    primeLimit: 15,
    cents: 1088.27,
    description: "High tension coordination"
  },
  octave: {
    name: "Octave",
    ratio: 2/1,
    primeLimit: 2,
    cents: 1200,
    description: "Perfect doubling - hierarchical coordination"
  },
  // Extended harmonics for complex swarms
  septimiMinorThird: {
    name: "Septimal Minor 3rd",
    ratio: 19/16,
    primeLimit: 19,
    cents: 297.51,
    description: "Prime-based coordination for security"
  },
  goldenRatio: {
    name: "Golden Ratio",
    ratio: 1.618033988749,
    primeLimit: Infinity,
    cents: 833.09,
    description: "Fibonacci-based natural coordination"
  }
};

/**
 * Harmonic Scaling Law: H(d,R) = R^(d²)
 * @param ratio - Harmonic ratio (e.g., 1.5 for perfect fifth)
 * @param dimension - Dimensional complexity
 * @returns Harmonic multiplier for coordination strength
 */
export function harmonicMultiplier(ratio: number, dimension: number): number {
  return Math.pow(ratio, dimension * dimension);
}

/**
 * Generate harmonic constant table for multiple dimensions
 * @param intervals - Map of interval names to ratios
 * @param dimensions - Array of dimensions to compute
 * @returns Nested object with harmonic constants
 */
export function harmonicConstantTable(
  intervals: Record<string, number>,
  dimensions: number[]
): Record<number, Record<string, number>> {
  const table: Record<number, Record<string, number>> = {};
  
  for (const d of dimensions) {
    table[d] = {};
    for (const [name, ratio] of Object.entries(intervals)) {
      table[d][name] = harmonicMultiplier(ratio, d);
    }
  }
  
  return table;
}

/**
 * Calculate security hardness based on harmonic scaling
 * @param ratio - Base harmonic ratio
 * @param dimension - Dimensional complexity
 * @returns Estimated bits of security
 */
export function securityHardness(ratio: number, dimension: number): number {
  const H = harmonicMultiplier(ratio, dimension);
  return Math.log2(H);
}

/**
 * Motion types for harmonic coordination
 */
export enum MotionType {
  PARALLEL = "parallel",     // Agents move in same direction
  OBLIQUE = "oblique",       // One agent moves, others stationary
  CONTRARY = "contrary",     // Agents move in opposite directions
  SIMILAR = "similar"        // Agents move in same general direction but different intervals
}

/**
 * Voice leading rules for collision avoidance
 */
export interface VoiceLeadingRule {
  name: string;
  description: string;
  constraint: (agents: Agent[]) => boolean;
  penalty: number; // Cost for violating this rule
}

export const VoiceLeadingRules: VoiceLeadingRule[] = [
  {
    name: "No Parallel Octaves",
    description: "Agents cannot move in parallel octaves (same harmonic)",
    constraint: (agents) => {
      // Implementation would check for parallel motion in same harmonic
      return true; // Placeholder
    },
    penalty: 1000
  },
  {
    name: "Smooth Voice Leading",
    description: "Minimize total movement distance",
    constraint: (agents) => {
      // Implementation would calculate total movement
      return true; // Placeholder
    },
    penalty: 10
  },
  {
    name: "Avoid Tritones",
    description: "Minimize use of tritone intervals (maximum instability)",
    constraint: (agents) => {
      // Implementation would check for tritone relationships
      return true; // Placeholder
    },
    penalty: 500
  }
];

// Placeholder Agent interface
interface Agent {
  id: string;
  position: number[];
  velocity: number[];
  harmonic: string;
}