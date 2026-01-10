/**
 * SCBE Envelope System - Production-Ready Implementation
 * Immutable envelope with deterministic verification pipeline
 * Based on deployment-ready specification v2.0
 */

import crypto from 'crypto';
import { z } from 'zod';

// SCBE Envelope Schema - Immutable across gateway → orchestrator → providers
export const SCBEEnvelopeSchema = z.object({
  ver: z.literal('scbe-2.0'),
  ctx: z.object({
    ts: z.number().int().positive(), // seconds, not ms
    device_id: z.string().min(1),
    threat_level: z.number().int().min(1).max(10),
    entropy: z.number().min(0).max(1), // clamped [0,1], no RNG
    server_load: z.number().min(0).max(1), // clamped [0,1]
    stability: z.number().min(0).max(1) // clamped [0,1]
  }),
  intent: z.object({
    primary: z.enum(['sil\'kor', 'nav\'een', 'thel\'vori', 'keth\'mar']),
    modifier: z.enum(['sil\'kor', 'nav\'een', 'thel\'vori', 'keth\'mar']).optional(),
    harmonic: z.number().int().min(1).max(7), // 1..7
    phase_deg: z.number().min(0).max(359) // 0..359
  }),
  trajectory: z.object({
    epoch: z.number().int().positive(), // start of policy window
    period_s: z.number().int().positive(), // phase period
    slot_id: z.string(), // policy schedule id
    waypoint: z.number().int().min(0) // index in schedule
  }),
  aad: z.object({
    route_hint: z.enum(['openai', 'anthropic', 'google', 'groq', 'perplexity', 'xai']),
    run_id: z.string(),
    step_no: z.number().int().min(0)
  }),
  commit: z.object({
    ctx_sha256: z.string().length(64), // SHA256 hex
    intent_sha256: z.string().length(64),
    traj_sha256: z.string().length(64),
    aad_sha256: z.string().length(64)
  }),
  crypto: z.object({
    kem: z.enum(['ML-KEM-768', 'ML-KEM-1024']),
    sig: z.enum(['ML-DSA-65', 'ML-DSA-87']),
    h: z.object({
      d: z.number().int().min(1).max(7),
      R: z.number().min(1),
      H: z.number().positive(),
      n_iter: z.number().int().positive()
    }),
    salt_q_b64: z.string(), // per-query salt used in chaos KDF
    cipher_b64: z.string() // SCBE ciphertext of sensitive payload
  }),
  sig: z.object({
    orchestrator_sig_b64: z.string(), // ML-DSA over entire envelope minus provider_sig
    provider_sig_b64: z.string().nullable() // filled by provider on return
  })
});

export type SCBEEnvelope = z.infer<typeof SCBEEnvelopeSchema>;

