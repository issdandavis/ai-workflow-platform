# SCBE-AETHERMOORE Production Deployment Runbook

## 🚀 Go-Live Checklist

### Pre-Deployment Security Validation

#### ✅ 1. Cryptographic Implementation
- [ ] **Keys & KMS**: Master secrets stored in AWS KMS/HSM with plaintext export disabled
- [ ] **HKDF Separation**: Independent subkeys derived: `k_enc`, `k_nonce`, `k_log` from `[IKM | env | provider | intent]`
- [ ] **AES-256-GCM Nonces**: 96-bit nonces, never reused under same key
- [ ] **Nonce Pattern**: `nonce = prefix_64b || counter_32b` with session-specific prefix
- [ ] **AAD Coverage**: All metadata in AAD with no gaps
- [ ] **Canonicalization**: JSON Canonicalization Scheme (JCS) implemented
- [ ] **Replay Protection**: `replay_nonce + ts` validation with LRU cache
- [ ] **Tag Verification**: Constant-time tag verification with fail-to-noise

#### ✅ 2. Production Acceptance Tests
Run all tests in `tests/scbe-production-acceptance.test.ts`:

```bash
npm test tests/scbe-production-acceptance.test.ts
```

**Required Test Results:**
- [ ] AAD tamper detection: ✅ PASS
- [ ] Body tamper detection: ✅ PASS  
- [ ] Timestamp validation: ✅ PASS
- [ ] Nonce reuse prevention: ✅ PASS
- [ ] Provider switch fallback: ✅ PASS
- [ ] Trust decay mechanisms: ✅ PASS
- [ ] Phase skew handling: ✅ PASS
- [ ] Performance targets: ✅ PASS (p95 < 10ms, p99 < 25ms)

### Deployment Configuration

#### Environment Variables
```bash
# Production KMS Configuration
SCBE_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
SCBE_ENVIRONMENT=prod
SCBE_NONCE_COUNTER_LIMIT=4294967295  # 2^32 - 1
SCBE_REPLAY_WINDOW_SECONDS=300       # 5 minutes
SCBE_MAX_CLOCK_SKEW_SECONDS=120      # 2 minutes

# Redis Configuration for Replay Cache
REDIS_URL=redis://prod-redis-cluster:6379
REDIS_REPLAY_DB=1

# Monitoring & Alerting
GRAFANA_DASHBOARD_URL=https://grafana.company.com/d/scbe-security
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

#### Feature Flags
```json
{
  "scbe_envelope_verification": {
    "enabled": true,
    "providers": {
      "openai": { "enabled": true, "traffic_percentage": 100 },
      "anthropic": { "enabled": true, "traffic_percentage": 100 },
      "google": { "enabled": true, "traffic_percentage": 100 },
      "groq": { "enabled": true, "traffic_percentage": 100 },
      "perplexity": { "enabled": true, "traffic_percentage": 100 },
      "xai": { "enabled": true, "traffic_percentage": 100 }
    }
  },
  "scbe_kill_switch": {
    "enabled": false,
    "reason": ""
  }
}
```

## 🎯 Canary Deployment Plan

### Phase 1: 5% Traffic (30 minutes)
```bash
# Update feature flags
curl -X POST https://api.company.com/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "scbe_envelope_verification": {
      "enabled": true,
      "providers": {
        "openai": { "enabled": true, "traffic_percentage": 5 }
      }
    }
  }'

# Monitor key metrics
watch -n 30 'curl -s https://grafana.company.com/api/dashboards/scbe-security/metrics'
```

**Success Criteria:**
- GCM failure rate < 0.1%
- Envelope create/verify p99 < 25ms
- No nonce reuse alerts
- Phase skew p99 < 1000ms

### Phase 2: 25% Traffic (30 minutes)
```bash
# Increase traffic if Phase 1 successful
curl -X POST https://api.company.com/feature-flags \
  -d '{"scbe_envelope_verification": {"providers": {"openai": {"traffic_percentage": 25}}}}'
```

### Phase 3: 50% Traffic (30 minutes)
```bash
curl -X POST https://api.company.com/feature-flags \
  -d '{"scbe_envelope_verification": {"providers": {"openai": {"traffic_percentage": 50}}}}'
```

### Phase 4: 100% Traffic (Full Deployment)
```bash
curl -X POST https://api.company.com/feature-flags \
  -d '{"scbe_envelope_verification": {"providers": {"openai": {"traffic_percentage": 100}}}}'
