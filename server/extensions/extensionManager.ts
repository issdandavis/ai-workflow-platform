/**
 * Extension Manager v2.0
 * 
 * Modular extension system for the AI Workflow Platform.
 * Provides predefined slots for adding new functionality without modifying core code.
 * 
 * @version 2.0.0
 * @adaptable true - Supports hot-loading in development mode
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENSION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extension slot types - predefined integration points
 */
export type ExtensionSlot =
  | "ai_provider"      // AI model providers (OpenAI, Anthropic, etc.)
  | "storage_backend"  // Database adapters
  | "auth_method"      // Authentication providers
  | "ui_theme"         // Frontend themes
  | "workflow_trigger" // Automation triggers
  | "integration"      // External service integrations
  | "code_analyzer"    // Code analysis tools
  | "notification";    // Notification channels

/**
 * Extension manifest - declares extension capabilities
 */
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  slot: ExtensionSlot;
  description: string;
  author?: string;
  dependencies?: string[];
  capabilities: string[];
  configSchema?: Record<string, unknown>;
  entryPoint: string;
}

/**
 * Loaded extension instance
 */
export interface Extension {
  manifest: ExtensionManifest;
  instance: unknown;
  status: "loaded" | "active" | "error" | "disabled";
  loadedAt: Date;
  error?: string;
}

/**
 * Validation result for manifest checks
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENSION MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ExtensionManager extends EventEmitter {
  private extensions: Map<string, Extension> = new Map();
  private slots: Map<ExtensionSlot, Extension[]> = new Map();
  private isDevelopment: boolean;

  constructor() {
    super();
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.initializeSlots();
  }

  /**
   * Initialize all extension slots
   */
  private initializeSlots(): void {
    const slotTypes: ExtensionSlot[] = [
      "ai_provider",
      "storage_backend",
      "auth_method",
      "ui_theme",
      "workflow_trigger",
      "integration",
      "code_analyzer",
      "notification",
    ];

    for (const slot of slotTypes) {
      this.slots.set(slot, []);
    }
  }

  /**
   * Validate an extension manifest
   */
  validateManifest(manifest: ExtensionManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.id) errors.push("Missing required field: id");
    if (!manifest.name) errors.push("Missing required field: name");
    if (!manifest.version) errors.push("Missing required field: version");
    if (!manifest.slot) errors.push("Missing required field: slot");
    if (!manifest.entryPoint) errors.push("Missing required field: entryPoint");

    // Validate slot type
    const validSlots: ExtensionSlot[] = [
      "ai_provider", "storage_backend", "auth_method", "ui_theme",
      "workflow_trigger", "integration", "code_analyzer", "notification"
    ];
    if (manifest.slot && !validSlots.includes(manifest.slot)) {
      errors.push(`Invalid slot type: ${manifest.slot}`);
    }

    // Check for duplicate ID
    if (manifest.id && this.extensions.has(manifest.id)) {
      errors.push(`Extension with ID '${manifest.id}' already registered`);
    }

    // Validate version format (semver)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push("Version should follow semver format (x.y.z)");
    }

    // Check dependencies
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!this.extensions.has(dep)) {
          errors.push(`Missing dependency: ${dep}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Register a new extension
   */
  async registerExtension(manifest: ExtensionManifest): Promise<void> {
    const validation = this.validateManifest(manifest);

    if (!validation.valid) {
      const error = `Extension validation failed: ${validation.errors.join(", ")}`;
      this.emit("extension_error", manifest.id, error);
      throw new Error(error);
    }

    if (validation.warnings.length > 0) {
      console.warn(`[ExtensionManager] Warnings for ${manifest.id}:`, validation.warnings);
    }

    const extension: Extension = {
      manifest,
      instance: null,
      status: "loaded",
      loadedAt: new Date(),
    };

    this.extensions.set(manifest.id, extension);
    this.emit("extension_registered", extension);

    console.log(`[ExtensionManager] Registered extension: ${manifest.name} v${manifest.version}`);
  }

  /**
   * Load and activate an extension
   */
  async loadExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    try {
      // In a real implementation, this would dynamically import the extension
      // For now, we mark it as active
      extension.status = "active";
      extension.loadedAt = new Date();

      // Add to slot
      const slotExtensions = this.slots.get(extension.manifest.slot) || [];
      slotExtensions.push(extension);
      this.slots.set(extension.manifest.slot, slotExtensions);

      this.emit("extension_loaded", extension);
      console.log(`[ExtensionManager] Loaded extension: ${extension.manifest.name}`);
    } catch (error) {
      extension.status = "error";
      extension.error = error instanceof Error ? error.message : "Unknown error";
      this.emit("extension_error", extensionId, extension.error);
      throw error;
    }
  }

  /**
   * Unload an extension
   */
  async unloadExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    // Remove from slot
    const slotExtensions = this.slots.get(extension.manifest.slot) || [];
    const index = slotExtensions.findIndex(e => e.manifest.id === extensionId);
    if (index !== -1) {
      slotExtensions.splice(index, 1);
    }

    // Clean up instance
    extension.instance = null;
    extension.status = "disabled";

    this.emit("extension_unloaded", extension);
    console.log(`[ExtensionManager] Unloaded extension: ${extension.manifest.name}`);
  }

  /**
   * Hot reload an extension (development mode only)
   */
  async hotReload(extensionId: string): Promise<void> {
    if (!this.isDevelopment) {
      throw new Error("Hot reload is only available in development mode");
    }

    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    console.log(`[ExtensionManager] Hot reloading: ${extension.manifest.name}`);

    await this.unloadExtension(extensionId);
    await this.loadExtension(extensionId);

    this.emit("extension_reloaded", extension);
  }

  /**
   * Get all extensions for a specific slot
   */
  getExtensionsBySlot(slot: ExtensionSlot): Extension[] {
    return this.slots.get(slot) || [];
  }

  /**
   * Get a specific extension by ID
   */
  getExtension(extensionId: string): Extension | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Get all registered extensions
   */
  getAllExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get active extensions only
   */
  getActiveExtensions(): Extension[] {
    return Array.from(this.extensions.values()).filter(e => e.status === "active");
  }

  /**
   * Check if an extension is loaded
   */
  isExtensionLoaded(extensionId: string): boolean {
    const extension = this.extensions.get(extensionId);
    return extension?.status === "active";
  }

  /**
   * Get extension count by status
   */
  getExtensionStats(): Record<string, number> {
    const stats: Record<string, number> = {
      total: 0,
      loaded: 0,
      active: 0,
      error: 0,
      disabled: 0,
    };

    for (const extension of this.extensions.values()) {
      stats.total++;
      stats[extension.status]++;
    }

    return stats;
  }
}

// Export singleton instance
export const extensionManager = new ExtensionManager();

// Export types
export type { ExtensionManager };