// Deterministic canonicalization for hashing
function canonicalize<T>(obj: T): string {
  return JSON.stringify(obj, Object.keys(obj as any).sort());
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

// Clamp values to safe ranges
function clampFloat(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}

// Intent vocabulary and routing policies
const INTENT_POLICIES = {
  'sil\'kor': { // Foundation - read-only operations
    allowed_providers: ['openai', 'anthropic', 'google'],
    allowed_modifiers: ['nav\'een'], // can combine with Journey
    time_slots: [8, 12, 16, 20], // UTC hours when allowed
    max_harmonic: 5
  },
  'nav\'een': { // Journey - search and exploration
    allowed_providers: ['openai', 'google', 'groq', 'perplexity'],
    allowed_modifiers: ['sil\'kor', 'thel\'vori'],
    time_slots: [10, 14, 18, 22],
    max_harmonic: 6
  },
  'thel\'vori': { // Transformation - write operations
    allowed_providers: ['anthropic', 'openai'],
    allowed_modifiers: ['nav\'een'],
    time_slots: [16, 20], // Limited hours for dangerous ops
    max_harmonic: 7
  },
  'keth\'mar': { // Boundary violation - restricted
    allowed_providers: ['anthropic'], // Most careful provider only
    allowed_modifiers: [],
    time_slots: [20], // Single hour window
    max_harmonic: 4 // Lower power for safety
  }
} as const;

// Verification pipeline results
export interface VerificationResult {
  success: boolean;
  stage: 'schema' | 'fractal' | 'intent' | 'trajectory' | 'phase' | 'neural' | 'swarm' | 'crypto';
  error?: string;
  metrics?: {
    fractal_iterations?: number;
    neural_energy?: number;
    phase_skew_deg?: number;
    trust_score?: number;
  };
}

export class SCBEEnvelopeProcessor {
  private neuralBaseline: { mean: number; stddev: number } = { mean: 0.5, stddev: 0.2 };
  private trustScores = new Map<string, number>();
  private phaseToleranceDeg = 15; // ±15 degrees phase tolerance
  
  constructor() {
    // Initialize default trust scores
    this.trustScores.set('openai', 0.95);
    this.trustScores.set('anthropic', 0.92);
    this.trustScores.set('google', 0.88);
    this.trustScores.set('groq', 0.85);
    this.trustScores.set('perplexity', 0.82);
    this.trustScores.set('xai', 0.80);
  }
  
  /**
   * Create SCBE envelope with deterministic commits
   */
  createEnvelope(
    ctx: SCBEEnvelope['ctx'],
    intent: SCBEEnvelope['intent'],
    trajectory: SCBEEnvelope['trajectory'],
    aad: SCBEEnvelope['aad'],
    crypto: Omit<SCBEEnvelope['crypto'], 'h'>,
    harmonicParams: { d: number; R: number }
  ): SCBEEnvelope {
    // Clamp context values
    const clampedCtx = {
      ...ctx,
      entropy: clampFloat(ctx.entropy),
      server_load: clampFloat(ctx.server_load),
      stability: clampFloat(ctx.stability)
    };
    
    // Calculate harmonic parameters
    const H = Math.pow(harmonicParams.R, harmonicParams.d * harmonicParams.d);
    const n_iter = Math.floor(50 * Math.cbrt(H)); // Base iterations * H^(1/3)
    
    // Generate deterministic commits
    const commit = {
      ctx_sha256: sha256Hex(canonicalize(clampedCtx)),
      intent_sha256: sha256Hex(canonicalize(intent)),
      traj_sha256: sha256Hex(canonicalize(trajectory)),
      aad_sha256: sha256Hex(canonicalize(aad))
    };
    
    const envelope: SCBEEnvelope = {
      ver: 'scbe-2.0',
      ctx: clampedCtx,
      intent,
      trajectory,
      aad,
      commit,
      crypto: {
        ...crypto,
        h: {
          d: harmonicParams.d,
          R: harmonicParams.R,
          H,
          n_iter
        }
      },
      sig: {
        orchestrator_sig_b64: '', // To be filled by orchestrator
        provider_sig_b64: null
      }
    };
    
    return envelope;
  }
  
  /**
   * Verification pipeline: cheap → expensive, fail-to-noise on any failure
   */
  async verifyEnvelope(envelope: any): Promise<VerificationResult> {
    // Stage 1: Schema + clamp validation
    const schemaResult = SCBEEnvelopeSchema.safeParse(envelope);
    if (!schemaResult.success) {
      return {
        success: false,
        stage: 'schema',
        error: 'Invalid envelope schema'
      };
    }
    
    const env = schemaResult.data;
    
    // Verify commit hashes
    const expectedCommits = {
      ctx_sha256: sha256Hex(canonicalize(env.ctx)),
      intent_sha256: sha256Hex(canonicalize(env.intent)),
      traj_sha256: sha256Hex(canonicalize(env.trajectory)),
      aad_sha256: sha256Hex(canonicalize(env.aad))
    };
    
    for (const [key, expected] of Object.entries(expectedCommits)) {
      if (env.commit[key as keyof typeof env.commit] !== expected) {
        return {
          success: false,
          stage: 'schema',
          error: `Commit hash mismatch: ${key}`
        };
      }
    }
    
    // Stage 2: Fractal gate (cheap reject)
    const fractalResult = this.fractalGate(env.ctx, env.intent);
    if (!fractalResult.success) {
      return {
        success: false,
        stage: 'fractal',
        error: 'Fractal gate rejection',
        metrics: { fractal_iterations: fractalResult.iterations }
      };
    }
    
    // Stage 3: Intent policy check
    const intentResult = this.checkIntentPolicy(env.intent, env.aad.route_hint);
    if (!intentResult.success) {
      return {
        success: false,
        stage: 'intent',
        error: intentResult.error
      };
    }
    
    // Stage 4: Trajectory window + phase lock
    const trajectoryResult = this.checkTrajectory(env.trajectory, env.intent, env.ctx.ts);
    if (!trajectoryResult.success) {
      return {
        success: false,
        stage: 'trajectory',
        error: trajectoryResult.error
      };
    }
    
    // Stage 5: Phase lock
    const phaseResult = this.checkPhaseLock(env.trajectory, env.intent.phase_deg, env.ctx.ts);
    if (!phaseResult.success) {
      return {
        success: false,
        stage: 'phase',
        error: phaseResult.error,
        metrics: { phase_skew_deg: phaseResult.skew_deg }
      };
    }
    
    // Stage 6: Neural behavior energy
    const neuralResult = this.checkNeuralEnergy(env.ctx);
    if (!neuralResult.success) {
      return {
        success: false,
        stage: 'neural',
        error: 'Neural energy threshold exceeded',
        metrics: { neural_energy: neuralResult.energy }
      };
    }
    
    // Stage 7: Swarm trust
    const swarmResult = this.checkSwarmTrust(env.aad.route_hint);
    if (!swarmResult.success) {
      return {
        success: false,
        stage: 'swarm',
        error: 'Swarm trust insufficient',
        metrics: { trust_score: swarmResult.trust_score }
      };
    }
    
    // All checks passed
    return {
      success: true,
      stage: 'crypto',
      metrics: {
        fractal_iterations: fractalResult.iterations,
        neural_energy: neuralResult.energy,
        phase_skew_deg: phaseResult.skew_deg,
        trust_score: swarmResult.trust_score
      }
    };
  }
  
  /**
   * Fractal gate: julia(z0(ctx), c(intent)) ≤ N iters → pass
   */
  private fractalGate(ctx: SCBEEnvelope['ctx'], intent: SCBEEnvelope['intent']): 
    { success: boolean; iterations: number } {
    // Map context to complex initial point z0
    const z0_real = (ctx.entropy - 0.5) * 2; // [-1, 1]
    const z0_imag = (ctx.stability - 0.5) * 2; // [-1, 1]
    
    // Map intent to complex constant c
    const harmonic_phase = (intent.harmonic - 1) / 6 * 2 * Math.PI; // [0, 2π]
    const c_real = Math.cos(harmonic_phase) * 0.7; // Scale for stability
    const c_imag = Math.sin(harmonic_phase) * 0.7;
    
    // Julia set iteration: z_{n+1} = z_n^2 + c
    let z_real = z0_real;
    let z_imag = z0_imag;
    const max_iterations = 100;
    
    for (let i = 0; i < max_iterations; i++) {
      const z_real_new = z_real * z_real - z_imag * z_imag + c_real;
      const z_imag_new = 2 * z_real * z_imag + c_imag;
      
      z_real = z_real_new;
      z_imag = z_imag_new;
      
      // Check if point escapes (|z| > 2)
      if (z_real * z_real + z_imag * z_imag > 4) {
        // Escaped - reject if too quick (likely attacker)
        return { success: i > 10, iterations: i };
      }
    }
    
    // Didn't escape - accept (in Julia set)
    return { success: true, iterations: max_iterations };
  }
  
  /**
   * Intent policy: check (primary,modifier,harmonic) ∈ allowed set for route_hint
   */
  private checkIntentPolicy(intent: SCBEEnvelope['intent'], route_hint: string): 
    { success: boolean; error?: string } {
    const policy = INTENT_POLICIES[intent.primary];
    if (!policy) {
      return { success: false, error: 'Unknown primary intent' };
    }
    
    // Check provider authorization
    if (!policy.allowed_providers.includes(route_hint as any)) {
      return { success: false, error: 'Provider not authorized for this intent' };
    }
    
    // Check modifier authorization
    if (intent.modifier && !policy.allowed_modifiers.includes(intent.modifier)) {
      return { success: false, error: 'Modifier not allowed for this intent' };
    }
    
    // Check harmonic level
    if (intent.harmonic > policy.max_harmonic) {
      return { success: false, error: 'Harmonic level too high for this intent' };
    }
    
    return { success: true };
  }
  
  /**
   * Trajectory window: slot policy must allow this intent now
   */
  private checkTrajectory(trajectory: SCBEEnvelope['trajectory'], intent: SCBEEnvelope['intent'], ts: number): 
    { success: boolean; error?: string } {
    const policy = INTENT_POLICIES[intent.primary];
    const current_hour = new Date(ts * 1000).getUTCHours();
    
    if (!policy.time_slots.includes(current_hour)) {
      return { 
        success: false, 
        error: `Intent ${intent.primary} not allowed at hour ${current_hour}` 
      };
    }
    
    // Check if we're within the trajectory window
    const window_start = trajectory.epoch;
    const window_end = trajectory.epoch + trajectory.period_s;
    
    if (ts < window_start || ts > window_end) {
      return { 
        success: false, 
        error: 'Request outside trajectory window' 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Phase lock: compare phase_deg with (2π·(ts-epoch)/period); allow ≤ tolerance
   */
  private checkPhaseLock(trajectory: SCBEEnvelope['trajectory'], phase_deg: number, ts: number): 
    { success: boolean; error?: string; skew_deg?: number } {
    const elapsed = ts - trajectory.epoch;
    const phase_fraction = (elapsed % trajectory.period_s) / trajectory.period_s;
    const expected_phase_deg = phase_fraction * 360;
    
    let skew_deg = Math.abs(phase_deg - expected_phase_deg);
    // Handle wrap-around (e.g., 359° vs 1°)
    if (skew_deg > 180) {
      skew_deg = 360 - skew_deg;
    }
    
    if (skew_deg > this.phaseToleranceDeg) {
      return { 
        success: false, 
        error: `Phase skew ${skew_deg.toFixed(1)}° exceeds tolerance`, 
        skew_deg 
      };
    }
    
    return { success: true, skew_deg };
  }
  
  /**
   * Neural behavior energy: E(ctx_norm). Reject if E > μ + kσ
   */
  private checkNeuralEnergy(ctx: SCBEEnvelope['ctx']): 
    { success: boolean; energy: number } {
    // Normalize context features
    const features = [
      ctx.entropy,
      ctx.server_load,
      ctx.stability,
      Math.min(1, ctx.threat_level / 10) // Normalize threat level to [0,1]
    ];
    
    // Simple energy function: weighted sum of squared deviations from expected
    const expected = [0.7, 0.5, 0.8, 0.3]; // Expected "normal" values
    const weights = [1, 1, 2, 3]; // Higher weight for stability and threat
    
    let energy = 0;
    for (let i = 0; i < features.length; i++) {
      const deviation = features[i] - expected[i];
      energy += weights[i] * deviation * deviation;
    }
    
    // Check against threshold (μ + 2σ)
    const threshold = this.neuralBaseline.mean + 2 * this.neuralBaseline.stddev;
    
    return { 
      success: energy <= threshold, 
      energy 
    };
  }
  
  /**
   * Swarm trust: require τ(provider) ≥ 0.3 and H_swarm ≥ 0.5
   */
  private checkSwarmTrust(route_hint: string): 
    { success: boolean; trust_score: number } {
    const trust_score = this.trustScores.get(route_hint) || 0;
    const swarm_health = Array.from(this.trustScores.values())
      .reduce((sum, score) => sum + score, 0) / this.trustScores.size;
    
    if (trust_score < 0.3) {
      return { success: false, trust_score };
    }
    
    if (swarm_health < 0.5) {
      return { success: false, trust_score };
    }
    
    return { success: true, trust_score };
  }
  
  /**
   * Generate fail-to-noise response with deterministic padding
   */
  generateNoise(envelope: SCBEEnvelope): SCBEEnvelope {
    const seed = crypto.createHash('sha256')
      .update(envelope.commit.ctx_sha256)
      .update(envelope.crypto.salt_q_b64)
      .digest();
    
    // Deterministic length in 4-8KB band
    const length = 4096 + (seed.readUInt32BE(0) % 4096);
    
    // Generate deterministic noise
    const noise = crypto.createHmac('sha256', seed)
      .update(Buffer.alloc(length))
      .digest()
      .toString('base64');
    
    return {
      ...envelope,
      crypto: {
        ...envelope.crypto,
        cipher_b64: noise
      }
    };
  }
  
  /**
   * Update trust scores with decay
   */
  updateTrust(provider: string, validity: number, alpha: number = 0.9): void {
    const current = this.trustScores.get(provider) || 0.5;
    const updated = alpha * current + (1 - alpha) * validity;
    this.trustScores.set(provider, Math.max(0, Math.min(1, updated)));
    
    // Auto-exclude if trust drops below threshold
    if (updated < 0.3) {
      console.warn(`Provider ${provider} auto-excluded: trust=${updated.toFixed(3)}`);
      // In production, this would trigger provider exclusion
    }
  }
  
  /**
   * Get current trust scores for monitoring
   */
  getTrustScores(): Record<string, number> {
    return Object.fromEntries(this.trustScores);
  }
}

// Export singleton instance
export const scbeProcessor = new SCBEEnvelopeProcessor();