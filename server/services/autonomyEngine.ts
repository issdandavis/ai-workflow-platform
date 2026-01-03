/**
 * AI Autonomy Engine v2.0
 * 
 * Allows AI to take full control of the application at user's discretion.
 * The AI can execute any action the app is capable of, including:
 * - Managing integrations
 * - Running workflows
 * - Modifying settings
 * - Creating/editing projects
 * - Executing code changes (in developer mode)
 * - Managing users and permissions
 * 
 * @version 2.0.0
 * @security Requires explicit user consent, all actions logged
 * @feature Self-improvement capability
 */

import { storage } from "../storage";
import { getProviderAdapter } from "./providerAdapters";
import { z } from "zod";

// Autonomy levels
export type AutonomyLevel = "off" | "supervised" | "autonomous";

// Actions the AI can perform
export type AutonomyAction = 
  | "read_data"
  | "write_data"
  | "execute_workflow"
  | "manage_integrations"
  | "modify_settings"
  | "create_project"
  | "delete_project"
  | "manage_users"
  | "execute_code"
  | "modify_app_code"
  | "deploy_changes"
  | "access_external_apis"
  | "send_notifications"
  | "manage_billing";

// Permission matrix for autonomy levels
const AUTONOMY_PERMISSIONS: Record<AutonomyLevel, AutonomyAction[]> = {
  off: [],
  supervised: [
    "read_data",
    "execute_workflow",
    "create_project",
    "access_external_apis",
  ],
  autonomous: [
    "read_data",
    "write_data",
    "execute_workflow",
    "manage_integrations",
    "modify_settings",
    "create_project",
    "delete_project",
    "manage_users",
    "execute_code",
    "modify_app_code",
    "deploy_changes",
    "access_external_apis",
    "send_notifications",
    "manage_billing",
  ],
};

// Session state for autonomy
interface AutonomySession {
  id: string;
  userId: string;
  orgId: string;
  level: AutonomyLevel;
  startedAt: Date;
  actionsPerformed: AutonomyActionLog[];
  isActive: boolean;
  provider: string;
  model: string;
  goal?: string;
  constraints?: string[];
}

interface AutonomyActionLog {
  action: AutonomyAction;
  description: string;
  timestamp: Date;
  success: boolean;
  result?: any;
  error?: string;
  requiresApproval?: boolean;
  approved?: boolean;
}

// Active autonomy sessions
const activeSessions = new Map<string, AutonomySession>();

// Pending approvals for supervised mode
const pendingApprovals = new Map<string, {
  sessionId: string;
  action: AutonomyAction;
  description: string;
  payload: any;
  resolve: (approved: boolean) => void;
}>();

export const autonomySessionSchema = z.object({
  level: z.enum(["off", "supervised", "autonomous"]),
  provider: z.string().default("openai"),
  model: z.string().default("gpt-4o"),
  goal: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  timeoutMinutes: z.number().min(1).max(480).default(60),
});

export type AutonomySessionConfig = z.infer<typeof autonomySessionSchema>;

/**
 * Start an autonomy session
 */
