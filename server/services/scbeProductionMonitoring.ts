/**
 * SCBE Production Monitoring & Alerting
 * Real-time security metrics with automated alerting
 * 
 * Implements the observability requirements from the production checklist:
 * - Core timing metrics (p95 < 10ms, p99 < 25ms targets)
 * - Crypto health monitoring (GCM failures, nonce reuse, replay attacks)
 * - SCBE-specific signals (phase skew, trust scores, rejection rates)
 * - Automated alerting with 5-minute windows
 */

import { EventEmitter } from 'events';

// Metric types for type safety
interface TimingMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

interface CounterMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

interface GaugeMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

// Alert levels and thresholds
interface AlertThreshold {
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  value: number;
  windowMinutes: number;
  severity: 'warning' | 'critical';
}

// Production alert configuration
const PRODUCTION_ALERTS: AlertThreshold[] = [
  // Crypto health alerts
  { metric: 'scbe.gcm.failures_rate', condition: 'gt', value: 0.005, windowMinutes: 5, severity: 'critical' },
  { metric: 'scbe.nonce.reuse_count', condition: 'gt', value: 0, windowMinutes: 5, severity: 'critical' },
  { metric: 'scbe.replay.rejects_count', condition: 'gt', value: 50, windowMinutes: 5, severity: 'warning' },
  
  // Performance alerts
  { metric: 'scbe.envelope.create_ms_p99', condition: 'gt', value: 25, windowMinutes: 5, severity: 'warning' },
  { metric: 'scbe.envelope.verify_ms_p99', condition: 'gt', value: 50, windowMinutes: 5, severity: 'critical' },
  
  // SCBE-specific alerts
  { metric: 'scbe.phase.skew_ms_p99', condition: 'gt', value: 2000, windowMinutes: 10, severity: 'warning' },
  { metric: 'scbe.trust.score_avg', condition: 'lt', value: 0.5, windowMinutes: 5, severity: 'critical' },
  { metric: 'scbe.fail_to_noise.count_spike', condition: 'gt', value: 10, windowMinutes: 5, severity: 'warning' }
];

export class SCBEProductionMonitoring extends EventEmitter {
  private metrics = new Map<string, number[]>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private alertStates = new Map<string, { triggered: boolean; lastAlert: number }>();
  
  // Sliding window for metrics
  private readonly WINDOW_SIZE = 1000; // Keep last 1000 measurements
  private readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts
  
  constructor() {
    super();
    this.setupPeriodicAlertChecks();
  }

  /**
   * Record envelope creation timing
   * Target: p95 < 10ms, p99 < 25ms
   */
  recordEnvelopeCreateTiming(durationMs: number, tags: Record<string, string> = {}): void {
    this.recordTiming('scbe.envelope.create_ms', durationMs, tags);
  }

  /**
   * Record envelope verification timing
   * Target: p95 < 10ms, p99 < 50ms
   */
  recordEnvelopeVerifyTiming(durationMs: number, tags: Record<string, string> = {}): void {
    this.recordTiming('scbe.envelope.verify_ms', durationMs, tags);
  }

