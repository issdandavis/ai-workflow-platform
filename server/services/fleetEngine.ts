/**
 * AI Fleet Engine v1.0
 * 
 * Revolutionary multi-AI collaboration system where specialized AI models
 * work in parallel on a shared codebase, orchestrated by larger models.
 * 
 * CONCEPT: "The Ship Metaphor"
 * - The Ship = This Platform
 * - The Crew = Multiple AI Models (specialists)
 * - The Captain = Orchestrator AI (large model)
 * - The Wind = User's Payment/Direction
 * - The Maps = Code Languages & Patterns (conlang system)
 * 
 * @version 1.0.0
 * @architecture Fleet-based parallel AI execution
 * @unique First platform to enable true multi-AI code collaboration
 */

import { EventEmitter } from "events";
import { storage } from "../storage";
import { getProviderAdapter } from "./providerAdapters";
import { getUserCredential } from "./vault";

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type CrewRole = 
  | "architect"      // Designs system structure, makes high-level decisions
  | "frontend"       // UI/UX specialist, React/Vue/etc
  | "backend"        // API, database, server logic
  | "devops"         // Infrastructure, deployment, CI/CD
  | "security"       // Security review, vulnerability scanning
  | "testing"        // Test writing, QA automation
  | "documentation"  // Docs, comments, README
  | "optimizer"      // Performance, refactoring
  | "reviewer"       // Code review, quality gates
  | "translator";    // Conlang system - translates between code patterns

export interface CrewMember {
  id: string;
  role: CrewRole;
  provider: string;
  model: string;
  status: "idle" | "working" | "blocked" | "completed" | "failed";
  currentTask?: FleetTask;
  completedTasks: string[];
  tokensUsed: number;
  costAccumulated: number;
}

