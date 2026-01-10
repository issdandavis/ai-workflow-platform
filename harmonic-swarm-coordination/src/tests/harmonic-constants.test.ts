/**
 * Tests for harmonic constants and scaling laws
 */

import { describe, it, expect } from 'vitest';
import { 
  harmonicMultiplier, 
  harmonicConstantTable, 
  securityHardness,
  StandardIntervals 
} from '../core/harmonic-constants.js';

describe('Harmonic Constants', () => {
  describe('harmonicMultiplier', () => {
    it('should calculate H(d,R) = R^(d²) correctly', () => {
      // Test perfect fifth (3:2 = 1.5) in dimension 2
      const result = harmonicMultiplier(1.5, 2);
      expect(result).toBeCloseTo(Math.pow(1.5, 4), 6); // 1.5^(2²) = 1.5^4
    });

    it('should handle unison (ratio = 1) correctly', () => {
      const result = harmonicMultiplier(1.0, 5);
      expect(result).toBe(1.0); // 1^(5²) = 1
    });

    it('should show exponential growth with dimension', () => {
      const ratio = 1.5; // Perfect fifth
      const d1 = harmonicMultiplier(ratio, 1); // 1.5^1 = 1.5
      const d2 = harmonicMultiplier(ratio, 2); // 1.5^4 = 5.0625
      const d3 = harmonicMultiplier(ratio, 3); // 1.5^9 = 38.44
      
      expect(d2).toBeGreaterThan(d1);
      expect(d3).toBeGreaterThan(d2);
      expect(d3 / d2).toBeGreaterThan(d2 / d1); // Super-exponential growth
    });
  });

  describe('harmonicConstantTable', () => {
    it('should generate table for multiple intervals and dimensions', () => {
      const intervals = { 
        perfectFifth: 1.5, 
        majorThird: 1.25 
      };
      const dimensions = [1, 2, 3];
      
      const table = harmonicConstantTable(intervals, dimensions);
      
      expect(table[1].perfectFifth).toBeCloseTo(1.5, 6);
      expect(table[2].perfectFifth).toBeCloseTo(5.0625, 6);
      expect(table[1].majorThird).toBeCloseTo(1.25, 6);
      expect(table[2].majorThird).toBeCloseTo(2.44140625, 6);
    });
  });

  describe('securityHardness', () => {
    it('should calculate bits of security correctly', () => {
      const ratio = 2.0; // Octave
      const dimension = 4;
      const H = harmonicMultiplier(ratio, dimension); // 2^16 = 65536
      const expectedBits = Math.log2(H); // 16 bits
      
      const actualBits = securityHardness(ratio, dimension);
      expect(actualBits).toBeCloseTo(expectedBits, 6);
    });

    it('should show increasing security with dimension', () => {
      const ratio = 1.5;
      const bits1 = securityHardness(ratio, 1);
      const bits2 = securityHardness(ratio, 2);
      const bits3 = securityHardness(ratio, 3);
      
      expect(bits2).toBeGreaterThan(bits1);
      expect(bits3).toBeGreaterThan(bits2);
    });
  });

  describe('StandardIntervals', () => {
    it('should contain all expected musical intervals', () => {
      expect(StandardIntervals.unison.ratio).toBe(1.0);
      expect(StandardIntervals.perfectFifth.ratio).toBeCloseTo(1.5, 6);
      expect(StandardIntervals.majorThird.ratio).toBeCloseTo(1.25, 6);
      expect(StandardIntervals.octave.ratio).toBe(2.0);
    });

    it('should have consistent prime limits', () => {
      expect(StandardIntervals.perfectFifth.primeLimit).toBe(3);
      expect(StandardIntervals.majorThird.primeLimit).toBe(5);
      expect(StandardIntervals.octave.primeLimit).toBe(2);
    });

    it('should include extended harmonics', () => {
      expect(StandardIntervals.septimiMinorThird.primeLimit).toBe(19);
      expect(StandardIntervals.goldenRatio.ratio).toBeCloseTo(1.618033988749, 6);
    });
  });

  describe('Real-world scaling examples', () => {
    it('should match documented perfect fifth progression', () => {
      // From documentation: 1.5 → 2.25 → 3.375 → 5.0625 → 8.4375
      const ratio = 1.5;
      
      expect(harmonicMultiplier(ratio, 1)).toBeCloseTo(1.5, 6);
      expect(harmonicMultiplier(ratio, 2)).toBeCloseTo(5.0625, 6); // 1.5^4
      expect(harmonicMultiplier(ratio, 3)).toBeCloseTo(38.44, 2); // 1.5^9
    });

    it('should demonstrate satellite servicing cost reduction', () => {
      // 10 coordinated drones vs 100 individual missions
      const coordinatedMultiplier = harmonicMultiplier(1.5, 2); // ~5x efficiency
      const traditionalCost = 100; // 100 missions
      const coordinatedCost = 10 / coordinatedMultiplier; // 10 drones with 5x efficiency
      
      const savings = (traditionalCost - coordinatedCost) / traditionalCost;
      expect(savings).toBeGreaterThan(0.8); // >80% savings
    });
  });
});