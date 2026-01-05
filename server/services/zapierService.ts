/**
 * Zapier Service v3.0
 * 
 * Webhook delivery service for Zapier integration.
 * Supports event dispatching with retry logic, signature verification,
 * idempotency, rate limiting, and replay protection.
 * 
 * @version 3.0.0
 * @adaptable true - Works without webhooks configured, no-op when empty
 */

import crypto from "crypto";
import { storage } from "../storage";
import type { ZapierWebhook, InsertZapierWebhookLog } from "@shared/schema";

export type ZapierEventType = 
  | "user.created"
  | "project.created"
  | "agent_run.completed"
  | "roundtable.message"
  | "workflow.completed"
  | "integration.connected";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_RATE_LIMIT = 60; // 60 requests per minute per webhook

// In-memory stores for idempotency and rate limiting
const deliveredEventIds = new Map<string, number>(); // eventId -> timestamp
const rateLimitCounters = new Map<string, { count: number; windowStart: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  // Clean up delivered event IDs older than 1 hour
  for (const [eventId, timestamp] of deliveredEventIds) {
    if (now - timestamp > 60 * 60 * 1000) {
      deliveredEventIds.delete(eventId);
    }
  }
  // Clean up rate limit counters older than 2 minutes
  for (const [webhookId, data] of rateLimitCounters) {
    if (now - data.windowStart > 2 * RATE_LIMIT_WINDOW_MS) {
      rateLimitCounters.delete(webhookId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

interface WebhookEnvelope {
  id: string;              // UUID for idempotency
  type: ZapierEventType;
  orgId: string;
  createdAt: string;       // ISO timestamp
  data: Record<string, unknown>;
}

interface WebhookPayload {
  event: ZapierEventType;
  timestamp: string;
  data: Record<string, unknown>;
  /** @deprecated Use envelope.id instead */
  eventId?: string;
}

function generateEventId(): string {
  return crypto.randomUUID();
}

function signPayload(payload: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
}

/**
 * Check if event was already delivered (idempotency)
 */
function isEventDelivered(eventId: string, webhookId: string): boolean {
  const key = `${webhookId}:${eventId}`;
  return deliveredEventIds.has(key);
}

/**
 * Mark event as delivered
 */
function markEventDelivered(eventId: string, webhookId: string): void {
  const key = `${webhookId}:${eventId}`;
  deliveredEventIds.set(key, Date.now());
}

/**
 * Check rate limit for webhook
 */
function checkRateLimit(webhookId: string, limit: number = DEFAULT_RATE_LIMIT): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const counter = rateLimitCounters.get(webhookId);
  
  if (!counter || now - counter.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitCounters.set(webhookId, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }
  
  if (counter.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  counter.count++;
  return { allowed: true, remaining: limit - counter.count };
}

/**
 * Validate timestamp is within tolerance (replay protection)
 */
function isTimestampValid(timestamp: string): boolean {
  const eventTime = new Date(timestamp).getTime();
  const now = Date.now();
  return Math.abs(now - eventTime) <= TIMESTAMP_TOLERANCE_MS;
}

async function deliverWebhook(
  webhook: ZapierWebhook,
  envelope: WebhookEnvelope,
  retryCount: number = 0
): Promise<{ success: boolean; statusCode?: number; body?: string; error?: string; skipped?: boolean; skipReason?: string }> {
  // Check idempotency
  if (isEventDelivered(envelope.id, webhook.id)) {
    return { success: true, skipped: true, skipReason: "duplicate_event" };
  }
  
  // Check rate limit
  const rateLimit = checkRateLimit(webhook.id);
  if (!rateLimit.allowed) {
    return { success: false, skipped: true, skipReason: "rate_limited" };
  }
  
  // Validate timestamp (replay protection)
  if (!isTimestampValid(envelope.createdAt)) {
    return { success: false, skipped: true, skipReason: "timestamp_expired" };
  }

  const payloadString = JSON.stringify(envelope);
  const signature = signPayload(payloadString, webhook.secretKey);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    const response = await fetch(webhook.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": `sha256=${signature}`,
        "X-Timestamp": timestamp,
        "X-Event-Id": envelope.id,
        "X-Event-Type": envelope.type,
        // Legacy headers for backward compatibility
        "X-Zapier-Signature": signature,
        "X-Zapier-Event": envelope.type,
        "X-Zapier-Timestamp": envelope.createdAt,
      },
      body: payloadString,
    });

    const bodyText = await response.text().catch(() => "");

    if (response.ok) {
      markEventDelivered(envelope.id, webhook.id);
      return { success: true, statusCode: response.status, body: bodyText };
    }

    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return deliverWebhook(webhook, envelope, retryCount + 1);
    }

    return { success: false, statusCode: response.status, body: bodyText };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return deliverWebhook(webhook, envelope, retryCount + 1);
    }

    return { success: false, error: errorMessage };
  }
}

