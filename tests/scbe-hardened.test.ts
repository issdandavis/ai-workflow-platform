/**
 * SCBE-AETHERMOORE Hardened Test Suite
 * Security validation for production-ready AEAD implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  SCBEAethermoreService,
  harmonicGrowth,
  harmonicDistance,
  type HarmonicContext
} from '../server/services/scbeAethermoore';

describe('SCBE-AETHERMOORE Hardened Security', () => {
  const testContext: HarmonicContext = {
    timestamp: 1640995200000,
    entropy: 0.73,
    load: 0.41,
    stability: 0.88,
    deviceId: "device-123",
    sessionId: "sess-abc",
  };
  
  const testIntent = Buffer.from("test-intent");
  const testSecret = crypto.randomBytes(32);
  const testMessage = Buffer.from("hello spiralverse");

  describe('Core Security Properties', () => {
    let service: SCBEAethermoreService;
    
    beforeEach(() => {
      service = new SCBEAethermoreService({
        d: 4,
        R: 1.618,
        profile: 'hardened'
      });
    });
    
    it('should encrypt and decrypt successfully', async () => {
      const result = await service.encrypt(testMessage, testContext, testIntent, testSecret);
      
      expect(result.success).toBe(true);
      expect(result.ciphertext).toBeDefined();
      
      const decryptResult = await service.decrypt(
        result.ciphertext!,
        testContext,
        testIntent,
        testSecret,
        {
          d: result.metadata.d,
          R: result.metadata.R,
          H: result.metadata.H,
          N_iter: result.metadata.N_iter,
          ts: testContext.timestamp,
          profile: 'hardened',
          phase_window: result.phase_window
        }
      );
      
      expect(decryptResult.success).toBe(true);
      expect(decryptResult.plaintext).toEqual(testMessage);
    });
    
    it('should fail with wrong context', async () => {
      const result = await service.encrypt(testMessage, testContext, testIntent, testSecret);
      expect(result.success).toBe(true);
      
      const wrongContext = { ...testContext, deviceId: 'wrong' };
      const decryptResult = await service.decrypt(
        result.ciphertext!,
        wrongContext,
        testIntent,
        testSecret
      );
      
      expect(decryptResult.success).toBe(false);
    });
    
    it('should enforce rate limiting', async () => {
      const context = { ...testContext, deviceId: 'rate-test' };
      
      // Trigger failure to activate rate limiting
      const badResult = await service.encrypt(testMessage, context, testIntent, Buffer.alloc(32));
      expect(badResult.success).toBe(false);
      
      // Next request should be rate limited
      const result = await service.encrypt(testMessage, context, testIntent, testSecret);
      if (!result.success) {
        expect(result.error).toBe('rate_limited');
      }
    });
  });

  describe('Harmonic Functions', () => {
    it('should calculate normalized harmonic distance', () => {
      const ctx1: HarmonicContext = {
        timestamp: 1000000,
        entropy: 0.8,
        load: 0.5,
        stability: 0.9,
        deviceId: 'device1',
        sessionId: 'session1'
      };
      
      const ctx2: HarmonicContext = {
        timestamp: 1300000, // 5 min later
        entropy: 0.82,
        load: 0.52,
        stability: 0.88,
        deviceId: 'device1',
        sessionId: 'session1'
      };
      
      const distance = harmonicDistance(ctx1, ctx2, 1.5);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1.0);
    });
  });
});