/**
 * API Routes for AI Autonomy and Developer Mode v2.0
 * 
 * Provides REST API endpoints for:
 * - Starting/stopping autonomy sessions
 * - Executing autonomous actions
 * - Managing approvals in supervised mode
 * - Developer mode file operations
 * - AI-assisted code improvements
 * 
 * @version 2.0.0
 * @security Role-based access (owner/admin only)
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../auth";
import { apiLimiter, autonomyLimiter, devModeLimiter } from "../middleware/rateLimiter";
import { z } from "zod";
import {
  startAutonomySession,
  endAutonomySession,
  executeAutonomousAction,
  executeGoalAutonomously,
  approvePendingAction,
  getAutonomySession,
  getUserActiveSessions,
  getSessionPendingApprovals,
  autonomySessionSchema,
} from "./autonomyEngine";
import {
  startDevModeSession,
  endDevModeSession,
  listFiles,
  readFile,
  writeFile,
  createFile,
  deleteFile,
  rollbackChange,
  getChangeHistory,
  aiImproveCode,
  applyAiImprovement,
  searchCode,
  getProjectTree,
  getDevModeSession,
  hasActiveDevModeSession,
} from "./developerMode";

const router = Router();

// ===== AUTONOMY MODE ROUTES =====

/**
 * Start an autonomy session
 */
