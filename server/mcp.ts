/**
 * Model Context Protocol (MCP) Router v2.0
 * 
 * JSON-RPC 2.0 compliant MCP server implementation.
 * Provides tool-based API access for AI agents and external integrations.
 * 
 * @version 2.0.0
 * @protocol MCP 2025-06-18
 * @security API key authentication with role-based access
 */

import { Router, json, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { orchestratorQueue } from "./services/orchestrator";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_VERSION = "2.0.0";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type TextContent = { type: "text"; text: string };

type ToolResult = {
  content: TextContent[];
  structuredContent?: unknown;
  isError?: boolean;
};

type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  requiredRoles?: string[];
  costUnits?: number;
  handler: (ctx: ToolContext, args: any) => Promise<ToolResult>;
};

type AuthContext = {
  subject: string;
  roles: string[];
  apiKeyId: string;
  orgId?: string;
};

type ToolContext = {
  requestId: string;
  sessionId: string;
  auth: AuthContext;
};

type McpSession = {
  createdAtMs: number;
  initialized: boolean;
  auth: AuthContext;
  budgetRemaining: number;
};

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function jsonRpcOk(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcErr(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function asTextResult(value: unknown): ToolResult {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
    structuredContent: isObject(value) || Array.isArray(value) ? value : undefined,
  };
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): this {
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listPublic(): Array<Omit<ToolDefinition, "handler" | "requiredRoles" | "costUnits">> {
    return Array.from(this.tools.values()).map(({ handler, requiredRoles, costUnits, ...publicFields }) => publicFields);
  }
}

function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    name: "whoami",
    title: "Who am I?",
    description: "Return the authenticated identity (subject + roles + org).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        roles: { type: "array", items: { type: "string" } },
        apiKeyId: { type: "string" },
        orgId: { type: "string" },
      },
      required: ["subject", "roles", "apiKeyId"],
    },
    costUnits: 0,
    handler: async (ctx) => asTextResult(ctx.auth),
  });

  registry.register({
    name: "project.list",
    title: "List projects",
    description: "List all projects in the organization.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      properties: {
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, name: { type: "string" }, createdAt: { type: "string" } },
            required: ["id", "name", "createdAt"],
          },
        },
      },
      required: ["projects"],
    },
    requiredRoles: ["reader"],
    costUnits: 1,
    handler: async (ctx) => {
      if (!ctx.auth.orgId) {
        return { content: [{ type: "text", text: "No organization context" }], isError: true };
      }
      const projects = await storage.getProjectsByOrg(ctx.auth.orgId);
      return asTextResult({ projects: projects.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt })) });
    },
  });

  registry.register({
    name: "project.get",
    title: "Get project",
    description: "Fetch a single project by id.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
      additionalProperties: false,
    },
    requiredRoles: ["reader"],
    costUnits: 1,
    handler: async (ctx, args) => {
      const project = await storage.getProject(String(args?.projectId ?? ""));
      if (!project || project.orgId !== ctx.auth.orgId) {
        return asTextResult({ project: null });
      }
      return asTextResult({ project: { id: project.id, name: project.name, createdAt: project.createdAt } });
    },
  });

  registry.register({
    name: "project.create",
    title: "Create project",
    description: "Create a new project in the organization.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    },
    requiredRoles: ["writer"],
    costUnits: 2,
    handler: async (ctx, args) => {
      if (!ctx.auth.orgId) {
        return { content: [{ type: "text", text: "No organization context" }], isError: true };
      }
      const project = await storage.createProject({
        orgId: ctx.auth.orgId,
        name: String(args?.name ?? "Untitled"),
      });
      return asTextResult({ project: { id: project.id, name: project.name, createdAt: project.createdAt } });
    },
  });

  registry.register({
    name: "memory.add",
    title: "Add memory",
    description: "Add a memory entry to project knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        kind: { type: "string", description: "Type: note, document, link, etc." },
        source: { type: "string", description: "Source: manual, notion, drive, etc." },
        content: { type: "string" },
      },
      required: ["projectId", "content"],
      additionalProperties: false,
    },
    requiredRoles: ["writer"],
    costUnits: 2,
    handler: async (ctx, args) => {
      const project = await storage.getProject(String(args?.projectId ?? ""));
      if (!project || project.orgId !== ctx.auth.orgId) {
        return { content: [{ type: "text", text: "Project not found or unauthorized" }], isError: true };
      }
      const item = await storage.createMemoryItem({
        projectId: project.id,
        kind: String(args?.kind ?? "note"),
        source: String(args?.source ?? "mcp"),
        content: String(args?.content ?? ""),
        embeddingRef: null,
      });
      return asTextResult({ id: item.id, createdAt: item.createdAt });
    },
  });

  registry.register({
    name: "memory.search",
    title: "Search memory",
    description: "Search memory entries by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        query: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["projectId", "query"],
      additionalProperties: false,
    },
    requiredRoles: ["reader"],
    costUnits: 2,
    handler: async (ctx, args) => {
      const project = await storage.getProject(String(args?.projectId ?? ""));
      if (!project || project.orgId !== ctx.auth.orgId) {
        return { content: [{ type: "text", text: "Project not found or unauthorized" }], isError: true };
      }
      const results = await storage.searchMemoryItems(project.id, String(args?.query ?? ""));
      const limited = results.slice(0, Math.min(50, Number(args?.limit ?? 10)));
      return asTextResult({ results: limited.map(m => ({ id: m.id, kind: m.kind, content: m.content, createdAt: m.createdAt })) });
    },
  });

  registry.register({
    name: "vault.list",
    title: "List integrations",
    description: "List connected integrations for the organization.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredRoles: ["reader"],
    costUnits: 1,
    handler: async (ctx) => {
      if (!ctx.auth.orgId) {
        return { content: [{ type: "text", text: "No organization context" }], isError: true };
      }
      const integrations = await storage.getIntegrations(ctx.auth.orgId);
      return asTextResult({
        integrations: integrations.map(i => ({
          id: i.id,
          provider: i.provider,
          status: i.status,
          createdAt: i.createdAt,
        })),
      });
    },
  });

  registry.register({
    name: "vault.connect",
    title: "Connect integration",
    description: "Connect a new integration provider.",
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Provider name: zapier, github, notion, etc." },
        metadata: { type: "object", additionalProperties: true },
      },
      required: ["provider"],
      additionalProperties: false,
    },
    requiredRoles: ["admin"],
    costUnits: 3,
    handler: async (ctx, args) => {
      if (!ctx.auth.orgId) {
        return { content: [{ type: "text", text: "No organization context" }], isError: true };
      }
      const integration = await storage.createIntegration({
        orgId: ctx.auth.orgId,
        provider: String(args?.provider ?? ""),
        status: "connected",
        metadataJson: args?.metadata || {},
      });
      await storage.createAuditLog({
        orgId: ctx.auth.orgId,
        userId: null,
        action: "mcp_vault_connect",
        target: integration.provider,
        detailJson: { integrationId: integration.id, via: "mcp" },
      });
      return asTextResult({ id: integration.id, provider: integration.provider, status: integration.status });
    },
  });

  registry.register({
    name: "agent.run",
    title: "Run AI agent",
    description: "Start an AI agent run for a project goal.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        goal: { type: "string" },
        provider: { type: "string", description: "AI provider: gemini, perplexity, openai, anthropic" },
        model: { type: "string" },
      },
      required: ["projectId", "goal"],
      additionalProperties: false,
    },
    requiredRoles: ["runner"],
    costUnits: 10,
    handler: async (ctx, args) => {
      const project = await storage.getProject(String(args?.projectId ?? ""));
      if (!project || project.orgId !== ctx.auth.orgId) {
        return { content: [{ type: "text", text: "Project not found or unauthorized" }], isError: true };
      }
      const provider = String(args?.provider ?? "gemini");
      const model = String(args?.model ?? "gemini-2.0-flash");
      const agentRun = await storage.createAgentRun({
        projectId: project.id,
        status: "queued",
        model,
        provider,
        inputJson: { goal: args?.goal, triggeredBy: "mcp" },
        outputJson: null,
        costEstimate: null,
      });
      orchestratorQueue.enqueue({
        runId: agentRun.id,
        projectId: project.id,
        orgId: ctx.auth.orgId!,
        goal: String(args?.goal ?? ""),
        mode: "mcp",
      });
      return asTextResult({ runId: agentRun.id, status: "queued" });
    },
  });

  registry.register({
    name: "agent.status",
    title: "Get agent run status",
    description: "Check the status of an agent run.",
    inputSchema: {
      type: "object",
      properties: { runId: { type: "string" } },
      required: ["runId"],
      additionalProperties: false,
    },
    requiredRoles: ["reader"],
    costUnits: 1,
    handler: async (ctx, args) => {
      const run = await storage.getAgentRun(String(args?.runId ?? ""));
      if (!run) {
        return { content: [{ type: "text", text: "Run not found" }], isError: true };
      }
      const project = await storage.getProject(run.projectId);
      if (!project || project.orgId !== ctx.auth.orgId) {
        return { content: [{ type: "text", text: "Unauthorized" }], isError: true };
      }
      return asTextResult({
        runId: run.id,
        status: run.status,
        provider: run.provider,
        model: run.model,
        result: run.outputJson,
        costEstimate: run.costEstimate,
      });
    },
  });

  registry.register({
    name: "audit.list",
    title: "List audit logs",
    description: "Get recent audit logs for the organization.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
    requiredRoles: ["admin"],
    costUnits: 2,
    handler: async (ctx, args) => {
      if (!ctx.auth.orgId) {
        return { content: [{ type: "text", text: "No organization context" }], isError: true };
      }
      const logs = await storage.getAuditLogs(ctx.auth.orgId, Math.min(100, Number(args?.limit ?? 20)));
      return asTextResult({
        logs: logs.map(l => ({
          id: l.id,
          action: l.action,
          target: l.target,
          createdAt: l.createdAt,
        })),
      });
    },
  });

  return registry;
}

