# Architecture Improvement Roadmap

Based on technical assessment feedback. Prioritized by impact and effort.

## Current Architecture Strengths

- ✅ Self-healing queue with 98.8% success rate under load
- ✅ Multi-provider AI failover (6 providers)
- ✅ Sandboxed code execution (E2B/Piston)
- ✅ AES-256-GCM API key encryption
- ✅ Session-based auth with CSRF protection
- ✅ Load tested for 100+ concurrent users

## Priority 1: Observability (Week 1-2)

### Current Gap
Limited telemetry, no distributed tracing, no SLOs defined.

### Implementation

```typescript
// Add OpenTelemetry instrumentation
// server/middleware/telemetry.ts
import { trace, metrics } from '@opentelemetry/api';

export const tracer = trace.getTracer('ai-workflow-platform');
export const meter = metrics.getMeter('ai-workflow-platform');

// Key metrics to track
const taskLatency = meter.createHistogram('task.latency');
const taskSuccess = meter.createCounter('task.success');
const taskFailure = meter.createCounter('task.failure');
const queueDepth = meter.createObservableGauge('queue.depth');
```

### SLOs to Define
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API P95 Latency | <500ms | >750ms |
| Task Success Rate | >95% | <90% |
| Queue Processing Time | <30s | >60s |
| Provider Failover Time | <5s | >10s |

### Tools
- OpenTelemetry SDK
- Prometheus for metrics
- Grafana for dashboards
- PagerDuty/OpsGenie for alerts

---

## Priority 2: Secrets Management (Week 2-3)

### Current Gap
API keys in environment variables, no rotation, limited audit logging.

### Implementation

```typescript
// server/services/secretsManager.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: string; expires: number }> = new Map();
  
  async getSecret(name: string): Promise<string> {
    const cached = this.cache.get(name);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    const command = new GetSecretValueCommand({ SecretId: name });
    const response = await this.client.send(command);
    
    // Cache for 5 minutes
    this.cache.set(name, {
      value: response.SecretString!,
      expires: Date.now() + 5 * 60 * 1000
    });
    
    // Audit log
    await this.logAccess(name);
    
    return response.SecretString!;
  }
}
```

### Migration Path
1. Deploy AWS Secrets Manager / HashiCorp Vault
2. Migrate API keys from .env to vault
3. Implement automatic rotation (90-day cycle)
4. Add audit logging for all secret access

---

## Priority 3: Workflow Orchestration Upgrade (Week 3-4)

### Current Gap
In-memory queue works but doesn't persist across restarts.

### Option A: Redis + BullMQ (Recommended for MVP)

```typescript
// server/services/distributedQueue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

export const taskQueue = new Queue('ai-tasks', { connection });

export const taskWorker = new Worker('ai-tasks', async (job) => {
  // Self-healing logic here
}, {
  connection,
  concurrency: 10,
  limiter: { max: 100, duration: 60000 }
});
```

### Option B: Temporal (For Enterprise Scale)

```typescript
// Temporal workflow definition
import { proxyActivities, sleep } from '@temporalio/workflow';

export async function aiTaskWorkflow(task: AITask): Promise<TaskResult> {
  const { executeTask, healTask } = proxyActivities<Activities>();
  
  let iteration = 1;
  while (iteration <= 3) {
    const result = await executeTask(task);
    if (result.success) return result;
    
    await sleep('5s');
    task = await healTask(task, result.error);
    iteration++;
  }
  
  throw new Error('Max healing attempts reached');
}
```

---

## Priority 4: Data Provenance & Audit Trails (Week 4-5)

### Current Gap
Limited audit logging, no chain of custody for AI decisions.

### Implementation

```typescript
// server/services/auditLog.ts
interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  input: Record<string, any>;
  output: Record<string, any>;
  aiModel?: string;
  aiPrompt?: string;
  aiResponse?: string;
  metadata: Record<string, any>;
}

export class AuditLogger {
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry
    });
  }
  
  async getChainOfCustody(resourceId: string): Promise<AuditEntry[]> {
    return db.select()
      .from(auditLogs)
      .where(eq(auditLogs.resourceId, resourceId))
      .orderBy(auditLogs.timestamp);
  }
}
```

### Schema Addition

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  input JSONB,
  output JSONB,
  ai_model VARCHAR(50),
  ai_prompt TEXT,
  ai_response TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_resource ON audit_logs(resource_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

---

## Priority 5: LLM Reliability Improvements (Week 5-6)

### Current Gap
No structured output validation, limited retry logic for LLM calls.

### Implementation

```typescript
// server/services/structuredLLM.ts
import { z } from 'zod';

const TaskResponseSchema = z.object({
  consensus_code: z.string(),
  architect_notes: z.string(),
  bug_hunter_notes: z.string(),
  consensus_reasoning: z.string()
});

export async function getStructuredResponse<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options: { maxRetries: number; temperature: number }
): Promise<T> {
  for (let i = 0; i < options.maxRetries; i++) {
    const response = await llm.chat([
      { role: 'system', content: 'Respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ], { temperature: options.temperature });
    
    try {
      const parsed = JSON.parse(response.content);
      return schema.parse(parsed);
    } catch (e) {
      if (i === options.maxRetries - 1) throw e;
      // Retry with lower temperature
      options.temperature = Math.max(0, options.temperature - 0.2);
    }
  }
  throw new Error('Failed to get valid structured response');
}
```

### Cost Controls

```typescript
// server/services/costGuard.ts
export class CostGuard {
  private dailyBudget: number;
  private monthlyBudget: number;
  private spent: { daily: number; monthly: number } = { daily: 0, monthly: 0 };
  
  async checkBudget(estimatedCost: number): Promise<boolean> {
    if (this.spent.daily + estimatedCost > this.dailyBudget * 0.8) {
      await this.alertAdmins('80% daily budget reached');
    }
    return this.spent.daily + estimatedCost <= this.dailyBudget;
  }
  
  async recordUsage(tokens: number, model: string): Promise<void> {
    const cost = this.calculateCost(tokens, model);
    this.spent.daily += cost;
    this.spent.monthly += cost;
    await this.logUsage({ tokens, model, cost });
  }
}
```

---

## Implementation Timeline

| Week | Priority | Deliverable |
|------|----------|-------------|
| 1-2 | Observability | OpenTelemetry + Grafana dashboards |
| 2-3 | Secrets | AWS Secrets Manager integration |
| 3-4 | Queue | Redis + BullMQ migration |
| 4-5 | Audit | Full audit trail system |
| 5-6 | LLM | Structured outputs + cost guards |

## Cost Estimates

| Component | Monthly Cost |
|-----------|--------------|
| Redis (managed) | $15-50 |
| Secrets Manager | $5-10 |
| Grafana Cloud | $0-50 |
| OpenTelemetry | Free (self-hosted) |
| **Total** | **$20-110/month** |

## Success Metrics

After implementation:
- [ ] P95 latency <500ms (currently ~89ms ✓)
- [ ] 99.9% uptime SLO
- [ ] Full audit trail for all AI decisions
- [ ] Automatic secret rotation every 90 days
- [ ] Zero secrets in environment variables
- [ ] Queue persistence across restarts
