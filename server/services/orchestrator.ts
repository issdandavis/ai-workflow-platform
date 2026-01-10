/**
 * Orchestrator Queue v2.0
 * 
 * Agent task queue with decision tracing, approval workflows, and provider fallback.
 * Manages concurrent agent execution with cost tracking and audit logging.
 * 
 * @version 2.0.0
 * @adaptable true - Works with any configured provider, graceful fallback chain
 */

import { EventEmitter } from "events";
import { storage } from "../storage";
import { retryService } from "./retryService";
import { trackCost } from "../middleware/costGovernor";
import { getUserCredential } from "./vault";
import { dispatchEvent } from "./zapierService";
import { SCBEAethermoreService, type HarmonicContext, type SCBEConfig } from "./scbeAethermoore";
import { scbeProcessor, type SCBEEnvelope, type VerificationResult } from "./scbeEnvelope";
import { scbeMetrics } from "./scbeMetrics";
import type { InsertDecisionTrace } from "@shared/schema";

// Security configuration constants
const SECURITY_CONFIG: Partial<SCBEConfig> = {
  d: 4,              // Security dimension for enterprise platform
  R: 1.618,          // Golden ratio for mystical theme alignment
  profile: 'hardened', // Maximum security for AI orchestration
  tau_phase: 90      // 90-second phase windows for agent coordination
} as const;

interface SecurityEvent {
  type: 'harmonic_encryption' | 'rate_limit_triggered' | 'security_validation';
  timestamp: number;
  runId?: string;
  data: Record<string, any>;
}

interface QueueStatus {
  length: number;
  processing: boolean;
  activeCount: number;
}

interface CacheMetrics {
  harmonicContexts: number;
  securityEvents: number;
}

interface HealthMetrics {
  queue: QueueStatus;
  security: any; // TODO: Type this properly when SCBETelemetry interface is available
  cache: CacheMetrics;
  pendingApprovals: number;
  envelope: any; // TODO: Type this properly when SCBEMetricsSnapshot interface is available
}

export interface AgentHandoff {
  summary: string;
  decisions: string[];
  tasks: string[];
  artifacts: Array<{ name: string; content: string }>;
  questions: string[];
  nextAgentSuggestion?: string;
}

export interface AgentTask {
  runId: string;
  projectId: string;
  orgId: string;
  goal: string;
  mode: string;
}

type StepType = InsertDecisionTrace["stepType"];

const CONFIDENCE_THRESHOLD = 0.7;

class OrchestratorQueue extends EventEmitter {
  private queue: AgentTask[] = [];
  private processing = false;
  private concurrency = 2;
  private activeCount = 0;
  private stepCounters: Map<string, number> = new Map();
  private pendingApprovalResolvers: Map<string, { resolve: () => void; reject: (reason: string) => void }> = new Map();
  private scbeService: SCBEAethermoreService;
  
  // Performance optimizations
  private harmonicContextCache: Map<string, { context: HarmonicContext; timestamp: number }> = new Map();
  private readonly CONTEXT_CACHE_TTL = 30000; // 30 seconds
  private securityEventThrottle: Map<string, number> = new Map();
  private readonly SECURITY_EVENT_THROTTLE_MS = 1000; // 1 second

  constructor() {
    super();
    this.initializeSecurityService();
    this.setupEventHandlers();
  }

  private initializeSecurityService(): void {
    // Initialize SCBE-AETHERMOORE harmonic security service
    this.scbeService = new SCBEAethermoreService(SECURITY_CONFIG);
    
    // Set up security event monitoring
    this.scbeService.on('encrypt', (data) => {
      this.emitSecurityEvent('harmonic_encryption', {
        dimension: data.d,
        harmonicValue: data.H,
        iterations: data.N_iter,
        entropy: data.contextEntropy
      });
    });
    
    this.scbeService.on('rateLimited', (data) => {
      this.emitSecurityEvent('rate_limit_triggered', {
        identifier: data.identifier,
        backoffTime: data.waitTime
      });
    });
  }

