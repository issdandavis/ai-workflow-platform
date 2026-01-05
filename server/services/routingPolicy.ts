/**
 * AI Provider Routing Policy
 * 
 * Implements intelligent provider selection with health tracking,
 * capability filtering, and cost-aware routing.
 * 
 * @version 1.0.0
 */

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'perplexity' | 'xai';

export interface ProviderCapabilities {
  maxContextLength: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsJsonMode: boolean;
  supportsStreaming: boolean;
}

export interface ProviderState {
  provider: AIProvider;
  priority: number;
  enabled: boolean;
  healthy: boolean;
  lastError?: Date;
  errorCount: number;
  consecutiveFailures: number;
  lastSuccess?: Date;
  capabilities: ProviderCapabilities;
  costPerToken: { input: number; output: number };
}

export interface AIRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  requiresVision?: boolean;
  requiresTools?: boolean;
  requiresJsonMode?: boolean;
  requiresStreaming?: boolean;
  orgId: string;
  costBudgetRemaining?: number;
}

// Default provider capabilities
const DEFAULT_CAPABILITIES: Record<AIProvider, ProviderCapabilities> = {
  openai: {
    maxContextLength: 128000,
    supportsVision: true,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
  },
  anthropic: {
    maxContextLength: 200000,
    supportsVision: true,
    supportsTools: true,
    supportsJsonMode: false,
    supportsStreaming: true,
  },
  google: {
    maxContextLength: 1000000,
    supportsVision: true,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
  },
  groq: {
    maxContextLength: 32000,
    supportsVision: false,
    supportsTools: false,
    supportsJsonMode: true,
    supportsStreaming: true,
  },
  perplexity: {
    maxContextLength: 128000,
    supportsVision: false,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
  },
  xai: {
    maxContextLength: 128000,
    supportsVision: true,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
  },
};

// Cost per 1K tokens (approximate, in USD)
const DEFAULT_COSTS: Record<AIProvider, { input: number; output: number }> = {
  openai: { input: 0.01, output: 0.03 },
  anthropic: { input: 0.008, output: 0.024 },
  google: { input: 0.00025, output: 0.0005 },
  groq: { input: 0.0001, output: 0.0002 },
  perplexity: { input: 0.001, output: 0.001 },
  xai: { input: 0.005, output: 0.015 },
};

// Health tracking constants
const HEALTH_COOLDOWN_MS = 60000; // 1 minute cooldown after failures
const MAX_CONSECUTIVE_FAILURES = 3;
const ERROR_DECAY_MS = 300000; // 5 minutes for error count to decay

export class RoutingPolicy {
  private providerStates: Map<AIProvider, ProviderState> = new Map();

  constructor() {
    // Initialize all providers with default state
    const providers: AIProvider[] = ['openai', 'anthropic', 'google', 'groq', 'perplexity', 'xai'];
    for (const provider of providers) {
      this.providerStates.set(provider, {
        provider,
        priority: this.getDefaultPriority(provider),
        enabled: true,
        healthy: true,
        errorCount: 0,
        consecutiveFailures: 0,
        capabilities: DEFAULT_CAPABILITIES[provider],
        costPerToken: DEFAULT_COSTS[provider],
      });
    }
  }

  private getDefaultPriority(provider: AIProvider): number {
    // Lower number = higher priority
    const priorities: Record<AIProvider, number> = {
      openai: 1,
      anthropic: 2,
      google: 3,
      groq: 4,
      perplexity: 5,
      xai: 6,
    };
    return priorities[provider];
  }

  /**
   * Select the best provider for a request
   */
  pickProvider(request: AIRequest, enabledProviders?: AIProvider[]): AIProvider | null {
    // Get all provider states
    const states = Array.from(this.providerStates.values());

    // Filter by enabled providers if specified
    let candidates = enabledProviders
      ? states.filter(s => enabledProviders.includes(s.provider))
      : states;

    // Step 1: Filter to enabled providers
    candidates = candidates.filter(s => s.enabled);

    // Step 2: Filter to healthy providers (or those past cooldown)
    candidates = candidates.filter(s => this.isProviderAvailable(s));

    // Step 3: Filter by required capabilities
    candidates = candidates.filter(s => this.meetsCapabilities(s, request));

    // Step 4: Check cost budget
    if (request.costBudgetRemaining !== undefined) {
      candidates = candidates.filter(s => {
        const estimatedCost = this.estimateCost(s, request);
        return estimatedCost <= request.costBudgetRemaining!;
      });
    }

    // Step 5: Sort by priority (lower = higher priority)
    candidates.sort((a, b) => a.priority - b.priority);

    // Return first matching provider or null
    return candidates.length > 0 ? candidates[0].provider : null;
  }