export interface FleetTask {
  id: string;
  type: "code" | "review" | "plan" | "test" | "document" | "translate";
  description: string;
  assignedTo?: string; // CrewMember ID
  dependencies: string[]; // Task IDs that must complete first
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  priority: number; // 1-10, higher = more urgent
  filePath?: string;
  codeLanguage?: string;
  input?: any;
  output?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SharedCodespace {
  id: string;
  projectId: string;
  files: Map<string, CodeFile>;
  locks: Map<string, string>; // filePath -> crewMemberId
  history: CodeChange[];
  conlangs: Map<string, ConlangDefinition>; // Custom code patterns
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  version: number;
}

export interface CodeChange {
  id: string;
  filePath: string;
  crewMemberId: string;
  changeType: "create" | "update" | "delete" | "rename";
  diff?: string;
  timestamp: Date;
  approved: boolean;
}

export interface ConlangDefinition {
  id: string;
  name: string;
  description: string;
  patterns: Record<string, string>; // pattern name -> code template
  translations: Record<string, Record<string, string>>; // from_lang -> to_lang -> pattern
  createdBy: string; // AI that created it
  createdAt: Date;
}

export interface FleetMission {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  goal: string;
  status: "planning" | "active" | "paused" | "completed" | "failed";
  captain: CrewMember; // Orchestrator AI
  crew: CrewMember[];
  tasks: FleetTask[];
  codespace: SharedCodespace;
  startedAt: Date;
  completedAt?: Date;
  totalCost: number;
  totalTokens: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class FleetEngine extends EventEmitter {
  private activeMissions: Map<string, FleetMission> = new Map();
  private taskQueue: FleetTask[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.setMaxListeners(50);
  }


  // ═══════════════════════════════════════════════════════════════════════════════
  // MISSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Launch a new fleet mission - multiple AIs working on one project
   */
  async launchMission(
    orgId: string,
    projectId: string,
    userId: string,
    config: {
      title: string;
      goal: string;
      captainProvider?: string;
      captainModel?: string;
      crewConfig?: Array<{ role: CrewRole; provider: string; model: string }>;
    }
  ): Promise<FleetMission> {
    const missionId = `fleet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Default captain - the orchestrator (use most capable model)
    const captain: CrewMember = {
      id: `captain_${missionId}`,
      role: "architect",
      provider: config.captainProvider || "anthropic",
      model: config.captainModel || "claude-sonnet-4-20250514",
      status: "idle",
      completedTasks: [],
      tokensUsed: 0,
      costAccumulated: 0,
    };
    
    // Default crew - specialized AIs for different tasks
    const defaultCrew: Array<{ role: CrewRole; provider: string; model: string }> = [
      { role: "frontend", provider: "openai", model: "gpt-4o" },
      { role: "backend", provider: "anthropic", model: "claude-sonnet-4-20250514" },
      { role: "testing", provider: "google", model: "gemini-2.0-flash" },
      { role: "security", provider: "openai", model: "gpt-4o" },
      { role: "documentation", provider: "groq", model: "llama-3.1-70b-versatile" },
      { role: "reviewer", provider: "xai", model: "grok-2" },
    ];
    
    const crewConfig = config.crewConfig || defaultCrew;
    const crew: CrewMember[] = crewConfig.map((c, i) => ({
      id: `crew_${missionId}_${i}`,
      role: c.role,
      provider: c.provider,
      model: c.model,
      status: "idle" as const,
      completedTasks: [],
      tokensUsed: 0,
      costAccumulated: 0,
    }));
    
    // Initialize shared codespace
    const codespace: SharedCodespace = {
      id: `codespace_${missionId}`,
      projectId,
      files: new Map(),
      locks: new Map(),
      history: [],
      conlangs: new Map(),
    };
    
    const mission: FleetMission = {
      id: missionId,
      orgId,
      projectId,
      title: config.title,
      goal: config.goal,
      status: "planning",
      captain,
      crew,
      tasks: [],
      codespace,
      startedAt: new Date(),
      totalCost: 0,
      totalTokens: 0,
    };
    
    this.activeMissions.set(missionId, mission);
    
    // Log mission start
    await storage.createAuditLog({
      orgId,
      userId,
      action: "fleet_mission_launched",
      target: missionId,
      detailJson: {
        title: config.title,
        goal: config.goal,
        crewSize: crew.length + 1,
        captain: { provider: captain.provider, model: captain.model },
      },
    });
    
    this.emit("mission_launched", mission);
    
    // Start the planning phase
    await this.planMission(missionId, userId);
    
    return mission;
  }

  /**
   * Captain AI plans the mission - breaks goal into tasks
   */
  private async planMission(missionId: string, userId: string): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (!mission) throw new Error("Mission not found");
    
    this.emit("log", missionId, { type: "info", message: "Captain is planning the mission..." });
    
    const apiKey = await getUserCredential(userId, mission.captain.provider);
    const adapter = getProviderAdapter(mission.captain.provider, apiKey || undefined);
    
    const crewRoles = mission.crew.map(c => c.role).join(", ");
    
    const planningPrompt = `You are the CAPTAIN of an AI Fleet - a team of specialized AI models working together on a coding project.

PROJECT GOAL: ${mission.goal}

YOUR CREW (each is a separate AI that will work in parallel):
${mission.crew.map(c => `- ${c.role.toUpperCase()}: ${c.provider}/${c.model}`).join("\n")}

Your job is to:
1. Break down the project into specific tasks
2. Assign each task to the most appropriate crew member
3. Define dependencies (which tasks must complete before others can start)
4. Set priorities (1-10, higher = more urgent)

RESPOND WITH A JSON OBJECT:
{
  "projectStructure": {
    "directories": ["src/", "tests/", ...],
    "mainFiles": ["src/index.ts", ...]
  },
  "tasks": [
    {
      "id": "task_1",
      "type": "code|review|plan|test|document|translate",
      "description": "What needs to be done",
      "assignTo": "frontend|backend|testing|security|documentation|reviewer",
      "dependencies": [],
      "priority": 8,
      "filePath": "src/components/Button.tsx",
      "codeLanguage": "typescript"
    }
  ],
  "executionPlan": "Brief description of how the crew should work together"
}`;

    const response = await adapter.call(planningPrompt, mission.captain.model);
    
    if (!response.success) {
      mission.status = "failed";
      this.emit("mission_failed", mission, response.error);
      return;
    }
    
    // Parse captain's plan
    try {
      const planMatch = response.content.match(/\{[\s\S]*\}/);
      if (!planMatch) throw new Error("No valid JSON in response");
      
      const plan = JSON.parse(planMatch[0]);
      
      // Create tasks from plan
      for (const taskDef of plan.tasks || []) {
        const task: FleetTask = {
          id: taskDef.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: taskDef.type || "code",
          description: taskDef.description,
          dependencies: taskDef.dependencies || [],
          status: "pending",
          priority: taskDef.priority || 5,
          filePath: taskDef.filePath,
          codeLanguage: taskDef.codeLanguage,
          createdAt: new Date(),
        };
        
        // Assign to crew member by role
        const assignee = mission.crew.find(c => c.role === taskDef.assignTo);
        if (assignee) {
          task.assignedTo = assignee.id;
        }
        
        mission.tasks.push(task);
      }
      
      // Update captain's token usage
      mission.captain.tokensUsed += (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);
      mission.captain.costAccumulated += parseFloat(response.usage?.costEstimate || "0");
      mission.totalTokens += mission.captain.tokensUsed;
      mission.totalCost += mission.captain.costAccumulated;
      
      mission.status = "active";
      this.emit("mission_planned", mission, plan);
      this.emit("log", missionId, { 
        type: "success", 
        message: `Mission planned: ${mission.tasks.length} tasks created`,
        data: plan.executionPlan
      });
      
      // Start executing tasks
      this.startTaskProcessing(missionId, userId);
      
    } catch (error) {
      mission.status = "failed";
      this.emit("mission_failed", mission, `Failed to parse plan: ${error}`);
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════════
  // PARALLEL TASK EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Start processing tasks in parallel
   */
  private async startTaskProcessing(missionId: string, userId: string): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (!mission || mission.status !== "active") return;
    
    // Process tasks every 500ms
    const processLoop = async () => {
      if (!this.activeMissions.has(missionId)) return;
      
      const currentMission = this.activeMissions.get(missionId)!;
      if (currentMission.status !== "active") return;
      
      // Find tasks that can be executed (dependencies met, not started)
      const executableTasks = currentMission.tasks.filter(task => {
        if (task.status !== "pending") return false;
        
        // Check if all dependencies are completed
        const depsCompleted = task.dependencies.every(depId => {
          const depTask = currentMission.tasks.find(t => t.id === depId);
          return depTask?.status === "completed";
        });
        
        return depsCompleted;
      });
      
      // Sort by priority (highest first)
      executableTasks.sort((a, b) => b.priority - a.priority);
      
      // Execute tasks in parallel (up to crew size)
      const idleCrew = currentMission.crew.filter(c => c.status === "idle");
      const tasksToExecute = executableTasks.slice(0, idleCrew.length);
      
      const executions = tasksToExecute.map(async (task, i) => {
        const crewMember = task.assignedTo 
          ? currentMission.crew.find(c => c.id === task.assignedTo)
          : idleCrew[i];
        
        if (crewMember) {
          await this.executeTask(missionId, task, crewMember, userId);
        }
      });
      
      await Promise.all(executions);
      
      // Check if mission is complete
      const allCompleted = currentMission.tasks.every(t => 
        t.status === "completed" || t.status === "failed"
      );
      
      if (allCompleted) {
        await this.completeMission(missionId, userId);
      } else {
        // Continue processing
        setTimeout(processLoop, 500);
      }
    };
    
    processLoop();
  }

  /**
   * Execute a single task with a crew member
   */
  private async executeTask(
    missionId: string,
    task: FleetTask,
    crewMember: CrewMember,
    userId: string
  ): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    task.status = "in_progress";
    task.startedAt = new Date();
    crewMember.status = "working";
    crewMember.currentTask = task;
    
    this.emit("task_started", mission, task, crewMember);
    this.emit("log", missionId, {
      type: "info",
      message: `${crewMember.role.toUpperCase()} starting: ${task.description}`,
    });
    
    try {
      const apiKey = await getUserCredential(userId, crewMember.provider);
      const adapter = getProviderAdapter(crewMember.provider, apiKey || undefined);
      
      // Build context from completed tasks and codespace
      const context = this.buildTaskContext(mission, task);
      
      const prompt = this.buildTaskPrompt(task, crewMember, context);
      const response = await adapter.call(prompt, crewMember.model);
      
      if (!response.success) {
        throw new Error(response.error || "Provider call failed");
      }
      
      // Process the response based on task type
      const result = await this.processTaskResult(mission, task, crewMember, response.content);
      
      task.output = result;
      task.status = "completed";
      task.completedAt = new Date();
      crewMember.status = "idle";
      crewMember.currentTask = undefined;
      crewMember.completedTasks.push(task.id);
      
      // Update token/cost tracking
      const tokens = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);
      const cost = parseFloat(response.usage?.costEstimate || "0");
      crewMember.tokensUsed += tokens;
      crewMember.costAccumulated += cost;
      mission.totalTokens += tokens;
      mission.totalCost += cost;
      
      this.emit("task_completed", mission, task, crewMember, result);
      this.emit("log", missionId, {
        type: "success",
        message: `${crewMember.role.toUpperCase()} completed: ${task.description}`,
      });
      
    } catch (error) {
      task.status = "failed";
      task.output = { error: error instanceof Error ? error.message : "Unknown error" };
      crewMember.status = "idle";
      crewMember.currentTask = undefined;
      
      this.emit("task_failed", mission, task, crewMember, error);
      this.emit("log", missionId, {
        type: "error",
        message: `${crewMember.role.toUpperCase()} failed: ${error}`,
      });
    }
  }

  /**
   * Build context from mission state for a task
   */
  private buildTaskContext(mission: FleetMission, task: FleetTask): string {
    const completedTasks = mission.tasks
      .filter(t => t.status === "completed")
      .map(t => `- ${t.description}: ${JSON.stringify(t.output).substring(0, 200)}...`)
      .join("\n");
    
    const relevantFiles = Array.from(mission.codespace.files.entries())
      .filter(([path]) => {
        // Include files related to this task
        if (task.filePath && path.includes(task.filePath.split("/")[0])) return true;
        return false;
      })
      .map(([path, file]) => `=== ${path} ===\n${file.content}`)
      .join("\n\n");
    
    return `
COMPLETED WORK BY OTHER CREW MEMBERS:
${completedTasks || "(None yet)"}

RELEVANT FILES IN CODESPACE:
${relevantFiles || "(No files yet)"}
`;
  }

  /**
   * Build the prompt for a specific task
   */
  private buildTaskPrompt(task: FleetTask, crewMember: CrewMember, context: string): string {
    const roleInstructions: Record<CrewRole, string> = {
      architect: "Design system architecture, make high-level decisions, define interfaces",
      frontend: "Build UI components, handle user interactions, implement responsive designs",
      backend: "Create APIs, database schemas, server logic, handle data processing",
      devops: "Set up infrastructure, CI/CD pipelines, deployment configurations",
      security: "Review for vulnerabilities, implement auth, validate inputs, secure data",
      testing: "Write unit tests, integration tests, e2e tests, ensure coverage",
      documentation: "Write clear docs, code comments, README files, API documentation",
      optimizer: "Improve performance, refactor code, reduce complexity, optimize queries",
      reviewer: "Review code quality, suggest improvements, enforce standards",
      translator: "Translate code patterns between languages, create reusable templates",
    };
    
    return `You are a ${crewMember.role.toUpperCase()} AI working as part of a Fleet - a team of specialized AIs building a project together.

YOUR ROLE: ${roleInstructions[crewMember.role]}

CURRENT TASK:
Type: ${task.type}
Description: ${task.description}
${task.filePath ? `File: ${task.filePath}` : ""}
${task.codeLanguage ? `Language: ${task.codeLanguage}` : ""}

${context}

INSTRUCTIONS:
1. Focus ONLY on your assigned task
2. Your output will be used by other AIs in the fleet
3. Be precise and complete - other AIs depend on your work
4. If creating code, make it production-ready

RESPOND WITH JSON:
{
  "thinking": "Your reasoning process",
  "code": "The actual code if applicable",
  "filePath": "Where this code should go",
  "notes": "Notes for other crew members",
  "suggestedNextTasks": ["Optional suggestions for follow-up tasks"]
}`;
  }


  /**
   * Process the result of a task and update codespace
   */
  private async processTaskResult(
    mission: FleetMission,
    task: FleetTask,
    crewMember: CrewMember,
    responseContent: string
  ): Promise<any> {
    try {
      const resultMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!resultMatch) {
        return { raw: responseContent };
      }
      
      const result = JSON.parse(resultMatch[0]);
      
      // If there's code output, add it to the codespace
      if (result.code && result.filePath) {
        await this.writeToCodespace(mission, result.filePath, result.code, crewMember);
      }
      
      return result;
    } catch {
      return { raw: responseContent };
    }
  }

  /**
   * Write a file to the shared codespace
   */
  private async writeToCodespace(
    mission: FleetMission,
    filePath: string,
    content: string,
    author: CrewMember
  ): Promise<void> {
    // Check for lock
    const lockHolder = mission.codespace.locks.get(filePath);
    if (lockHolder && lockHolder !== author.id) {
      throw new Error(`File ${filePath} is locked by another crew member`);
    }
    
    const existingFile = mission.codespace.files.get(filePath);
    const changeType = existingFile ? "update" : "create";
    
    // Detect language from extension
    const ext = filePath.split(".").pop() || "";
    const languageMap: Record<string, string> = {
      ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
      py: "python", rs: "rust", go: "go", java: "java", rb: "ruby",
      css: "css", scss: "scss", html: "html", json: "json", md: "markdown",
    };
    
    const file: CodeFile = {
      path: filePath,
      content,
      language: languageMap[ext] || "text",
      lastModifiedBy: author.id,
      lastModifiedAt: new Date(),
      version: existingFile ? existingFile.version + 1 : 1,
    };
    
    mission.codespace.files.set(filePath, file);
    
    // Record the change
    const change: CodeChange = {
      id: `change_${Date.now()}`,
      filePath,
      crewMemberId: author.id,
      changeType,
      diff: existingFile ? `Updated from v${existingFile.version}` : "New file",
      timestamp: new Date(),
      approved: true, // Auto-approve for now
    };
    
    mission.codespace.history.push(change);
    
    this.emit("codespace_updated", mission, file, change);
    this.emit("log", mission.id, {
      type: "info",
      message: `${author.role} ${changeType}d: ${filePath}`,
    });
  }

  /**
   * Complete a mission
   */
  private async completeMission(missionId: string, userId: string): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    mission.status = "completed";
    mission.completedAt = new Date();
    
    // Generate final summary from captain
    const summary = await this.generateMissionSummary(mission, userId);
    
    await storage.createAuditLog({
      orgId: mission.orgId,
      userId,
      action: "fleet_mission_completed",
      target: missionId,
      detailJson: {
        title: mission.title,
        tasksCompleted: mission.tasks.filter(t => t.status === "completed").length,
        tasksFailed: mission.tasks.filter(t => t.status === "failed").length,
        totalCost: mission.totalCost,
        totalTokens: mission.totalTokens,
        filesCreated: mission.codespace.files.size,
        duration: Date.now() - mission.startedAt.getTime(),
      },
    });
    
    this.emit("mission_completed", mission, summary);
    this.emit("log", missionId, {
      type: "success",
      message: `Mission completed! ${mission.codespace.files.size} files created, $${mission.totalCost.toFixed(4)} spent`,
    });
  }

  /**
   * Generate a summary of the completed mission
   */
  private async generateMissionSummary(mission: FleetMission, userId: string): Promise<string> {
    const apiKey = await getUserCredential(userId, mission.captain.provider);
    const adapter = getProviderAdapter(mission.captain.provider, apiKey || undefined);
    
    const filesCreated = Array.from(mission.codespace.files.keys()).join(", ");
    const tasksSummary = mission.tasks
      .map(t => `- ${t.description}: ${t.status}`)
      .join("\n");
    
    const prompt = `Summarize this completed Fleet Mission:

GOAL: ${mission.goal}

TASKS COMPLETED:
${tasksSummary}

FILES CREATED:
${filesCreated}

CREW PERFORMANCE:
${mission.crew.map(c => `- ${c.role}: ${c.completedTasks.length} tasks, ${c.tokensUsed} tokens, $${c.costAccumulated.toFixed(4)}`).join("\n")}

Provide a brief executive summary (2-3 paragraphs) of what was accomplished.`;

    const response = await adapter.call(prompt, mission.captain.model);
    return response.content || "Mission completed successfully.";
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONLANG SYSTEM - AI-Created Code Languages
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new conlang (constructed language) for code patterns
   * AIs can create their own shorthand/patterns for efficient communication
   */
  async createConlang(
    missionId: string,
    name: string,
    description: string,
    creatorId: string
  ): Promise<ConlangDefinition> {
    const mission = this.activeMissions.get(missionId);
    if (!mission) throw new Error("Mission not found");
    
    const conlang: ConlangDefinition = {
      id: `conlang_${Date.now()}`,
      name,
      description,
      patterns: {},
      translations: {},
      createdBy: creatorId,
      createdAt: new Date(),
    };
    
    mission.codespace.conlangs.set(conlang.id, conlang);
    
    this.emit("conlang_created", mission, conlang);
    return conlang;
  }

  /**
   * Add a pattern to a conlang
   */
  addConlangPattern(
    missionId: string,
    conlangId: string,
    patternName: string,
    template: string
  ): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) throw new Error("Mission not found");
    
    const conlang = mission.codespace.conlangs.get(conlangId);
    if (!conlang) throw new Error("Conlang not found");
    
    conlang.patterns[patternName] = template;
    this.emit("conlang_updated", mission, conlang);
  }

  /**
   * Add a translation between languages
   */
  addConlangTranslation(
    missionId: string,
    conlangId: string,
    fromLang: string,
    toLang: string,
    pattern: string
  ): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) throw new Error("Mission not found");
    
    const conlang = mission.codespace.conlangs.get(conlangId);
    if (!conlang) throw new Error("Conlang not found");
    
    if (!conlang.translations[fromLang]) {
      conlang.translations[fromLang] = {};
    }
    conlang.translations[fromLang][toLang] = pattern;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════════

  getMission(missionId: string): FleetMission | undefined {
    return this.activeMissions.get(missionId);
  }

  getActiveMissions(orgId: string): FleetMission[] {
    return Array.from(this.activeMissions.values())
      .filter(m => m.orgId === orgId);
  }

  getMissionCodespace(missionId: string): SharedCodespace | undefined {
    return this.activeMissions.get(missionId)?.codespace;
  }

  getCodespaceFiles(missionId: string): CodeFile[] {
    const codespace = this.getMissionCodespace(missionId);
    if (!codespace) return [];
    return Array.from(codespace.files.values());
  }

  async pauseMission(missionId: string): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.status = "paused";
      this.emit("mission_paused", mission);
    }
  }

  async resumeMission(missionId: string, userId: string): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (mission && mission.status === "paused") {
      mission.status = "active";
      this.emit("mission_resumed", mission);
      this.startTaskProcessing(missionId, userId);
    }
  }

  async abortMission(missionId: string, userId: string): Promise<void> {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.status = "failed";
      
      await storage.createAuditLog({
        orgId: mission.orgId,
        userId,
        action: "fleet_mission_aborted",
        target: missionId,
        detailJson: {
          tasksCompleted: mission.tasks.filter(t => t.status === "completed").length,
          totalCost: mission.totalCost,
        },
      });
      
      this.emit("mission_aborted", mission);
      this.activeMissions.delete(missionId);
    }
  }
}

// Export singleton instance
export const fleetEngine = new FleetEngine();

// Export types for use in routes
export type { FleetMission, FleetTask, CrewMember, SharedCodespace, CodeFile, ConlangDefinition };