  private setupEventHandlers(): void {
    this.on("approval_granted", (runId: string) => {
      const resolver = this.pendingApprovalResolvers.get(runId);
      if (resolver) {
        resolver.resolve();
        this.pendingApprovalResolvers.delete(runId);
      }
    });
    
    this.on("approval_rejected", (runId: string, reason: string) => {
      const resolver = this.pendingApprovalResolvers.get(runId);
      if (resolver) {
        resolver.reject(reason);
        this.pendingApprovalResolvers.delete(runId);
      }
    });
  }

  private emitSecurityEvent(type: SecurityEvent['type'], data: Record<string, any>, runId?: string): void {
    // Throttle security events to prevent spam
    const throttleKey = `${type}-${runId || 'global'}`;
    const now = Date.now();
    const lastEmit = this.securityEventThrottle.get(throttleKey) || 0;
    
    if (now - lastEmit < this.SECURITY_EVENT_THROTTLE_MS) {
      return; // Skip this event due to throttling
    }
    
    this.securityEventThrottle.set(throttleKey, now);
    
    const event: SecurityEvent = {
      type,
      timestamp: now,
      runId,
      data
    };
    this.emit('security_event', event);
  }

  /**
   * Create harmonic context for security operations with caching
   * @param runId - The agent run ID
   * @param orgId - The organization ID
   * @returns Cached or newly created harmonic context
   */
  private createHarmonicContext(runId: string, orgId: string): HarmonicContext {
    const cacheKey = `${orgId}-${runId}`;
    const cached = this.harmonicContextCache.get(cacheKey);
    const now = Date.now();
    
    // Return cached context if still valid
    if (cached && (now - cached.timestamp) < this.CONTEXT_CACHE_TTL) {
      return cached.context;
    }
    
    // Create new context
    const context: HarmonicContext = {
      timestamp: now,
      entropy: Math.random(), // In production, use proper entropy source
      load: this.activeCount / this.concurrency,
      stability: Math.max(0, 1.0 - (this.queue.length / 100)), // Normalize queue length
      deviceId: `orchestrator-${process.pid}`,
      sessionId: `${orgId}-${runId}`
    };
    
    // Cache the context
    this.harmonicContextCache.set(cacheKey, { context, timestamp: now });
    
    // Clean up old cache entries periodically
    if (this.harmonicContextCache.size > 100) {
      this.cleanupContextCache();
    }
    
    return context;
  }