  /**
   * Get fallback providers in order
   */
  getFallbackChain(primaryProvider: AIProvider, request: AIRequest): AIProvider[] {
    const states = Array.from(this.providerStates.values());
    
    return states
      .filter(s => s.provider !== primaryProvider)
      .filter(s => s.enabled)
      .filter(s => this.isProviderAvailable(s))
      .filter(s => this.meetsCapabilities(s, request))
      .sort((a, b) => a.priority - b.priority)
      .map(s => s.provider);
  }

  /**
   * Check if provider is available (healthy or past cooldown)
   */
  private isProviderAvailable(state: ProviderState): boolean {
    if (state.healthy) return true;

    // Check if cooldown period has passed
    if (state.lastError) {
      const timeSinceError = Date.now() - state.lastError.getTime();
      if (timeSinceError >= HEALTH_COOLDOWN_MS) {
        // Auto-recover after cooldown
        return true;
      }
    }

    return false;
  }

  /**
   * Check if provider meets request capabilities
   */
  private meetsCapabilities(state: ProviderState, request: AIRequest): boolean {
    const caps = state.capabilities;

    if (request.requiresVision && !caps.supportsVision) return false;
    if (request.requiresTools && !caps.supportsTools) return false;
    if (request.requiresJsonMode && !caps.supportsJsonMode) return false;
    if (request.requiresStreaming && !caps.supportsStreaming) return false;

    // Check context length
    const estimatedTokens = Math.ceil(request.prompt.length / 4);
    if (estimatedTokens > caps.maxContextLength) return false;

    return true;
  }

  /**
   * Estimate cost for a request
   */
  private estimateCost(state: ProviderState, request: AIRequest): number {
    const inputTokens = Math.ceil(request.prompt.length / 4);
    const outputTokens = request.maxTokens || 1000;
    
    const inputCost = (inputTokens / 1000) * state.costPerToken.input;
    const outputCost = (outputTokens / 1000) * state.costPerToken.output;
    
    return inputCost + outputCost;
  }

  /**
   * Update provider state after a result
   */
  onResult(provider: AIProvider, success: boolean, error?: Error): void {
    const state = this.providerStates.get(provider);
    if (!state) return;

    if (success) {
      // Reset failure counters on success
      state.healthy = true;
      state.consecutiveFailures = 0;
      state.lastSuccess = new Date();
      
      // Decay error count over time
      if (state.lastError) {
        const timeSinceError = Date.now() - state.lastError.getTime();
        if (timeSinceError >= ERROR_DECAY_MS) {
          state.errorCount = Math.max(0, state.errorCount - 1);
        }
      }
    } else {
      // Track failure
      state.errorCount++;
      state.consecutiveFailures++;
      state.lastError = new Date();

      // Mark unhealthy if too many consecutive failures
      if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        state.healthy = false;
        console.warn(`[RoutingPolicy] Provider ${provider} marked unhealthy after ${state.consecutiveFailures} consecutive failures`);
      }
    }

    this.providerStates.set(provider, state);
  }

  /**
   * Get current state of a provider
   */
  getProviderState(provider: AIProvider): ProviderState | undefined {
    return this.providerStates.get(provider);
  }

  /**
   * Get all provider states
   */
  getAllProviderStates(): ProviderState[] {
    return Array.from(this.providerStates.values());
  }

  /**
   * Update provider configuration
   */
  updateProvider(provider: AIProvider, updates: Partial<ProviderState>): void {
    const state = this.providerStates.get(provider);
    if (state) {
      this.providerStates.set(provider, { ...state, ...updates });
    }
  }

  /**
   * Manually mark provider as healthy (for recovery)
   */
  markHealthy(provider: AIProvider): void {
    const state = this.providerStates.get(provider);
    if (state) {
      state.healthy = true;
      state.consecutiveFailures = 0;
      this.providerStates.set(provider, state);
    }
  }

  /**
   * Get health summary for all providers
   */
  getHealthSummary(): Record<AIProvider, { healthy: boolean; errorCount: number; lastError?: Date }> {
    const summary: Record<string, { healthy: boolean; errorCount: number; lastError?: Date }> = {};
    
    for (const [provider, state] of this.providerStates) {
      summary[provider] = {
        healthy: state.healthy,
        errorCount: state.errorCount,
        lastError: state.lastError,
      };
    }
    
    return summary as Record<AIProvider, { healthy: boolean; errorCount: number; lastError?: Date }>;
  }
}

// Singleton instance
export const routingPolicy = new RoutingPolicy();