```

## 📊 Production Monitoring

### Grafana Dashboard Queries

#### Envelope Performance
```promql
# Creation timing
histogram_quantile(0.95, rate(scbe_envelope_create_ms_bucket[5m]))
histogram_quantile(0.99, rate(scbe_envelope_create_ms_bucket[5m]))

# Verification timing  
histogram_quantile(0.95, rate(scbe_envelope_verify_ms_bucket[5m]))
histogram_quantile(0.99, rate(scbe_envelope_verify_ms_bucket[5m]))
```

#### Crypto Health
```promql
# GCM failure rate (CRITICAL: should be 0)
rate(scbe_gcm_failures_total[5m])

# Nonce reuse (CRITICAL: should be 0)
increase(scbe_nonce_reuse_count[5m])

# Replay rejects
rate(scbe_replay_rejects_count[5m])
```

#### SCBE Signals
```promql
# Phase skew
histogram_quantile(0.99, rate(scbe_phase_skew_ms_bucket[10m]))

# Trust scores
scbe_trust_score_avg
scbe_trust_score{provider="openai"}

# Fail-to-noise events
rate(scbe_fail_to_noise_count[5m])
```

### Alert Rules (Prometheus)

```yaml
groups:
- name: scbe_critical_alerts
  rules:
  - alert: SCBEGCMFailureRate
    expr: rate(scbe_gcm_failures_total[5m]) > 0.005
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "SCBE GCM failure rate exceeded 0.5%"
      description: "GCM authentication failures: {{ $value | humanizePercentage }}"

  - alert: SCBENonceReuse
    expr: increase(scbe_nonce_reuse_count[5m]) > 0
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "SCBE nonce reuse detected - IMMEDIATE ROLLBACK REQUIRED"
      description: "Nonce reuse count: {{ $value }}"

  - alert: SCBEHighLatency
    expr: histogram_quantile(0.99, rate(scbe_envelope_verify_ms_bucket[5m])) > 50
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "SCBE envelope verification latency high"
      description: "P99 latency: {{ $value }}ms"

  - alert: SCBEPhaseSkew
    expr: histogram_quantile(0.99, rate(scbe_phase_skew_ms_bucket[10m])) > 2000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "SCBE phase skew indicates clock drift"
      description: "P99 phase skew: {{ $value }}ms"

  - alert: SCBETrustDegraded
    expr: scbe_trust_score_avg < 0.5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "SCBE swarm trust degraded"
      description: "Average trust score: {{ $value }}"
```

### PagerDuty Integration
```bash
# Critical alert webhook
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "SCBE Critical Security Alert",
      "severity": "critical",
      "source": "scbe-monitoring",
      "custom_details": {
        "metric": "scbe.gcm.failures_rate",
        "value": "0.8%",
        "threshold": "0.5%"
      }
    }
  }'
```

## 🚨 Emergency Procedures

### Immediate Rollback (Kill Switch)
```bash
# EMERGENCY: Disable SCBE verification immediately
curl -X POST https://api.company.com/feature-flags \
  -H "Authorization: Bearer $EMERGENCY_TOKEN" \
  -d '{
    "scbe_kill_switch": {
      "enabled": true,
      "reason": "Emergency rollback - GCM failure spike"
    }
  }'

# Verify rollback
curl -s https://api.company.com/health/scbe | jq '.envelope_verification_enabled'
# Should return: false
```

### Rollback Triggers (Automatic)
1. **Nonce reuse count ≥ 1** → Immediate rollback
2. **Phase skew p99 > 2s for 10m** → Auto-rollback  
3. **Verify latency p99 > 50ms for 5m** → Auto-rollback
4. **GCM failure rate > 0.5% for 5m** → Auto-rollback

### Manual Rollback Procedure
```bash
# 1. Activate kill switch
./scripts/scbe-kill-switch.sh activate "Manual rollback - investigating issue"

# 2. Verify traffic routing to fallback
curl -s https://api.company.com/health/orchestrator | jq '.envelope_mode'
# Should return: "disabled" or "fallback"

# 3. Check error rates normalize
watch -n 10 'curl -s https://grafana.company.com/api/metrics/error-rate'

# 4. Investigate root cause
kubectl logs -f deployment/orchestrator | grep -i scbe