  /**
   * Clean up expired harmonic context cache entries
   */
  private cleanupContextCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.harmonicContextCache.entries()) {
      if (now - cached.timestamp > this.CONTEXT_CACHE_TTL) {
        this.harmonicContextCache.delete(key);
      }
    }
  }

  /**
   * Validate security context before sensitive operations
   */
  private async validateSecurityContext(runId: string, orgId: string): Promise<boolean> {
    try {
      const context = this.createHarmonicContext(runId, orgId);
      const telemetry = this.scbeService.getTelemetry();
      
      // Basic security validation
      if (telemetry.activeFailures > 10) {
        this.emitSecurityEvent('security_validation', {
          result: 'failed',
          reason: 'too_many_failures',
          activeFailures: telemetry.activeFailures
        }, runId);
        return false;
      }
      
      this.emitSecurityEvent('security_validation', {
        result: 'passed',
        context,
        telemetry
      }, runId);
      
      return true;
    } catch (error) {
      this.emitSecurityEvent('security_validation', {
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, runId);
      return false;
    }
  }

  private async traceDecision(
    runId: string,
    stepType: StepType,
    decision: string,
    reasoning: string,
    options?: {
      confidence?: number;
      alternatives?: unknown[];
      contextUsed?: unknown;
      startTime?: number;
      requireApproval?: boolean;
    }
  ): Promise<{ traceId: string; requiresApproval: boolean }> {
    const stepNumber = (this.stepCounters.get(runId) || 0) + 1;
    this.stepCounters.set(runId, stepNumber);

    const durationMs = options?.startTime ? Date.now() - options.startTime : undefined;
    const confidence = options?.confidence ?? 1.0;
    const requiresApproval = options?.requireApproval ?? (confidence < CONFIDENCE_THRESHOLD);

    try {
      // Create harmonic context for SCBE encryption
      const harmonicContext = await this.createHarmonicContext(runId, stepType, confidence);
      
      // Encrypt sensitive decision data using SCBE-AETHERMOORE
      const sensitiveData = Buffer.from(JSON.stringify({
        decision,
        reasoning,
        alternatives: options?.alternatives,
        contextUsed: options?.contextUsed
      }));
      
      const intentFingerprint = Buffer.from(`${runId}_${stepNumber}_${stepType}`);
      const sharedSecret = await this.getOrCreateRunSecret(runId);
      
      const encryptionResult = await this.scbeService.encrypt(
        sensitiveData,
        harmonicContext,
        intentFingerprint,
        sharedSecret
      );
      
      if (!encryptionResult.success) {
        console.warn("SCBE encryption failed, storing unencrypted (development mode)");
      }

      const trace = await storage.createDecisionTrace({
        agentRunId: runId,
        stepNumber,
        stepType,
        decision: encryptionResult.success ? "[ENCRYPTED]" : decision,
        reasoning: encryptionResult.success ? "[ENCRYPTED]" : reasoning,
        confidence: confidence.toString(),
        alternatives: encryptionResult.success ? { encrypted: true } : options?.alternatives as any,
        contextUsed: encryptionResult.success ? { encrypted: true } : options?.contextUsed as any,
        durationMs,
        approvalStatus: requiresApproval ? "pending" : "not_required",
        // Store SCBE metadata for audit and debugging
        metadata: encryptionResult.success ? {
          scbe: {
            encrypted: true,
            harmonicDimension: encryptionResult.metadata.d,
            harmonicValue: encryptionResult.metadata.H,
            iterations: encryptionResult.metadata.N_iter,
            phaseWindow: encryptionResult.phase_window
          }
        } : undefined
      });
      
      return { traceId: trace.id, requiresApproval };
    } catch (error) {
      console.error("Failed to log decision trace:", error);
      return { traceId: "", requiresApproval: false };
    }
  }

  // Create harmonic context from agent execution state
  private async createHarmonicContext(runId: string, stepType: StepType, confidence: number): Promise<HarmonicContext> {
    const run = await storage.getAgentRun(runId);
    const systemLoad = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      entropy: this.calculateContextEntropy(runId, stepType, confidence),
      load: (systemLoad.user + systemLoad.system) / 1000000, // Convert to seconds
      stability: Math.min(confidence * 1.2, 1.0), // Confidence as stability proxy
      deviceId: `orchestrator_${process.pid}`,
      sessionId: runId
    };
  }
  
  // Calculate context entropy from execution state
  private calculateContextEntropy(runId: string, stepType: StepType, confidence: number): number {
    const stepCount = this.stepCounters.get(runId) || 0;
    const queueLength = this.queue.length;
    const activeRatio = this.activeCount / this.concurrency;
    
    // Combine multiple entropy sources
    const sources = [
      stepCount / 100,           // Execution progress
      queueLength / 50,          // System load
      activeRatio,               // Concurrency utilization
      1 - confidence,            // Decision uncertainty
      Math.random() * 0.1        // Small random component
    ];
    
    // Weighted entropy calculation
    return sources.reduce((sum, val, idx) => sum + val * Math.pow(0.8, idx), 0);
  }
  
  // Get or create a shared secret for this agent run
  private async getOrCreateRunSecret(runId: string): Promise<Buffer> {
    try {
      // Try to get existing secret from secure storage
      const existingSecret = await getUserCredential(runId, 'scbe_secret');
      if (existingSecret) {
        return Buffer.from(existingSecret, 'base64');
      }
    } catch (error) {
      // Secret doesn't exist, create new one
    }
    
    // Generate new 256-bit secret
    const newSecret = require('crypto').randomBytes(32);
    
    try {
      // Store in vault for future use
      await storage.createCredential({
        userId: runId, // Using runId as identifier
        service: 'scbe_secret',
        encryptedValue: newSecret.toString('base64'),
        createdAt: new Date()
      });
    } catch (error) {
      console.warn("Failed to store SCBE secret in vault:", error);
    }
    
    return newSecret;
  }

  private async waitForApproval(runId: string, traceId: string, decision: string): Promise<void> {
    this.emit("log", runId, {
      type: "warning",
      message: `Low confidence decision requires approval: "${decision}"`,
    });

    await storage.updateAgentRun(runId, { status: "awaiting_approval" });

    return new Promise((resolve, reject) => {
      this.pendingApprovalResolvers.set(runId, { resolve, reject });
      
      const timeout = setTimeout(() => {
        if (this.pendingApprovalResolvers.has(runId)) {
          this.pendingApprovalResolvers.delete(runId);
          reject("Approval timeout - no response within 5 minutes");
        }
      }, 5 * 60 * 1000);

      const cleanup = () => clearTimeout(timeout);
      this.pendingApprovalResolvers.set(runId, {
        resolve: () => { cleanup(); resolve(); },
        reject: (reason: string) => { cleanup(); reject(new Error(reason)); },
      });
    });
  }

  enqueue(task: AgentTask) {
    this.queue.push(task);
    this.emit("log", task.runId, { type: "info", message: "Task queued" });
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.activeCount >= this.concurrency) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.activeCount++;
    this.processing = true;

    try {
      await this.executeTask(task);
    } catch (error) {
      this.emit("log", task.runId, {
        type: "error",
        message: `Task failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      
      await storage.updateAgentRun(task.runId, {
        status: "failed",
        outputJson: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    } finally {
      this.activeCount--;
      this.processing = false;
      
      // Process next task if queue has items
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Execute an agent task with security validation and harmonic context
   * @param task - The agent task to execute
   * @throws {Error} When task execution fails or security validation fails
   */
  private async executeTask(task: AgentTask) {
    // Validate security context before processing sensitive AI requests
    const securityValid = await this.validateSecurityContext(task.runId, task.orgId);
    if (!securityValid) {
      throw new Error("Security validation failed - task rejected");
    }
    const startTime = Date.now();
    this.stepCounters.set(task.runId, 0);

    const run = await storage.getAgentRun(task.runId);
    if (!run) {
      throw new Error("Agent run not found");
    }

    this.emit("log", task.runId, {
      type: "info",
      message: `Starting agent run with ${run.provider} (${run.model})`,
    });

    const providerTrace = await this.traceDecision(
      task.runId,
      "provider_selection",
      `Selected ${run.provider} with model ${run.model}`,
      `User requested ${run.provider} as the primary provider. Model ${run.model} was chosen based on task requirements.`,
      {
        confidence: 0.95,
        alternatives: ["openai", "anthropic", "perplexity", "xai"].filter(p => p !== run.provider),
        contextUsed: { goal: task.goal, mode: task.mode },
        startTime,
      }
    );

    if (providerTrace.requiresApproval) {
      await this.waitForApproval(task.runId, providerTrace.traceId, `Selected ${run.provider} with model ${run.model}`);
      this.emit("log", task.runId, { type: "info", message: "Approval granted, continuing..." });
    }

    await storage.updateAgentRun(task.runId, { status: "running" });

    // Create initial message
    await storage.createMessage({
      projectId: task.projectId,
      agentRunId: task.runId,
      role: "user",
      content: task.goal,
    });

    const contextTrace = await this.traceDecision(
      task.runId,
      "context_analysis",
      "Analyzed user goal and prepared request",
      `Parsed user goal: "${task.goal.substring(0, 100)}${task.goal.length > 100 ? '...' : ''}". Prepared message for ${run.provider}.`,
      { confidence: 0.9, contextUsed: { goalLength: task.goal.length, mode: task.mode } }
    );

    if (contextTrace.requiresApproval) {
      await this.waitForApproval(task.runId, contextTrace.traceId, "Analyzed user goal and prepared request");
      this.emit("log", task.runId, { type: "info", message: "Approval granted, continuing..." });
    }

    this.emit("log", task.runId, {
      type: "info",
      message: `Calling ${run.provider} with model ${run.model} (with retry/fallback)...`,
    });

    // Create SCBE envelope for secure provider communication
    let envelope: SCBEEnvelope;
    try {
      envelope = await this.createSCBEEnvelope(task, run.provider, task.goal);
      this.emit("log", task.runId, {
        type: "info",
        message: `Created SCBE envelope with intent ${envelope.intent.primary} (harmonic ${envelope.intent.harmonic})`,
      });
    } catch (error) {
      this.emit("log", task.runId, {
        type: "error",
        message: `Failed to create SCBE envelope: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      throw error;
    }

    // Fetch user's stored API key for the provider (decrypt at moment of use)
    // Get userId from org owner since agentRun doesn't store userId directly
    const currentOrg = await storage.getOrg(task.orgId);
    const userId = currentOrg?.ownerUserId;
    const apiKey = userId ? await getUserCredential(userId, run.provider) : null;

    let retryStep = 0;
    const response = await retryService.callWithRetry(
      run.provider,
      task.goal,
      run.model,
      apiKey || undefined,
      async (attempt, error, nextProvider) => {
        retryStep++;
        if (nextProvider) {
          this.emit("log", task.runId, {
            type: "warning",
            message: `Provider failed, falling back to ${nextProvider}. Error: ${error}`,
          });
          
          // Create new envelope for fallback provider
          try {
            envelope = await this.createSCBEEnvelope(task, nextProvider, task.goal);
            this.emit("log", task.runId, {
              type: "info",
              message: `Created fallback SCBE envelope for ${nextProvider}`,
            });
          } catch (envelopeError) {
            this.emit("log", task.runId, {
              type: "warning",
              message: `Failed to create fallback envelope: ${envelopeError instanceof Error ? envelopeError.message : 'Unknown error'}`,
            });
          }
          
          await this.traceDecision(
            task.runId,
            "fallback",
            `Switching from failed provider to ${nextProvider}`,
            `${run.provider} failed with error: "${error}". Fallback chain triggered to try ${nextProvider} next.`,
            { confidence: 0.85, alternatives: [], contextUsed: { attempt, error, originalProvider: run.provider } }
          );
        } else {
          this.emit("log", task.runId, {
            type: "warning",
            message: `Retry attempt ${attempt}. Error: ${error}`,
          });
          await this.traceDecision(
            task.runId,
            "retry",
            `Retrying request (attempt ${attempt})`,
            `Previous attempt failed with: "${error}". Applying exponential backoff before retry.`,
            { confidence: 0.8, contextUsed: { attempt, error } }
          );
        }
      }
    );

    if (!response.success) {
      await this.traceDecision(
        task.runId,
        "error_handling",
        "All providers failed, marking run as failed",
        `Exhausted all retry attempts and fallback providers. Final error: ${response.error}`,
        { confidence: 1.0, contextUsed: { attempts: response.attempts, error: response.error } }
      );
      throw new Error(response.error || "Provider call failed");
    }

    // Verify SCBE envelope if provider returned one
    if (response.envelope) {
      try {
        const verificationResult = await this.verifySCBEEnvelope(response.envelope);
        if (!verificationResult.success) {
          this.emit("log", task.runId, {
            type: "warning",
            message: `SCBE envelope verification failed at stage ${verificationResult.stage}: ${verificationResult.error}`,
          });
          
          // Log verification failure but don't fail the task (graceful degradation)
          await this.traceDecision(
            task.runId,
            "security_validation",
            `SCBE envelope verification failed`,
            `Verification failed at stage ${verificationResult.stage}: ${verificationResult.error || 'Unknown error'}`,
            { confidence: 0.6, contextUsed: { stage: verificationResult.stage, metrics: verificationResult.metrics } }
          );
        } else {
          this.emit("log", task.runId, {
            type: "info",
            message: `SCBE envelope verified successfully`,
          });
        }
      } catch (verificationError) {
        this.emit("log", task.runId, {
          type: "warning",
          message: `SCBE envelope verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`,
        });
      }
    }

    if (response.usedProvider !== run.provider) {
      this.emit("log", task.runId, {
        type: "info",
        message: `Used fallback provider: ${response.usedProvider} (${response.attempts} total attempts)`,
      });
    }

    // Save the response
    await storage.createMessage({
      projectId: task.projectId,
      agentRunId: task.runId,
      role: "assistant",
      content: response.content || "",
    });

    const costEstimate = response.usage?.costEstimate || "0";
    await storage.updateAgentRun(task.runId, {
      status: "completed",
      outputJson: {
        content: response.content,
        usage: response.usage,
        usedProvider: response.usedProvider,
        attempts: response.attempts,
      },
      costEstimate,
    });

    dispatchEvent(task.orgId, "agent_run.completed", {
      id: task.runId,
      projectId: task.projectId,
      status: "completed",
      provider: response.usedProvider,
      model: run.model,
      costEstimate,
      createdAt: run.createdAt.toISOString(),
    }).catch(err => console.error("[Zapier] Failed to dispatch agent_run.completed:", err));

    await this.traceDecision(
      task.runId,
      "response_generation",
      `Generated response with ${response.usedProvider}`,
      `Successfully received response from ${response.usedProvider}. Token usage: ${response.usage?.inputTokens || 0} input, ${response.usage?.outputTokens || 0} output. Cost: $${costEstimate}.`,
      {
        confidence: 0.95,
        contextUsed: {
          usedProvider: response.usedProvider,
          attempts: response.attempts,
          usage: response.usage,
        },
        startTime,
      }
    );

    // Track cost in budget
    if (parseFloat(costEstimate) > 0) {
      await trackCost(task.orgId, costEstimate);
    }

    // Create usage record with actual provider used (for analytics)
    const org = await storage.getOrg(task.orgId);
    if (org) {
      await storage.createUsageRecord({
        orgId: task.orgId,
        userId: org.ownerUserId,
        provider: response.usedProvider,
        model: run.model,
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        estimatedCostUsd: costEstimate,
        metadata: {
          agentRunId: task.runId,
          originalProvider: run.provider,
          attempts: response.attempts,
        },
      });
    }

    this.emit("log", task.runId, {
      type: "success",
      message: `Agent run completed. Cost: $${costEstimate}`,
    });

    await storage.createAuditLog({
      orgId: task.orgId,
      userId: null,
      action: "agent_run_completed",
      target: task.runId,
      detailJson: { 
        provider: run.provider, 
        usedProvider: response.usedProvider,
        model: run.model, 
        costEstimate,
        attempts: response.attempts,
      },
    });
  }

  // ===== SCBE-AETHERMOORE INTEGRATION METHODS =====

  /**
   * Create SCBE envelope for secure AI provider communication
   * @param task - The agent task being executed
   * @param provider - Target AI provider
   * @param content - Request content to encrypt
   * @returns SCBE envelope with encrypted payload
   */
  private async createSCBEEnvelope(
    task: AgentTask, 
    provider: string, 
    content: string
  ): Promise<SCBEEnvelope> {
    const now = Math.floor(Date.now() / 1000); // seconds
    const harmonicContext = this.createHarmonicContext(task.runId, task.orgId);
    
    // Create envelope context
    const ctx = {
      ts: now,
      device_id: `orchestrator-${process.pid}`,
      threat_level: Math.min(10, Math.max(1, Math.floor(this.activeCount / this.concurrency * 10))),
      entropy: harmonicContext.entropy,
      server_load: harmonicContext.load,
      stability: harmonicContext.stability
    };
    
    // Map task goal to intent vocabulary
    const intent = this.mapTaskToIntent(task.goal, provider);
    
    // Create trajectory for phase synchronization
    const trajectory = {
      epoch: now - (now % 3600), // Start of current hour
      period_s: 3600, // 1-hour phase period
      slot_id: `${task.orgId}-${Math.floor(now / 3600)}`,
      waypoint: Math.floor((now % 3600) / 900) // 15-minute waypoints
    };
    
    // Additional authenticated data
    const aad = {
      route_hint: provider as any,
      run_id: task.runId,
      step_no: this.stepCounters.get(task.runId) || 0
    };
    
    // Encrypt the content using SCBE-AETHERMOORE
    const sharedSecret = await this.getOrCreateRunSecret(task.runId);
    const intentFingerprint = Buffer.from(`${intent.primary}_${intent.harmonic}_${provider}`);
    
    const encryptionResult = await this.scbeService.encrypt(
      Buffer.from(content),
      harmonicContext,
      intentFingerprint,
      sharedSecret
    );
    
    if (!encryptionResult.success) {
      throw new Error("SCBE encryption failed");
    }
    
    // Create envelope with crypto parameters
    const envelope = scbeProcessor.createEnvelope(
      ctx,
      intent,
      trajectory,
      aad,
      {
        kem: 'ML-KEM-768',
        sig: 'ML-DSA-65',
        salt_q_b64: Buffer.from(encryptionResult.salt || '').toString('base64'),
        cipher_b64: encryptionResult.ciphertext || ''
      },
      {
        d: SECURITY_CONFIG.d || 4,
        R: SECURITY_CONFIG.R || 1.618
      }
    );
    
    // Sign envelope with orchestrator key
    envelope.sig.orchestrator_sig_b64 = await this.signEnvelope(envelope);
    
    return envelope;
  }
  
  /**
   * Map task goal to SCBE intent vocabulary
   */
  private mapTaskToIntent(goal: string, provider: string): SCBEEnvelope['intent'] {
    const goalLower = goal.toLowerCase();
    
    // Determine primary intent based on goal content
    let primary: SCBEEnvelope['intent']['primary'];
    let harmonic: number;
    
    if (goalLower.includes('read') || goalLower.includes('analyze') || goalLower.includes('explain')) {
      primary = 'sil\'kor'; // Foundation - read-only
      harmonic = 3;
    } else if (goalLower.includes('search') || goalLower.includes('find') || goalLower.includes('explore')) {
      primary = 'nav\'een'; // Journey - exploration
      harmonic = 4;
    } else if (goalLower.includes('write') || goalLower.includes('create') || goalLower.includes('generate')) {
      primary = 'thel\'vori'; // Transformation - creation
      harmonic = 5;
    } else {
      primary = 'keth\'mar'; // Boundary - unknown/risky
      harmonic = 2;
    }
    
    // Calculate phase based on provider and time
    const providerPhase = {
      'openai': 0,
      'anthropic': 60,
      'google': 120,
      'groq': 180,
      'perplexity': 240,
      'xai': 300
    }[provider] || 0;
    
    const timePhase = (Date.now() % 60000) / 60000 * 360; // 0-360 over 1 minute
    const phase_deg = (providerPhase + timePhase) % 360;
    
    return {
      primary,
      harmonic,
      phase_deg: Math.floor(phase_deg)
    };
  }
  
  /**
   * Sign SCBE envelope with orchestrator private key
   */
  private async signEnvelope(envelope: SCBEEnvelope): Promise<string> {
    // In production, use ML-DSA signing
    // For now, use HMAC as placeholder
    const signingKey = process.env.ORCHESTRATOR_SIGNING_KEY || 'dev-key';
    const envelopeData = JSON.stringify({
      ver: envelope.ver,
      ctx: envelope.ctx,
      intent: envelope.intent,
      trajectory: envelope.trajectory,
      aad: envelope.aad,
      commit: envelope.commit,
      crypto: envelope.crypto
    });
    
    const signature = require('crypto')
      .createHmac('sha256', signingKey)
      .update(envelopeData)
      .digest('base64');
    
    return signature;
  }
  
  /**
   * Verify SCBE envelope from provider response
   */
  private async verifySCBEEnvelope(envelope: any): Promise<VerificationResult> {
    const result = await scbeProcessor.verifyEnvelope(envelope);
    
    // Record metrics for monitoring
    if (!result.success) {
      scbeMetrics.incrementReject(result.stage);
    }
    
    if (result.metrics?.phase_skew_deg !== undefined) {
      scbeMetrics.recordPhaseSkew(result.metrics.phase_skew_deg);
    }
    
    if (result.metrics?.trust_score !== undefined) {
      const trustScores = scbeProcessor.getTrustScores();
      scbeMetrics.updateSwarmTrust(trustScores);
    }
    
    return result;
  }

  /**
   * Validate security context using harmonic analysis
   */
  private async validateSecurityContext(runId: string, orgId: string): Promise<boolean> {
    try {
      // Create harmonic context for validation
      const context = this.createHarmonicContext(runId, orgId);
      
      // Check if organization has valid security profile
      const org = await storage.getOrg(orgId);
      if (!org) {
        this.emit('security_event', {
          type: 'validation_failed',
          reason: 'invalid_organization',
          runId,
          orgId
        });
        return false;
      }
      
      // Validate harmonic parameters are within acceptable ranges
      const telemetry = this.scbeService.getTelemetry();
      if (telemetry.activeFailures > 5) {
        this.emit('security_event', {
          type: 'validation_failed',
          reason: 'too_many_failures',
          runId,
          failures: telemetry.activeFailures
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Security validation error:", error);
      return false;
    }
  }

  /**
   * Get harmonic telemetry for API endpoints
   */
  getHarmonicTelemetry() {
    const telemetry = this.scbeService.getTelemetry();
    return {
      ...telemetry,
      tau_phase: telemetry.config.tau_phase || 90
    };
  }

  /**
   * Update SCBE-AETHERMOORE security configuration
   */
  updateSecurityConfig(config: Partial<any>) {
    try {
      this.scbeService.updateConfig(config);
      this.emit('security_event', {
        type: 'config_updated',
        config
      });
    } catch (error) {
      this.emit('security_event', {
        type: 'config_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get current queue metrics
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Cleanup resources and event listeners
   * Should be called when shutting down the orchestrator
   */
  public cleanup(): void {
    // Clear all caches
    this.harmonicContextCache.clear();
    this.securityEventThrottle.clear();
    this.stepCounters.clear();
    
    // Reject any pending approvals
    for (const [runId, resolver] of this.pendingApprovalResolvers.entries()) {
      resolver.reject("Orchestrator shutting down");
    }
    this.pendingApprovalResolvers.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    // Cleanup SCBE service if it has cleanup method
    if (this.scbeService && typeof (this.scbeService as any).cleanup === 'function') {
      (this.scbeService as any).cleanup();
    }
  }

  /**
   * Get orchestrator health metrics including security telemetry
   */
  public getHealthMetrics(): HealthMetrics {
    const baseMetrics: HealthMetrics = {
      queue: this.getQueueStatus(),
      cache: this.getCacheMetrics(),
      pendingApprovals: this.pendingApprovalResolvers.size,
      security: null,
      envelope: null
    };

    // Gracefully handle security telemetry
    try {
      baseMetrics.security = this.scbeService.getTelemetry();
    } catch (error) {
      console.warn('Failed to get security telemetry:', error);
      baseMetrics.security = { error: 'Security telemetry unavailable' };
    }

    // Gracefully handle envelope metrics
    try {
      baseMetrics.envelope = scbeMetrics.getMetrics();
    } catch (error) {
      console.warn('Failed to get envelope metrics:', error);
      baseMetrics.envelope = { error: 'Envelope metrics unavailable' };
    }

    return baseMetrics;
  }

  private getQueueStatus(): QueueStatus {
    return {
      length: this.queue.length,
      processing: this.processing,
      activeCount: this.activeCount
    };
  }

  private getCacheMetrics(): CacheMetrics {
    return {
      harmonicContexts: this.harmonicContextCache.size,
      securityEvents: this.securityEventThrottle.size
    };
  }
}

export const orchestratorQueue = new OrchestratorQueue();
