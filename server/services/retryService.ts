/**
 * Retry Service v2.0
 * 
 * Intelligent retry with exponential backoff and circuit breaker pattern.
 * Automatically falls back to alternative providers when primary fails.
 * 
 * @version 2.0.0
 * @adaptable true - Works with any provider combination, configurable retry behavior
 */

import { ProviderResponse, getProviderAdapter } from "./providerAdapters";

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  openUntil: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
};

const FALLBACK_CHAINS: Record<string, string[]> = {
  openai: ["anthropic", "google", "gemini", "perplexity"],
  anthropic: ["openai", "google", "gemini", "perplexity"],
  google: ["openai", "anthropic", "perplexity"],
  gemini: ["google", "openai", "anthropic", "perplexity"],
  perplexity: ["google", "gemini", "openai", "anthropic"],
  xai: ["openai", "anthropic", "google", "gemini"],
};

class RetryService {
  private circuitStates: Map<string, CircuitState> = new Map();
  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  private normalizeProvider(provider: string): string {
    return provider.toLowerCase();
  }

  private getCircuitState(provider: string): CircuitState {
    const key = this.normalizeProvider(provider);
    if (!this.circuitStates.has(key)) {
      this.circuitStates.set(key, {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        openUntil: 0,
      });
    }
    return this.circuitStates.get(key)!;
  }

  private isCircuitOpen(provider: string): boolean {
    const state = this.getCircuitState(provider);
    if (state.isOpen && Date.now() >= state.openUntil) {
      state.isOpen = false;
      state.failures = 0;
    }
    return state.isOpen;
  }

  private recordFailure(provider: string): void {
    const state = this.getCircuitState(provider);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      state.isOpen = true;
      state.openUntil = Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeoutMs;
    }
  }

  private recordSuccess(provider: string): void {
    const state = this.getCircuitState(provider);
    state.failures = 0;
    state.isOpen = false;
  }

  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelayMs
    );
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: string | undefined): boolean {
    if (!error) return false;
    const retryablePatterns = [
      /rate limit/i,
      /timeout/i,
      /5\d\d/,
      /server error/i,
      /temporarily unavailable/i,
      /overloaded/i,
      /capacity/i,
    ];
    return retryablePatterns.some((pattern) => pattern.test(error));
  }

  async callWithRetry(
    provider: string,
    prompt: string,
    model: string,
    apiKey?: string,
    onRetry?: (attempt: number, error: string, nextProvider?: string) => void
  ): Promise<ProviderResponse & { usedProvider: string; attempts: number }> {
    const normalizedProvider = this.normalizeProvider(provider);
    const fallbacks = FALLBACK_CHAINS[normalizedProvider] || [];
    const providersToTry = [normalizedProvider, ...fallbacks];
    let lastError: string = "Unknown error";
    let totalAttempts = 0;

    for (let providerIndex = 0; providerIndex < providersToTry.length; providerIndex++) {
      const currentProvider = providersToTry[providerIndex];
      const nextProvider = providersToTry[providerIndex + 1];

      if (this.isCircuitOpen(currentProvider)) {
        onRetry?.(totalAttempts, `Circuit open for ${currentProvider}`, nextProvider);
        continue;
      }

      let providerFailed = false;

      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        totalAttempts++;

        try {
          const adapter = getProviderAdapter(currentProvider, apiKey);
          const response = await adapter.call(prompt, model);

          if (response.success) {
            this.recordSuccess(currentProvider);
            return {
              ...response,
              usedProvider: currentProvider,
              attempts: totalAttempts,
            };
          }

          lastError = response.error || "Unknown error";

          // API key not configured - skip to next provider without recording failure
          if (response.error?.includes("not configured")) {
            break;
          }

          // Non-retryable error - return immediately, don't fallback
          if (!this.isRetryableError(response.error)) {
            this.recordFailure(currentProvider);
            return {
              success: false,
              error: lastError,
              usedProvider: currentProvider,
              attempts: totalAttempts,
            };
          }

          // Retryable error - delay and retry
          if (attempt < this.retryConfig.maxRetries) {
            const delay = this.calculateDelay(attempt);
            onRetry?.(attempt + 1, lastError);
            await this.sleep(delay);
          } else {
            providerFailed = true;
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown error";

          if (this.isRetryableError(lastError) && attempt < this.retryConfig.maxRetries) {
            const delay = this.calculateDelay(attempt);
            onRetry?.(attempt + 1, lastError);
            await this.sleep(delay);
          } else if (!this.isRetryableError(lastError)) {
            // Non-retryable exception - return immediately
            this.recordFailure(currentProvider);
            return {
              success: false,
              error: lastError,
              usedProvider: currentProvider,
              attempts: totalAttempts,
            };
          } else {
            // Retryable but exhausted retries
            providerFailed = true;
            break;
          }
        }
      }

      // Only record failure after exhausting retries for this provider
      if (providerFailed) {
        this.recordFailure(currentProvider);
        if (nextProvider) {
          onRetry?.(totalAttempts, lastError, nextProvider);
        }
      }
    }

    return {
      success: false,
      error: `All providers failed. Last error: ${lastError}`,
      usedProvider: normalizedProvider,
      attempts: totalAttempts,
    };
  }

  getCircuitStatus(): Record<string, { isOpen: boolean; failures: number; openUntil?: Date }> {
    const status: Record<string, { isOpen: boolean; failures: number; openUntil?: Date }> = {};
    const allProviders = ["openai", "anthropic", "google", "gemini", "perplexity", "xai"];
    
    for (const provider of allProviders) {
      const state = this.circuitStates.get(provider);
      if (state) {
        const isOpen = state.isOpen && Date.now() < state.openUntil;
        status[provider] = {
          isOpen,
          failures: state.failures,
          openUntil: isOpen ? new Date(state.openUntil) : undefined,
        };
      } else {
        status[provider] = { isOpen: false, failures: 0 };
      }
    }
    return status;
  }

  resetCircuit(provider: string): void {
    this.circuitStates.delete(this.normalizeProvider(provider));
  }

  resetAllCircuits(): void {
    this.circuitStates.clear();
  }
}

export const retryService = new RetryService();