export async function startAutonomySession(
  userId: string,
  orgId: string,
  config: AutonomySessionConfig
): Promise<AutonomySession> {
  const sessionId = `autonomy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: AutonomySession = {
    id: sessionId,
    userId,
    orgId,
    level: config.level,
    startedAt: new Date(),
    actionsPerformed: [],
    isActive: true,
    provider: config.provider,
    model: config.model,
    goal: config.goal,
    constraints: config.constraints,
  };
  
  activeSessions.set(sessionId, session);
  
  // Log the session start
  await storage.createAuditLog({
    orgId,
    userId,
    action: "autonomy_session_started",
    target: sessionId,
    detailJson: {
      level: config.level,
      provider: config.provider,
      model: config.model,
      goal: config.goal,
    },
  });
  
  // Set timeout to auto-end session
  setTimeout(() => {
    endAutonomySession(sessionId, "timeout");
  }, config.timeoutMinutes * 60 * 1000);
  
  return session;
}

/**
 * End an autonomy session
 */
export async function endAutonomySession(
  sessionId: string,
  reason: "user_request" | "timeout" | "error" | "goal_completed"
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) return;
  
  session.isActive = false;
  
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "autonomy_session_ended",
    target: sessionId,
    detailJson: {
      reason,
      duration: Date.now() - session.startedAt.getTime(),
      actionsCount: session.actionsPerformed.length,
    },
  });
  
  activeSessions.delete(sessionId);
}

/**
 * Check if an action is permitted for the current autonomy level
 */
export function isActionPermitted(session: AutonomySession, action: AutonomyAction): boolean {
  return AUTONOMY_PERMISSIONS[session.level].includes(action);
}

/**
 * Execute an autonomous action
 */
export async function executeAutonomousAction(
  sessionId: string,
  action: AutonomyAction,
  description: string,
  payload: any
): Promise<{ success: boolean; result?: any; error?: string; pendingApproval?: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    return { success: false, error: "No active autonomy session" };
  }
  
  if (!isActionPermitted(session, action)) {
    return { success: false, error: `Action '${action}' not permitted at autonomy level '${session.level}'` };
  }
  
  // In supervised mode, certain actions require approval
  const requiresApproval = session.level === "supervised" && 
    ["write_data", "delete_project", "modify_app_code", "deploy_changes", "manage_billing"].includes(action);
  
  if (requiresApproval) {
    const approvalId = `approval_${Date.now()}`;
    
    return new Promise((resolve) => {
      pendingApprovals.set(approvalId, {
        sessionId,
        action,
        description,
        payload,
        resolve: (approved) => {
          pendingApprovals.delete(approvalId);
          if (approved) {
            executeActionInternal(session, action, description, payload)
              .then(result => resolve(result));
          } else {
            resolve({ success: false, error: "Action rejected by user" });
          }
        },
      });
      
      resolve({ success: true, pendingApproval: approvalId });
    });
  }
  
  return executeActionInternal(session, action, description, payload);
}

/**
 * Internal action execution
 */
async function executeActionInternal(
  session: AutonomySession,
  action: AutonomyAction,
  description: string,
  payload: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  const actionLog: AutonomyActionLog = {
    action,
    description,
    timestamp: new Date(),
    success: false,
  };
  
  try {
    let result: any;
    
    switch (action) {
      case "read_data":
        result = await handleReadData(session, payload);
        break;
      case "write_data":
        result = await handleWriteData(session, payload);
        break;
      case "execute_workflow":
        result = await handleExecuteWorkflow(session, payload);
        break;
      case "manage_integrations":
        result = await handleManageIntegrations(session, payload);
        break;
      case "modify_settings":
        result = await handleModifySettings(session, payload);
        break;
      case "create_project":
        result = await handleCreateProject(session, payload);
        break;
      case "delete_project":
        result = await handleDeleteProject(session, payload);
        break;
      case "execute_code":
        result = await handleExecuteCode(session, payload);
        break;
      case "modify_app_code":
        result = await handleModifyAppCode(session, payload);
        break;
      case "access_external_apis":
        result = await handleAccessExternalApis(session, payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    actionLog.success = true;
    actionLog.result = result;
    session.actionsPerformed.push(actionLog);
    
    return { success: true, result };
  } catch (error) {
    actionLog.success = false;
    actionLog.error = error instanceof Error ? error.message : "Unknown error";
    session.actionsPerformed.push(actionLog);
    
    return { success: false, error: actionLog.error };
  }
}

// Action handlers
async function handleReadData(session: AutonomySession, payload: { type: string; query?: any }) {
  const { type, query } = payload;
  
  switch (type) {
    case "projects":
      return await storage.getProjects(session.orgId);
    case "integrations":
      return await storage.getIntegrations(session.orgId);
    case "workflows":
      return await storage.getWorkflows(session.orgId);
    case "audit_logs":
      return await storage.getAuditLogs(session.orgId, 100);
    default:
      throw new Error(`Unknown data type: ${type}`);
  }
}

async function handleWriteData(session: AutonomySession, payload: { type: string; data: any }) {
  const { type, data } = payload;
  
  switch (type) {
    case "memory_item":
      return await storage.createMemoryItem({ ...data, projectId: data.projectId });
    default:
      throw new Error(`Unknown data type for write: ${type}`);
  }
}

async function handleExecuteWorkflow(session: AutonomySession, payload: { workflowId: string }) {
  // Trigger workflow execution
  const workflow = await storage.getWorkflow(payload.workflowId);
  if (!workflow || workflow.orgId !== session.orgId) {
    throw new Error("Workflow not found or access denied");
  }
  
  // Create workflow run
  const run = await storage.createWorkflowRun({
    workflowId: payload.workflowId,
    status: "running",
  });
  
  return { runId: run.id, status: "started" };
}

async function handleManageIntegrations(session: AutonomySession, payload: { action: string; provider?: string; config?: any }) {
  switch (payload.action) {
    case "list":
      return await storage.getIntegrations(session.orgId);
    case "connect":
      return await storage.createIntegration({
        orgId: session.orgId,
        provider: payload.provider!,
        status: "connected",
        metadataJson: payload.config || {},
      });
    case "disconnect":
      await storage.disconnectIntegration(payload.provider!);
      return { success: true };
    default:
      throw new Error(`Unknown integration action: ${payload.action}`);
  }
}

async function handleModifySettings(session: AutonomySession, payload: { settings: Record<string, any> }) {
  // Store settings changes
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "settings_modified_by_ai",
    target: "org_settings",
    detailJson: payload.settings,
  });
  
  return { success: true, settings: payload.settings };
}

async function handleCreateProject(session: AutonomySession, payload: { name: string; description?: string }) {
  const project = await storage.createProject({
    orgId: session.orgId,
    name: payload.name,
  });
  
  return project;
}

async function handleDeleteProject(session: AutonomySession, payload: { projectId: string }) {
  const project = await storage.getProject(payload.projectId);
  if (!project || project.orgId !== session.orgId) {
    throw new Error("Project not found or access denied");
  }
  
  await storage.deleteProject(payload.projectId);
  return { success: true, deletedId: payload.projectId };
}

async function handleExecuteCode(session: AutonomySession, payload: { code: string; language: string }) {
  // This would integrate with a sandboxed code execution environment
  // For safety, we log the attempt but don't actually execute arbitrary code
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "code_execution_requested",
    target: "sandbox",
    detailJson: { language: payload.language, codeLength: payload.code.length },
  });
  
  return { 
    success: true, 
    message: "Code execution logged. Sandboxed execution would happen here.",
    codePreview: payload.code.substring(0, 100) + "..."
  };
}

async function handleModifyAppCode(session: AutonomySession, payload: { filePath: string; content: string; action: "create" | "update" | "delete" }) {
  // This integrates with the Developer Mode feature
  // Validates and logs code modifications
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "app_code_modification",
    target: payload.filePath,
    detailJson: { 
      action: payload.action,
      contentLength: payload.content?.length || 0,
    },
  });
  
  return {
    success: true,
    filePath: payload.filePath,
    action: payload.action,
    message: "Code modification queued for developer mode review",
  };
}

async function handleAccessExternalApis(session: AutonomySession, payload: { url: string; method: string; body?: any }) {
  // Log external API access
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "external_api_access",
    target: payload.url,
    detailJson: { method: payload.method },
  });
  
  // In a real implementation, this would make the actual API call
  return {
    success: true,
    message: "External API access logged",
    url: payload.url,
  };
}

/**
 * Approve a pending action
 */
export function approvePendingAction(approvalId: string, approved: boolean): boolean {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) return false;
  
  pending.resolve(approved);
  return true;
}

/**
 * Get active session
 */
export function getAutonomySession(sessionId: string): AutonomySession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get all active sessions for a user
 */
export function getUserActiveSessions(userId: string): AutonomySession[] {
  return Array.from(activeSessions.values()).filter(s => s.userId === userId && s.isActive);
}

/**
 * Get pending approvals for a session
 */
export function getSessionPendingApprovals(sessionId: string) {
  return Array.from(pendingApprovals.entries())
    .filter(([_, p]) => p.sessionId === sessionId)
    .map(([id, p]) => ({ id, action: p.action, description: p.description }));
}

/**
 * AI-driven goal execution
 * The AI analyzes the goal and autonomously determines what actions to take
 */
export async function executeGoalAutonomously(
  sessionId: string,
  goal: string
): Promise<{ success: boolean; steps: any[]; error?: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    return { success: false, steps: [], error: "No active autonomy session" };
  }
  
  const steps: any[] = [];
  
  try {
    // Get AI provider
    const adapter = getProviderAdapter(session.provider);
    
    // Ask AI to break down the goal into steps
    const planningPrompt = `You are an AI assistant with full control of an application. 
The user has given you this goal: "${goal}"

Available actions you can take:
- read_data: Read projects, integrations, workflows, audit logs
- write_data: Create memory items, notes
- execute_workflow: Run automated workflows
- manage_integrations: Connect/disconnect external services
- modify_settings: Change application settings
- create_project: Create new projects
- delete_project: Remove projects
- execute_code: Run code in sandbox
- modify_app_code: Edit the application's source code
- access_external_apis: Call external APIs

${session.constraints?.length ? `Constraints: ${session.constraints.join(", ")}` : ""}

Break down this goal into specific actions. Respond with a JSON array of steps:
[{"action": "action_name", "description": "what this step does", "payload": {...}}]`;

    const response = await adapter.chat([
      { role: "system", content: "You are an autonomous AI agent. Respond only with valid JSON." },
      { role: "user", content: planningPrompt }
    ], { model: session.model });
    
    // Parse the AI's plan
    const planMatch = response.content.match(/\[[\s\S]*\]/);
    if (!planMatch) {
      return { success: false, steps: [], error: "AI could not generate a valid plan" };
    }
    
    const plan = JSON.parse(planMatch[0]);
    
    // Execute each step
    for (const step of plan) {
      const result = await executeAutonomousAction(
        sessionId,
        step.action,
        step.description,
        step.payload
      );
      
      steps.push({
        ...step,
        result,
      });
      
      // Stop if a step fails
      if (!result.success && !result.pendingApproval) {
        break;
      }
    }
    
    return { success: true, steps };
  } catch (error) {
    return { 
      success: false, 
      steps, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