function hasAllRoles(have: string[], need: string[] | undefined): boolean {
  if (!need || need.length === 0) return true;
  const s = new Set(have);
  return need.every((r) => s.has(r));
}

type RateState = { windowStartMs: number; count: number };
function makeRateLimiter(perMinute: number = 60) {
  const buckets = new Map<string, RateState>();
  return function rateLimit(apiKeyId: string): { ok: true } | { ok: false; retryAfterSec: number } {
    const now = Date.now();
    const windowMs = 60_000;
    const state = buckets.get(apiKeyId);
    if (!state || now - state.windowStartMs >= windowMs) {
      buckets.set(apiKeyId, { windowStartMs: now, count: 1 });
      return { ok: true };
    }
    if (state.count >= perMinute) {
      const retryAfterSec = Math.ceil((windowMs - (now - state.windowStartMs)) / 1000);
      return { ok: false, retryAfterSec };
    }
    state.count += 1;
    return { ok: true };
  };
}

export function createMcpRouter() {
  const registry = buildRegistry();
  const router = Router();
  const sessions = new Map<string, McpSession>();
  const rateLimit = makeRateLimiter(120);
  const initialBudget = 10000;

  router.get("/schema", (_req, res) => {
    res.json({
      protocolVersion: MCP_PROTOCOL_VERSION,
      tools: registry.listPublic(),
    });
  });

  router.get("/", (_req, res) => {
    res.status(405).send("SSE not implemented on this MCP endpoint.");
  });

  router.post("/", json({ limit: "1mb" }), async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();

    const apiKey = (req.headers["x-api-key"] as string) || "";
    if (!apiKey) {
      return res.status(401).json({ error: "API key required. Use x-api-key header." });
    }

    const keyRecord = await storage.getApiKeyByKey(apiKey);
    if (!keyRecord) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const apiKeyId = crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
    const org = await storage.getOrg(keyRecord.orgId);
    const auth: AuthContext = {
      subject: `org:${keyRecord.orgId}`,
      roles: ["reader", "writer", "runner", "admin"],
      apiKeyId,
      orgId: keyRecord.orgId,
    };

    const rl = rateLimit(apiKeyId);
    if (!rl.ok) {
      res.setHeader("Retry-After", String((rl as any).retryAfterSec));
      return res.status(429).json({ error: "Rate limited" });
    }

    const msg: unknown = req.body;
    if (!isObject(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
      return res.status(400).json(jsonRpcErr(null, -32600, "Invalid JSON-RPC request"));
    }
    const rpc = msg as JsonRpcRequest;
    const id = rpc.id ?? undefined;
    const isNotification = id === undefined;

    await storage.createAuditLog({
      orgId: keyRecord.orgId,
      userId: null,
      action: "mcp_request",
      target: rpc.method,
      detailJson: { requestId, apiKeyId },
    });

    const sessionIdHeader = req.header("mcp-session-id") ?? undefined;
    const protoHeader = req.header("mcp-protocol-version") ?? undefined;

    function acceptNotification(): Response {
      return res.status(202).send();
    }

    try {
      if (rpc.method === "initialize") {
        const sessionId = crypto.randomUUID();
        sessions.set(sessionId, {
          createdAtMs: Date.now(),
          initialized: true,
          auth,
          budgetRemaining: initialBudget,
        });
        res.setHeader("Mcp-Session-Id", sessionId);
        const result = {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "ai-orchestration-hub-mcp",
            title: "AI Orchestration Hub MCP Gateway",
            version: "1.0.0",
          },
          instructions: "Use tools/list to discover tools, then tools/call to invoke them.",
        };
        if (isNotification) return acceptNotification();
        return res.json(jsonRpcOk(id ?? null, result));
      }

      if (rpc.method === "notifications/initialized") {
        if (sessionIdHeader && sessions.has(sessionIdHeader)) {
          sessions.get(sessionIdHeader)!.initialized = true;
        }
        if (isNotification) return acceptNotification();
        return res.json(jsonRpcOk(id ?? null, {}));
      }

      if (rpc.method === "ping") {
        if (isNotification) return acceptNotification();
        return res.json(jsonRpcOk(id ?? null, {}));
      }

      if (!sessionIdHeader || !sessions.has(sessionIdHeader)) {
        return res.status(400).json(jsonRpcErr(id ?? null, -32602, "Missing or invalid Mcp-Session-Id (initialize first)"));
      }
      const session = sessions.get(sessionIdHeader)!;

      if (protoHeader !== MCP_PROTOCOL_VERSION) {
        return res.status(400).json(
          jsonRpcErr(id ?? null, -32602, "Missing or invalid MCP-Protocol-Version header", {
            expected: MCP_PROTOCOL_VERSION,
            got: protoHeader ?? null,
          })
        );
      }

      if (rpc.method === "tools/list") {
        const result = { tools: registry.listPublic(), nextCursor: null };
        if (isNotification) return acceptNotification();
        return res.json(jsonRpcOk(id ?? null, result));
      }

      if (rpc.method === "tools/call") {
        const params = isObject(rpc.params) ? rpc.params : {};
        const toolName = String((params as any).name ?? "");
        const args = (params as any).arguments ?? {};

        const tool = registry.get(toolName);
        if (!tool) {
          return res.json(jsonRpcErr(id ?? null, -32602, `Unknown tool: ${toolName}`));
        }

        if (!hasAllRoles(session.auth.roles, tool.requiredRoles)) {
          return res.json(jsonRpcErr(id ?? null, -32001, "Forbidden", { requiredRoles: tool.requiredRoles ?? [] }));
        }

        const cost = tool.costUnits ?? 1;
        if (session.budgetRemaining - cost < 0) {
          return res.json(jsonRpcErr(id ?? null, -32002, "Budget exceeded", { remaining: session.budgetRemaining }));
        }

        const ctx: ToolContext = {
          requestId,
          sessionId: sessionIdHeader,
          auth: session.auth,
        };

        const toolResult = await tool.handler(ctx, args);
        session.budgetRemaining -= cost;

        const result = {
          content: toolResult.content ?? [{ type: "text", text: "" }],
          ...(toolResult.structuredContent !== undefined ? { structuredContent: toolResult.structuredContent } : {}),
          ...(toolResult.isError !== undefined ? { isError: toolResult.isError } : {}),
        };

        if (isNotification) return acceptNotification();
        return res.json(jsonRpcOk(id ?? null, result));
      }

      if (isNotification) return acceptNotification();
      return res.json(jsonRpcErr(id ?? null, -32601, `Method not found: ${rpc.method}`));
    } catch (e: any) {
      if (isNotification) return acceptNotification();
      return res.json(jsonRpcErr(id ?? null, -32603, "Internal error", { message: e?.message ?? String(e) }));
    }
  });

  return router;
}