async function logDelivery(
  webhookId: string,
  event: string,
  envelope: WebhookEnvelope,
  result: { success: boolean; statusCode?: number; body?: string; error?: string; skipped?: boolean; skipReason?: string },
  retryCount: number = 0
): Promise<void> {
  try {
    const logData: InsertZapierWebhookLog = {
      webhookId,
      event,
      payload: {
        ...envelope,
        _meta: {
          eventId: envelope.id,
          retryCount,
          skipped: result.skipped,
          skipReason: result.skipReason,
        },
      } as any,
      responseStatus: result.statusCode ?? null,
      responseBody: result.body ?? null,
      success: result.success,
      errorMessage: result.error ?? result.skipReason ?? null,
    };
    await storage.createZapierWebhookLog(logData);
  } catch (err) {
    console.error("[ZapierService] Failed to log webhook delivery:", err);
  }
}

export async function dispatchEvent(
  orgId: string,
  event: ZapierEventType,
  data: Record<string, unknown>
): Promise<{ dispatched: number; succeeded: number; failed: number; skipped: number }> {
  const webhooks = await storage.getZapierWebhooksByEvent(orgId, event);
  const activeWebhooks = webhooks.filter((w) => w.isActive);

  if (activeWebhooks.length === 0) {
    return { dispatched: 0, succeeded: 0, failed: 0, skipped: 0 };
  }

  // Create envelope with unique event ID for idempotency
  const envelope: WebhookEnvelope = {
    id: generateEventId(),
    type: event,
    orgId,
    createdAt: new Date().toISOString(),
    data,
  };

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  const deliveryPromises = activeWebhooks.map(async (webhook) => {
    const result = await deliverWebhook(webhook, envelope);
    await logDelivery(webhook.id, event, envelope, result);

    if (result.skipped) {
      skipped++;
    } else if (result.success) {
      succeeded++;
      await storage.updateZapierWebhook(webhook.id, {
        lastTriggeredAt: new Date(),
        triggerCount: webhook.triggerCount + 1,
      });
    } else {
      failed++;
    }
  });

  await Promise.allSettled(deliveryPromises);

  return { dispatched: activeWebhooks.length, succeeded, failed, skipped };
}

/**
 * Retry a failed webhook delivery manually
 */
export async function retryDelivery(
  webhookId: string,
  logId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhook = await storage.getZapierWebhook(webhookId);
    if (!webhook) {
      return { success: false, error: "Webhook not found" };
    }

    const logs = await storage.getZapierWebhookLogs(webhookId, 1);
    const log = logs.find(l => l.id === logId);
    if (!log) {
      return { success: false, error: "Log entry not found" };
    }

    // Reconstruct envelope from log
    const payload = log.payload as any;
    const envelope: WebhookEnvelope = {
      id: payload._meta?.eventId || generateEventId(),
      type: log.event as ZapierEventType,
      orgId: webhook.orgId,
      createdAt: payload.createdAt || new Date().toISOString(),
      data: payload.data || payload,
    };

    // Clear the delivered event ID to allow retry
    const key = `${webhookId}:${envelope.id}`;
    deliveredEventIds.delete(key);

    const result = await deliverWebhook(webhook, envelope);
    await logDelivery(webhookId, log.event, envelope, result, 1);

    return { success: result.success, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function generateSecretKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function verifySignature(payload: string, signature: string, secretKey: string): boolean {
  const expectedSignature = signPayload(payload, secretKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

export const SUPPORTED_EVENTS: ZapierEventType[] = [
  "user.created",
  "project.created",
  "agent_run.completed",
  "roundtable.message",
  "workflow.completed",
  "integration.connected",
];

export function getSampleData(event: ZapierEventType): Record<string, unknown> {
  const samples: Record<ZapierEventType, Record<string, unknown>> = {
    "user.created": {
      id: "usr_sample123",
      email: "user@example.com",
      role: "member",
      createdAt: new Date().toISOString(),
    },
    "project.created": {
      id: "prj_sample123",
      name: "Sample Project",
      orgId: "org_sample123",
      createdAt: new Date().toISOString(),
    },
    "agent_run.completed": {
      id: "run_sample123",
      projectId: "prj_sample123",
      status: "completed",
      provider: "openai",
      model: "gpt-4o",
      costEstimate: "0.0250",
      createdAt: new Date().toISOString(),
    },
    "roundtable.message": {
      id: "msg_sample123",
      sessionId: "ses_sample123",
      senderType: "ai",
      provider: "openai",
      model: "gpt-4o",
      content: "This is a sample AI response in the roundtable discussion.",
      sequenceNumber: 1,
      createdAt: new Date().toISOString(),
    },
    "workflow.completed": {
      id: "wf_sample123",
      workflowId: "wfl_sample123",
      name: "Sample Workflow",
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    "integration.connected": {
      id: "int_sample123",
      orgId: "org_sample123",
      provider: "github",
      status: "connected",
      createdAt: new Date().toISOString(),
    },
  };

  return samples[event] || {};
}