router.post("/autonomy/start", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const config = autonomySessionSchema.parse(req.body);
    const userId = req.session.userId!;
    const orgId = req.session.orgId!;
    
    // Check user role - only owners and admins can start autonomous mode
    const user = await import("../storage").then(m => m.storage.getUser(userId));
    if (!user || !["owner", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Only owners and admins can enable autonomy mode" });
    }
    
    const session = await startAutonomySession(userId, orgId, config);
    
    res.json({
      sessionId: session.id,
      level: session.level,
      startedAt: session.startedAt,
      message: `Autonomy mode started at level: ${session.level}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start autonomy session" });
  }
});

/**
 * End an autonomy session
 */
router.post("/autonomy/stop", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    
    await endAutonomySession(sessionId, "user_request");
    
    res.json({ success: true, message: "Autonomy session ended" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to end session" });
  }
});

/**
 * Get current autonomy session status
 */
router.get("/autonomy/status", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const sessions = getUserActiveSessions(userId);
    
    res.json({
      activeSessions: sessions.map(s => ({
        id: s.id,
        level: s.level,
        startedAt: s.startedAt,
        actionsCount: s.actionsPerformed.length,
        goal: s.goal,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get autonomy status" });
  }
});

/**
 * Execute an autonomous action
 */
router.post("/autonomy/execute", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, action, description, payload } = z.object({
      sessionId: z.string(),
      action: z.string(),
      description: z.string(),
      payload: z.any(),
    }).parse(req.body);
    
    const result = await executeAutonomousAction(sessionId, action as any, description, payload);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Action execution failed" });
  }
});

/**
 * Execute a goal autonomously (AI plans and executes)
 */
router.post("/autonomy/goal", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, goal } = z.object({
      sessionId: z.string(),
      goal: z.string().min(1).max(1000),
    }).parse(req.body);
    
    const result = await executeGoalAutonomously(sessionId, goal);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Goal execution failed" });
  }
});

/**
 * Get pending approvals for supervised mode
 */
router.get("/autonomy/approvals/:sessionId", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const approvals = getSessionPendingApprovals(sessionId);
    
    res.json({ approvals });
  } catch (error) {
    res.status(500).json({ error: "Failed to get pending approvals" });
  }
});

/**
 * Approve or reject a pending action
 */
router.post("/autonomy/approve", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { approvalId, approved } = z.object({
      approvalId: z.string(),
      approved: z.boolean(),
    }).parse(req.body);
    
    const success = approvePendingAction(approvalId, approved);
    
    if (!success) {
      return res.status(404).json({ error: "Approval not found" });
    }
    
    res.json({ success: true, approved });
  } catch (error) {
    res.status(500).json({ error: "Failed to process approval" });
  }
});

/**
 * Get session action history
 */
router.get("/autonomy/history/:sessionId", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = getAutonomySession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    res.json({
      actions: session.actionsPerformed,
      totalActions: session.actionsPerformed.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get action history" });
  }
});

// ===== DEVELOPER MODE ROUTES =====

/**
 * Start developer mode session
 */
router.post("/devmode/start", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const orgId = req.session.orgId!;
    
    // Check user role - only owners and admins can use developer mode
    const user = await import("../storage").then(m => m.storage.getUser(userId));
    if (!user || !["owner", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Only owners and admins can use developer mode" });
    }
    
    // Check if already has active session
    if (hasActiveDevModeSession(userId)) {
      return res.status(400).json({ error: "You already have an active developer mode session" });
    }
    
    const session = await startDevModeSession(userId, orgId);
    
    res.json({
      sessionId: session.id,
      startedAt: session.startedAt,
      message: "Developer mode activated",
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start developer mode" });
  }
});

/**
 * End developer mode session
 */
router.post("/devmode/stop", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    
    const result = await endDevModeSession(sessionId);
    
    res.json({
      success: true,
      unsavedFiles: result.unsavedFiles,
      message: result.unsavedFiles.length > 0 
        ? `Session ended with ${result.unsavedFiles.length} unsaved files`
        : "Developer mode deactivated",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to end developer mode" });
  }
});

/**
 * List files in directory
 */
router.get("/devmode/files", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const dir = (req.query.dir as string) || "";
    const result = await listFiles(dir);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list files" });
  }
});

/**
 * Read file content
 */
router.get("/devmode/file", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }
    
    const result = await readFile(filePath);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to read file" });
  }
});

/**
 * Write file content
 */
router.post("/devmode/file", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, filePath, content, description } = z.object({
      sessionId: z.string(),
      filePath: z.string(),
      content: z.string(),
      description: z.string().optional(),
    }).parse(req.body);
    
    const result = await writeFile(sessionId, filePath, content, description);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to write file" });
  }
});

/**
 * Create new file
 */
router.post("/devmode/file/create", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, filePath, content, description } = z.object({
      sessionId: z.string(),
      filePath: z.string(),
      content: z.string().optional().default(""),
      description: z.string().optional(),
    }).parse(req.body);
    
    const result = await createFile(sessionId, filePath, content, description);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create file" });
  }
});

/**
 * Delete file
 */
router.delete("/devmode/file", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, filePath } = z.object({
      sessionId: z.string(),
      filePath: z.string(),
    }).parse(req.body);
    
    const result = await deleteFile(sessionId, filePath);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete file" });
  }
});

/**
 * Rollback a change
 */
router.post("/devmode/rollback", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, changeId } = z.object({
      sessionId: z.string(),
      changeId: z.string(),
    }).parse(req.body);
    
    const result = await rollbackChange(sessionId, changeId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to rollback" });
  }
});

/**
 * Get change history
 */
router.get("/devmode/history", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getChangeHistory(limit);
    
    res.json({ changes: history });
  } catch (error) {
    res.status(500).json({ error: "Failed to get change history" });
  }
});

/**
 * AI-assisted code improvement
 */
router.post("/devmode/ai/improve", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, filePath, instruction, provider, model } = z.object({
      sessionId: z.string(),
      filePath: z.string(),
      instruction: z.string().min(1).max(1000),
      provider: z.string().optional().default("openai"),
      model: z.string().optional().default("gpt-4o"),
    }).parse(req.body);
    
    const result = await aiImproveCode(sessionId, filePath, instruction, provider, model);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "AI improvement failed" });
  }
});

/**
 * Apply AI improvement
 */
router.post("/devmode/ai/apply", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, filePath, improvedContent, explanation } = z.object({
      sessionId: z.string(),
      filePath: z.string(),
      improvedContent: z.string(),
      explanation: z.string(),
    }).parse(req.body);
    
    const result = await applyAiImprovement(sessionId, filePath, improvedContent, explanation);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to apply improvement" });
  }
});

/**
 * Search code
 */
router.get("/devmode/search", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const pattern = req.query.pattern as string;
    const directory = (req.query.dir as string) || "";
    
    if (!pattern) {
      return res.status(400).json({ error: "Search pattern is required" });
    }
    
    const results = await searchCode(pattern, directory);
    
    res.json({ results, count: results.length });
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * Get project tree structure
 */
router.get("/devmode/tree", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const maxDepth = parseInt(req.query.depth as string) || 3;
    const tree = await getProjectTree(maxDepth);
    
    res.json({ tree });
  } catch (error) {
    res.status(500).json({ error: "Failed to get project tree" });
  }
});

export default router;
