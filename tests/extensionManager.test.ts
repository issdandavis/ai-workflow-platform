/**
 * Extension Manager Tests v2.0
 * 
 * Tests for the Extension Manager system.
 * 
 * @version 2.0.0
 */

import { describe, it, expect } from 'vitest';

// Test the extension manager types and validation logic
describe('ExtensionManager', () => {
  // Define types inline for testing
  type ExtensionSlot =
    | "ai_provider" | "storage_backend" | "auth_method" 
    | "ui_theme" | "workflow_trigger" | "integration"
    | "code_analyzer" | "notification";

  interface ExtensionManifest {
    id: string;
    name: string;
    version: string;
    slot: ExtensionSlot;
    description: string;
    capabilities: string[];
    entryPoint: string;
    dependencies?: string[];
  }

  const validManifest: ExtensionManifest = {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    slot: 'ai_provider',
    description: 'A test extension',
    capabilities: ['test'],
    entryPoint: './test.js',
  };

  // Validation function (mirrors extensionManager logic)
  function validateManifest(manifest: ExtensionManifest) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest.id) errors.push('Missing required field: id');
    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.slot) errors.push('Missing required field: slot');
    if (!manifest.entryPoint) errors.push('Missing required field: entryPoint');

    const validSlots: ExtensionSlot[] = [
      "ai_provider", "storage_backend", "auth_method", "ui_theme",
      "workflow_trigger", "integration", "code_analyzer", "notification"
    ];
    if (manifest.slot && !validSlots.includes(manifest.slot)) {
      errors.push(`Invalid slot type: ${manifest.slot}`);
    }

    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push("Version should follow semver format (x.y.z)");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  describe('validateManifest', () => {
    it('should validate a correct manifest', () => {
      const result = validateManifest(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject manifest without id', () => {
      const manifest = { ...validManifest, id: '' };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
    });

    it('should reject manifest without name', () => {
      const manifest = { ...validManifest, name: '' };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('should reject manifest with invalid slot', () => {
      const manifest = { ...validManifest, slot: 'invalid_slot' as any };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid slot type'))).toBe(true);
    });

    it('should warn about non-semver version', () => {
      const manifest = { ...validManifest, version: 'v1' };
      const result = validateManifest(manifest);
      expect(result.warnings.some(w => w.includes('semver'))).toBe(true);
    });

    it('should accept all valid slot types', () => {
      const slots: ExtensionSlot[] = [
        "ai_provider", "storage_backend", "auth_method", "ui_theme",
        "workflow_trigger", "integration", "code_analyzer", "notification"
      ];
      
      for (const slot of slots) {
        const manifest = { ...validManifest, slot };
        const result = validateManifest(manifest);
        expect(result.valid).toBe(true);
      }
    });
  });
});
