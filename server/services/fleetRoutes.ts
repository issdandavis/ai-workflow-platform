/**
 * Fleet Engine API Routes v1.0
 * 
 * REST API for the AI Fleet system - multi-AI parallel code collaboration.
 * 
 * @version 1.0.0
 * @api /api/fleet/*
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { 
  fleetEngine, 
  type FleetMission, 
  type CrewRole 
} from "./fleetEngine";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const launchMissionSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200),
  goal: z.string().min(10).max(5000),
  captainProvider: z.string().optional(),
  captainModel: z.string().optional(),
  crewConfig: z.array(z.object({
    role: z.enum([
      "architect", "frontend", "backend", "devops", "security",
      "testing", "documentation", "optimizer", "reviewer", "translator"
    ]),
    provider: z.string(),
    model: z.string(),
  })).optional(),
});

const createConlangSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500),
});

const addPatternSchema = z.object({
  patternName: z.string().min(1).max(50),
  template: z.string().min(1).max(10000),
});

// ═══════════════════════════════════════════════════════════════════════════════
// MISSION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Launch a new fleet mission
 * POST /api/fleet/missions
 */
router.post("/missions", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.userId || !session?.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const parsed = launchMissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const mission = await fleetEngine.launchMission(
      session.orgId,
      parsed.data.projectId,
      session.userId,
      {
        title: parsed.data.title,
        goal: parsed.data.goal,
        captainProvider: parsed.data.captainProvider,
        captainModel: parsed.data.captainModel,
        crewConfig: parsed.data.crewConfig as Array<{ role: CrewRole; provider: string; model: string }>,
      }
    );

    res.status(201).json({
      success: true,
      mission: {
        id: mission.id,
        title: mission.title,
        status: mission.status,
        crewSize: mission.crew.length + 1,
        tasksCount: mission.tasks.length,
      },
    });
  } catch (error) {
    console.error("[Fleet] Launch mission error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to launch mission" });
  }
});

/**
 * Get all active missions for the org
 * GET /api/fleet/missions
 */
router.get("/missions", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const missions = fleetEngine.getActiveMissions(session.orgId);
    
    res.json({
      missions: missions.map(m => ({
        id: m.id,
        title: m.title,
        goal: m.goal,
        status: m.status,
        crewSize: m.crew.length + 1,
        tasksTotal: m.tasks.length,
        tasksCompleted: m.tasks.filter(t => t.status === "completed").length,
        totalCost: m.totalCost,
        totalTokens: m.totalTokens,
        startedAt: m.startedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get missions" });
  }
});

/**
 * Get a specific mission with full details
 * GET /api/fleet/missions/:missionId
 */
router.get("/missions/:missionId", async (req: Request, res: Response) => {
  try {
    const mission = fleetEngine.getMission(req.params.missionId);
    if (!mission) {
      return res.status(404).json({ error: "Mission not found" });
    }

    const session = req.session as any;
    if (mission.orgId !== session?.orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      mission: {
        id: mission.id,
        title: mission.title,
        goal: mission.goal,
        status: mission.status,
        captain: {
          role: mission.captain.role,
          provider: mission.captain.provider,
          model: mission.captain.model,
          status: mission.captain.status,
          tokensUsed: mission.captain.tokensUsed,
          costAccumulated: mission.captain.costAccumulated,
        },
        crew: mission.crew.map(c => ({
          id: c.id,
          role: c.role,
          provider: c.provider,
          model: c.model,
          status: c.status,
          currentTask: c.currentTask?.description,
          completedTasks: c.completedTasks.length,
          tokensUsed: c.tokensUsed,
          costAccumulated: c.costAccumulated,
        })),
        tasks: mission.tasks.map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedTo: t.assignedTo,
          filePath: t.filePath,
          startedAt: t.startedAt,
          completedAt: t.completedAt,
        })),
        totalCost: mission.totalCost,
        totalTokens: mission.totalTokens,
        startedAt: mission.startedAt,
        completedAt: mission.completedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get mission" });
  }
});

/**
 * Pause a mission
 * POST /api/fleet/missions/:missionId/pause
 */
router.post("/missions/:missionId/pause", async (req: Request, res: Response) => {
  try {
    await fleetEngine.pauseMission(req.params.missionId);
    res.json({ success: true, status: "paused" });
  } catch (error) {
    res.status(500).json({ error: "Failed to pause mission" });
  }
});

/**
 * Resume a paused mission
 * POST /api/fleet/missions/:missionId/resume
 */
router.post("/missions/:missionId/resume", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    await fleetEngine.resumeMission(req.params.missionId, session?.userId);
    res.json({ success: true, status: "active" });
  } catch (error) {
    res.status(500).json({ error: "Failed to resume mission" });
  }
});

/**
 * Abort a mission
 * POST /api/fleet/missions/:missionId/abort
 */
router.post("/missions/:missionId/abort", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    await fleetEngine.abortMission(req.params.missionId, session?.userId);
    res.json({ success: true, status: "aborted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to abort mission" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CODESPACE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all files in a mission's codespace
 * GET /api/fleet/missions/:missionId/codespace
 */
router.get("/missions/:missionId/codespace", async (req: Request, res: Response) => {
  try {
    const files = fleetEngine.getCodespaceFiles(req.params.missionId);
    
    res.json({
      files: files.map(f => ({
        path: f.path,
        language: f.language,
        version: f.version,
        lastModifiedBy: f.lastModifiedBy,
        lastModifiedAt: f.lastModifiedAt,
        size: f.content.length,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get codespace" });
  }
});

/**
 * Get a specific file from the codespace
 * GET /api/fleet/missions/:missionId/codespace/:filePath
 */
router.get("/missions/:missionId/codespace/*", async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0]; // Everything after /codespace/
    const codespace = fleetEngine.getMissionCodespace(req.params.missionId);
    
    if (!codespace) {
      return res.status(404).json({ error: "Codespace not found" });
    }
    
    const file = codespace.files.get(filePath);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: "Failed to get file" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONLANG ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new conlang for a mission
 * POST /api/fleet/missions/:missionId/conlangs
 */
router.post("/missions/:missionId/conlangs", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    const parsed = createConlangSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }
    
    const conlang = await fleetEngine.createConlang(
      req.params.missionId,
      parsed.data.name,
      parsed.data.description,
      session?.userId || "system"
    );
    
    res.status(201).json({ conlang });
  } catch (error) {
    res.status(500).json({ error: "Failed to create conlang" });
  }
});

/**
 * Add a pattern to a conlang
 * POST /api/fleet/missions/:missionId/conlangs/:conlangId/patterns
 */
router.post("/missions/:missionId/conlangs/:conlangId/patterns", async (req: Request, res: Response) => {
  try {
    const parsed = addPatternSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }
    
    fleetEngine.addConlangPattern(
      req.params.missionId,
      req.params.conlangId,
      parsed.data.patternName,
      parsed.data.template
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add pattern" });
  }
});

/**
 * Get all conlangs for a mission
 * GET /api/fleet/missions/:missionId/conlangs
 */
router.get("/missions/:missionId/conlangs", async (req: Request, res: Response) => {
  try {
    const codespace = fleetEngine.getMissionCodespace(req.params.missionId);
    
    if (!codespace) {
      return res.status(404).json({ error: "Mission not found" });
    }
    
    const conlangs = Array.from(codespace.conlangs.values());
    res.json({ conlangs });
  } catch (error) {
    res.status(500).json({ error: "Failed to get conlangs" });
  }
});

export default router;