  /**
   * Record GCM authentication failure
   * CRITICAL: Should be 0 in production
   */
  recordGCMFailure(provider: string, reason: string): void {
    this.incrementCounter('scbe.gcm.failures_total', {
      provider,
      reason
    });
    
    // Calculate failure rate
    this.updateFailureRate('scbe.gcm.failures_rate');
    
    this.emit('security_event', {
      type: 'gcm_failure',
      provider,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Record nonce reuse detection
   * CRITICAL: Should NEVER happen in production
   */
  recordNonceReuse(sessionId: string, provider: string): void {
    this.incrementCounter('scbe.nonce.reuse_count', {
      session_id: sessionId,
      provider
    });
    
    this.emit('security_event', {
      type: 'nonce_reuse',
      sessionId,
      provider,
      timestamp: Date.now(),
      severity: 'critical'
    });
  }

  /**
   * Record replay attack detection
   */
  recordReplayReject(providerId: string, requestId: string): void {
    this.incrementCounter('scbe.replay.rejects_count', {
      provider: providerId
    });
    
    this.emit('security_event', {
      type: 'replay_reject',
      providerId,
      requestId,
      timestamp: Date.now()
    });
  }

  /**
   * Record phase skew for clock drift detection
   */
  recordPhaseSkew(skewMs: number, provider: string): void {
    this.recordTiming('scbe.phase.skew_ms', skewMs, { provider });
    
    // Alert on high skew
    if (skewMs > 5000) { // 5 seconds
      this.emit('security_event', {
        type: 'high_phase_skew',
        skewMs,
        provider,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update trust scores for swarm health
   */
  updateTrustScores(trustScores: Record<string, number>): void {
    const avgTrust = Object.values(trustScores).reduce((sum, score) => sum + score, 0) / Object.values(trustScores).length;
    
    this.recordGauge('scbe.trust.score_avg', avgTrust);
    
    // Record individual provider trust
    for (const [provider, trust] of Object.entries(trustScores)) {
      this.recordGauge('scbe.trust.score', trust, { provider });
      
      // Alert on low trust
      if (trust < 0.3) {
        this.emit('security_event', {
          type: 'low_trust',
          provider,
          trust,
          timestamp: Date.now(),
          severity: 'critical'
        });
      }
    }
  }

  /**
   * Record fail-to-noise events
   */
  recordFailToNoise(reason: string, provider: string): void {
    this.incrementCounter('scbe.fail_to_noise.count', {
      reason,
      provider
    });
    
    // Detect spikes (10x baseline)
    const baseline = this.getCounterBaseline('scbe.fail_to_noise.count');
    const current = this.counters.get('scbe.fail_to_noise.count') || 0;
    
    if (current > baseline * 10) {
      this.recordGauge('scbe.fail_to_noise.count_spike', current / baseline);
    }
  }

  /**
   * Record provider coherence metrics
   */
  recordProviderCoherence(provider: string, coherence: number): void {
    this.recordGauge('scbe.provider.coherence', coherence, { provider });
    
    if (coherence < 0.7) {
      this.emit('security_event', {
        type: 'low_coherence',
        provider,
        coherence,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Generic timing metric recorder
   */
  private recordTiming(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.buildMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    
    values.push(value);
    if (values.length > this.WINDOW_SIZE) {
      values.shift();
    }
    
    this.histograms.set(key, values);
    
    // Calculate percentiles
    this.updatePercentiles(name, values, tags);
    
    this.emit('metric', {
      type: 'timing',
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Generic counter metric recorder
   */
  private incrementCounter(name: string, tags: Record<string, string> = {}): void {
    const key = this.buildMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    
    this.emit('metric', {
      type: 'counter',
      name,
      value: current + 1,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Generic gauge metric recorder
   */
  private recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.buildMetricKey(name, tags);
    this.gauges.set(key, value);
    
    this.emit('metric', {
      type: 'gauge',
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate percentiles for timing metrics
   */
  private updatePercentiles(baseName: string, values: number[], tags: Record<string, string>): void {
    if (values.length === 0) return;
    
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    this.recordGauge(`${baseName}_p50`, p50, tags);
    this.recordGauge(`${baseName}_p95`, p95, tags);
    this.recordGauge(`${baseName}_p99`, p99, tags);
  }

  /**
   * Calculate failure rates
   */
  private updateFailureRate(rateName: string): void {
    const totalKey = rateName.replace('_rate', '_total');
    const total = this.counters.get(totalKey) || 0;
    const windowStart = Date.now() - (5 * 60 * 1000); // 5 minutes
    
    // In production, this would use a proper time-series database
    // For now, simple approximation
    const rate = total / 300; // failures per second over 5 minutes
    this.recordGauge(rateName, rate);
  }

  /**
   * Get baseline for spike detection
   */
  private getCounterBaseline(counterName: string): number {
    // In production, calculate from historical data
    // For now, return a simple baseline
    return 10;
  }

  /**
   * Build metric key with tags
   */
  private buildMetricKey(name: string, tags: Record<string, string>): string {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return tagString ? `${name}{${tagString}}` : name;
  }

  /**
   * Setup periodic alert checking
   */
  private setupPeriodicAlertChecks(): void {
    setInterval(() => {
      this.checkAlerts();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Check all alert thresholds
   */
  private checkAlerts(): void {
    for (const alert of PRODUCTION_ALERTS) {
      this.checkAlert(alert);
    }
  }

  /**
   * Check individual alert threshold
   */
  private checkAlert(alert: AlertThreshold): void {
    const value = this.getMetricValue(alert.metric);
    if (value === undefined) return;
    
    const alertKey = `${alert.metric}:${alert.condition}:${alert.value}`;
    const alertState = this.alertStates.get(alertKey) || { triggered: false, lastAlert: 0 };
    
    let shouldAlert = false;
    
    switch (alert.condition) {
      case 'gt':
        shouldAlert = value > alert.value;
        break;
      case 'lt':
        shouldAlert = value < alert.value;
        break;
      case 'eq':
        shouldAlert = value === alert.value;
        break;
    }
    
    if (shouldAlert && !alertState.triggered) {
      // New alert
      this.triggerAlert(alert, value);
      alertState.triggered = true;
      alertState.lastAlert = Date.now();
    } else if (!shouldAlert && alertState.triggered) {
      // Alert resolved
      this.resolveAlert(alert, value);
      alertState.triggered = false;
    }
    
    this.alertStates.set(alertKey, alertState);
  }

  /**
   * Get current metric value
   */
  private getMetricValue(metricName: string): number | undefined {
    // Try gauge first
    const gaugeValue = this.gauges.get(metricName);
    if (gaugeValue !== undefined) return gaugeValue;
    
    // Try counter
    const counterValue = this.counters.get(metricName);
    if (counterValue !== undefined) return counterValue;
    
    return undefined;
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: AlertThreshold, currentValue: number): void {
    const alertEvent = {
      type: 'alert_triggered',
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.value,
      currentValue,
      severity: alert.severity,
      windowMinutes: alert.windowMinutes,
      timestamp: Date.now()
    };
    
    this.emit('alert', alertEvent);
    
    console.error(`[SCBE ALERT] ${alert.severity.toUpperCase()}: ${alert.metric} ${alert.condition} ${alert.value} (current: ${currentValue})`);
  }

  /**
   * Resolve alert
   */
  private resolveAlert(alert: AlertThreshold, currentValue: number): void {
    const resolveEvent = {
      type: 'alert_resolved',
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.value,
      currentValue,
      severity: alert.severity,
      timestamp: Date.now()
    };
    
    this.emit('alert', resolveEvent);
    
    console.log(`[SCBE ALERT RESOLVED] ${alert.metric} back to normal (current: ${currentValue})`);
  }

  /**
   * Get all current metrics for dashboard
   */
  getCurrentMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, number[]>;
    alerts: Record<string, boolean>;
  } {
    const alerts: Record<string, boolean> = {};
    for (const [key, state] of this.alertStates.entries()) {
      alerts[key] = state.triggered;
    }
    
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms),
      alerts
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Export counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`${key} ${value}`);
    }
    
    // Export gauges
    for (const [key, value] of this.gauges.entries()) {
      lines.push(`${key} ${value}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate Grafana dashboard JSON
   */
  generateGrafanaDashboard(): any {
    return {
      dashboard: {
        title: "SCBE Production Security Monitoring",
        panels: [
          {
            title: "Envelope Performance",
            targets: [
              { expr: "scbe_envelope_create_ms_p99", legendFormat: "Create P99" },
              { expr: "scbe_envelope_verify_ms_p99", legendFormat: "Verify P99" }
            ],
            yAxes: [{ unit: "ms", max: 50 }]
          },
          {
            title: "Crypto Health",
            targets: [
              { expr: "rate(scbe_gcm_failures_total[5m])", legendFormat: "GCM Failures/sec" },
              { expr: "scbe_nonce_reuse_count", legendFormat: "Nonce Reuse" },
              { expr: "rate(scbe_replay_rejects_count[5m])", legendFormat: "Replay Rejects/sec" }
            ]
          },
          {
            title: "Trust Scores",
            targets: [
              { expr: "scbe_trust_score_avg", legendFormat: "Average Trust" },
              { expr: "scbe_trust_score", legendFormat: "{{provider}}" }
            ],
            yAxes: [{ min: 0, max: 1 }]
          },
          {
            title: "Phase Skew",
            targets: [
              { expr: "scbe_phase_skew_ms_p99", legendFormat: "Phase Skew P99" }
            ],
            yAxes: [{ unit: "ms", max: 5000 }]
          }
        ]
      }
    };
  }
}

// Export singleton instance
export const scbeMonitoring = new SCBEProductionMonitoring();

// Setup alert handlers
scbeMonitoring.on('alert', (alert) => {
  // In production: Send to PagerDuty, Slack, etc.
  console.error(`[SCBE PRODUCTION ALERT] ${JSON.stringify(alert)}`);
});

scbeMonitoring.on('security_event', (event) => {
  // In production: Send to SIEM, security team
  console.warn(`[SCBE SECURITY EVENT] ${JSON.stringify(event)}`);
});