# 5. When ready to re-enable
./scripts/scbe-kill-switch.sh deactivate
```

## 🔧 Operational Procedures

### Key Rotation
```bash
# Automated rotation (every 90 days)
aws kms create-key --description "SCBE Master Key $(date +%Y%m%d)"

# Update configuration
export NEW_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/new-key-id"
kubectl set env deployment/orchestrator SCBE_KMS_KEY_ID=$NEW_KEY_ID

# Verify rotation
curl -s https://api.company.com/health/scbe | jq '.current_key_id'
```

### Replay Cache Maintenance
```bash
# Monitor cache size
redis-cli -h prod-redis-cluster INFO memory

# Clean expired entries (automated)
redis-cli -h prod-redis-cluster --scan --pattern "scbe:replay:*" | \
  xargs -n 1000 redis-cli -h prod-redis-cluster DEL

# Monitor cache hit rate
redis-cli -h prod-redis-cluster INFO stats | grep keyspace_hits
```

### Trust Score Calibration
```bash
# View current trust scores
curl -s https://api.company.com/metrics/scbe/trust-scores | jq '.'

# Manual trust adjustment (emergency only)
curl -X POST https://api.company.com/admin/scbe/trust \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "provider": "openai",
    "trust_score": 0.95,
    "reason": "Manual calibration after incident resolution"
  }'
```

## 📋 Incident Response Playbook

### High GCM Failure Rate
1. **Immediate**: Check kill switch status
2. **Investigate**: Review recent deployments, key rotations
3. **Mitigate**: Reduce traffic percentage or activate kill switch
4. **Root Cause**: Check KMS connectivity, key permissions
5. **Resolution**: Fix underlying issue, gradual re-enable

### Nonce Reuse Detection
1. **CRITICAL**: Immediate rollback (automated)
2. **Investigate**: Check session management, counter overflow
3. **Security Review**: Assess potential compromise
4. **Fix**: Implement counter reset, session isolation
5. **Validation**: Full security audit before re-enable

### Phase Skew Alerts
1. **Check**: NTP synchronization across fleet
2. **Investigate**: Network latency, clock drift
3. **Mitigate**: Expand skew window temporarily
4. **Fix**: Sync clocks, investigate network issues
5. **Monitor**: Verify skew returns to normal

### Trust Score Degradation
1. **Identify**: Which providers affected
2. **Investigate**: Recent provider behavior changes
3. **Isolate**: Reduce traffic to affected providers
4. **Analyze**: Provider response patterns, anomalies
5. **Recover**: Gradual trust restoration with monitoring

## 🧪 Chaos Testing

### Failure Injection Scripts
```bash
# Simulate GCM failures
./scripts/chaos/inject-gcm-failures.sh --provider openai --rate 0.01 --duration 5m

# Simulate clock drift
./scripts/chaos/inject-clock-skew.sh --skew 3000ms --duration 10m

# Simulate KMS outage
./scripts/chaos/block-kms-access.sh --duration 2m

# Simulate high latency
./scripts/chaos/inject-latency.sh --target envelope-verify --latency 100ms --duration 5m
```

### Chaos Test Schedule
- **Weekly**: GCM failure injection (0.1% rate, 5 minutes)
- **Monthly**: Clock drift simulation (2s skew, 10 minutes)  
- **Quarterly**: KMS outage simulation (2 minutes)
- **On-demand**: Before major releases

## 📞 Escalation Contacts

### Security Team
- **Primary**: security-team@company.com
- **On-call**: +1-555-SECURITY
- **Slack**: #security-incidents

### Platform Team  
- **Primary**: platform-team@company.com
- **On-call**: +1-555-PLATFORM
- **Slack**: #platform-incidents

### Executive Escalation
- **CTO**: cto@company.com
- **CISO**: ciso@company.com
- **VP Engineering**: vp-eng@company.com

---

## ✅ Pre-Go-Live Sign-off

- [ ] **Security Team**: Cryptographic implementation reviewed and approved
- [ ] **Platform Team**: Infrastructure and monitoring ready
- [ ] **SRE Team**: Runbooks tested, alerts configured
- [ ] **Engineering Manager**: Code review completed
- [ ] **CTO**: Business risk assessment approved

**Deployment Authorization**: _________________ Date: _________

**Emergency Contacts Verified**: ✅  
**Monitoring Dashboards Live**: ✅  
**Alert Rules Active**: ✅  
**Kill Switch Tested**: ✅  

🚀 **READY FOR PRODUCTION DEPLOYMENT** 🚀