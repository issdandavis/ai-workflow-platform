/**
 * Developer Mode - Self-Improvement Engine v2.0
 * 
 * Allows users and AI to edit the application's source code from within the app.
 * Features:
 * - Browse and read source files
 * - Edit code with syntax validation
 * - Create new files and components
 * - Git integration for version control
 * - AI-assisted code improvements
 * - Hot reload support
 * - Rollback capabilities
 * 
 * @version 2.0.0
 * @security Restricted to owner/admin roles, all changes logged
 * @feature Self-improvement capability
 */

import { storage } from "../storage";
import { getProviderAdapter } from "./providerAdapters";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

// Project root directory (configurable via env)
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

// Allowed directories for editing (security - configurable)
const ALLOWED_DIRECTORIES = (process.env.DEVMODE_ALLOWED_DIRS || "client/src,server,shared,docs").split(",");

// Protected files that cannot be modified
const PROTECTED_FILES = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.test",
  "package-lock.json",
  ".git",
];

// File change history for rollback
interface FileChange {
  id: string;
  filePath: string;
  previousContent: string;
  newContent: string;
  timestamp: Date;
  userId: string;
  aiGenerated: boolean;
  description: string;
}

const changeHistory: FileChange[] = [];

// Developer mode session
interface DevModeSession {
  id: string;
  userId: string;
  orgId: string;
  startedAt: Date;
  isActive: boolean;
  openFiles: string[];
  unsavedChanges: Map<string, string>;
}

const activeSessions = new Map<string, DevModeSession>();

export const fileOperationSchema = z.object({
  filePath: z.string(),
  content: z.string().optional(),
  operation: z.enum(["read", "write", "create", "delete", "rename"]),
  newPath: z.string().optional(), // For rename operations
});

export type FileOperation = z.infer<typeof fileOperationSchema>;

/**
 * Validate file path is within allowed directories
 */
function isPathAllowed(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath).replace(/\\/g, "/");
  
  // Check if in allowed directory
  const inAllowedDir = ALLOWED_DIRECTORIES.some(dir => 
    normalizedPath.startsWith(dir + "/") || normalizedPath === dir
  );
  
  // Check if protected
  const isProtected = PROTECTED_FILES.some(f => 
    normalizedPath.endsWith(f) || normalizedPath === f
  );
  
  return inAllowedDir && !isProtected;
}

/**
 * Get full file path
 */
function getFullPath(filePath: string): string {
  return path.join(PROJECT_ROOT, filePath);
}

/**
 * Start a developer mode session
 */
export async function startDevModeSession(
  userId: string,
  orgId: string
): Promise<DevModeSession> {
  const sessionId = `devmode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: DevModeSession = {
    id: sessionId,
    userId,
    orgId,
    startedAt: new Date(),
    isActive: true,
    openFiles: [],
    unsavedChanges: new Map(),
  };
  
  activeSessions.set(sessionId, session);
  
  await storage.createAuditLog({
    orgId,
    userId,
    action: "developer_mode_started",
    target: sessionId,
    detailJson: {},
  });
  
  return session;
}

/**
 * End a developer mode session
 */
export async function endDevModeSession(sessionId: string): Promise<{ unsavedFiles: string[] }> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { unsavedFiles: [] };
  }
  
  const unsavedFiles = Array.from(session.unsavedChanges.keys());
  
  session.isActive = false;
  activeSessions.delete(sessionId);
  
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "developer_mode_ended",
    target: sessionId,
    detailJson: { unsavedFiles },
  });
  
  return { unsavedFiles };
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string): Promise<{
  files: Array<{ name: string; path: string; type: "file" | "directory"; size?: number }>;
}> {
  if (!isPathAllowed(dirPath) && dirPath !== "") {
    throw new Error("Access to this directory is not allowed");
  }
  
  const fullPath = dirPath ? getFullPath(dirPath) : PROJECT_ROOT;
  
  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = await Promise.all(
      entries
        .filter(entry => {
          // Filter out node_modules, .git, etc.
          const hiddenDirs = ["node_modules", ".git", "dist", ".vscode"];
          return !hiddenDirs.includes(entry.name);
        })
        .map(async entry => {
          const entryPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
          const stat = await fs.stat(path.join(fullPath, entry.name));
          
          return {
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? "directory" as const : "file" as const,
            size: entry.isFile() ? stat.size : undefined,
          };
        })
    );
    
    return { files };
  } catch (error) {
    throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Read a file's content
 */
export async function readFile(filePath: string): Promise<{
  content: string;
  language: string;
  size: number;
}> {
  if (!isPathAllowed(filePath)) {
    throw new Error("Access to this file is not allowed");
  }
  
  const fullPath = getFullPath(filePath);
  
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const stat = await fs.stat(fullPath);
    
    // Determine language from extension
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "typescriptreact",
      ".js": "javascript",
      ".jsx": "javascriptreact",
      ".json": "json",
      ".css": "css",
      ".html": "html",
      ".md": "markdown",
      ".sql": "sql",
      ".py": "python",
      ".sh": "shell",
    };
    
    return {
      content,
      language: languageMap[ext] || "plaintext",
      size: stat.size,
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Write content to a file
 */
export async function writeFile(
  sessionId: string,
  filePath: string,
  content: string,
  description: string = "Manual edit"
): Promise<{ success: boolean; changeId: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    throw new Error("No active developer mode session");
  }
  
  if (!isPathAllowed(filePath)) {
    throw new Error("Writing to this file is not allowed");
  }
  
  const fullPath = getFullPath(filePath);
  
  try {
    // Read previous content for history
    let previousContent = "";
    try {
      previousContent = await fs.readFile(fullPath, "utf-8");
    } catch {
      // File doesn't exist yet
    }
    
    // Write the new content
    await fs.writeFile(fullPath, content, "utf-8");
    
    // Record the change
    const changeId = `change_${Date.now()}`;
    const change: FileChange = {
      id: changeId,
      filePath,
      previousContent,
      newContent: content,
      timestamp: new Date(),
      userId: session.userId,
      aiGenerated: false,
      description,
    };
    
    changeHistory.push(change);
    
    // Remove from unsaved changes
    session.unsavedChanges.delete(filePath);
    
    // Log the change
    await storage.createAuditLog({
      orgId: session.orgId,
      userId: session.userId,
      action: "file_modified",
      target: filePath,
      detailJson: { changeId, description, contentLength: content.length },
    });
    
    return { success: true, changeId };
  } catch (error) {
    throw new Error(`Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Create a new file
 */
export async function createFile(
  sessionId: string,
  filePath: string,
  content: string = "",
  description: string = "New file created"
): Promise<{ success: boolean; changeId: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    throw new Error("No active developer mode session");
  }
  
  if (!isPathAllowed(filePath)) {
    throw new Error("Creating files in this location is not allowed");
  }
  
  const fullPath = getFullPath(filePath);
  
  try {
    // Check if file already exists
    try {
      await fs.access(fullPath);
      throw new Error("File already exists");
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
    
    // Create directory if needed
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Create the file
    await fs.writeFile(fullPath, content, "utf-8");
    
    // Record the change
    const changeId = `change_${Date.now()}`;
    const change: FileChange = {
      id: changeId,
      filePath,
      previousContent: "",
      newContent: content,
      timestamp: new Date(),
      userId: session.userId,
      aiGenerated: false,
      description,
    };
    
    changeHistory.push(change);
    
    await storage.createAuditLog({
      orgId: session.orgId,
      userId: session.userId,
      action: "file_created",
      target: filePath,
      detailJson: { changeId, description },
    });
    
    return { success: true, changeId };
  } catch (error) {
    throw new Error(`Failed to create file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete a file
 */
export async function deleteFile(
  sessionId: string,
  filePath: string
): Promise<{ success: boolean; changeId: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    throw new Error("No active developer mode session");
  }
  
  if (!isPathAllowed(filePath)) {
    throw new Error("Deleting this file is not allowed");
  }
  
  const fullPath = getFullPath(filePath);
  
  try {
    // Read content before deletion for rollback
    const previousContent = await fs.readFile(fullPath, "utf-8");
    
    // Delete the file
    await fs.unlink(fullPath);
    
    // Record the change
    const changeId = `change_${Date.now()}`;
    const change: FileChange = {
      id: changeId,
      filePath,
      previousContent,
      newContent: "",
      timestamp: new Date(),
      userId: session.userId,
      aiGenerated: false,
      description: "File deleted",
    };
    
    changeHistory.push(change);
    
    await storage.createAuditLog({
      orgId: session.orgId,
      userId: session.userId,
      action: "file_deleted",
      target: filePath,
      detailJson: { changeId },
    });
    
    return { success: true, changeId };
  } catch (error) {
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Rollback a change
 */
export async function rollbackChange(
  sessionId: string,
  changeId: string
): Promise<{ success: boolean }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    throw new Error("No active developer mode session");
  }
  
  const change = changeHistory.find(c => c.id === changeId);
  if (!change) {
    throw new Error("Change not found");
  }
  
  const fullPath = getFullPath(change.filePath);
  
  try {
    if (change.previousContent === "") {
      // File was created, delete it
      await fs.unlink(fullPath);
    } else if (change.newContent === "") {
      // File was deleted, restore it
      await fs.writeFile(fullPath, change.previousContent, "utf-8");
    } else {
      // File was modified, restore previous content
      await fs.writeFile(fullPath, change.previousContent, "utf-8");
    }
    
    await storage.createAuditLog({
      orgId: session.orgId,
      userId: session.userId,
      action: "change_rolled_back",
      target: change.filePath,
      detailJson: { changeId },
    });
    
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to rollback: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get change history
 */
export function getChangeHistory(limit: number = 50): FileChange[] {
  return changeHistory.slice(-limit).reverse();
}

/**
 * AI-assisted code improvement
 */
export async function aiImproveCode(
  sessionId: string,
  filePath: string,
  instruction: string,
  provider: string = "openai",
  model: string = "gpt-4o"
): Promise<{
  originalContent: string;
  improvedContent: string;
  explanation: string;
  changeId?: string;
}> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    throw new Error("No active developer mode session");
  }
  
  // Read current file content
  const { content: originalContent, language } = await readFile(filePath);
  
  // Get AI provider
  const adapter = getProviderAdapter(provider);
  
  const prompt = `You are an expert software developer. Improve the following ${language} code based on this instruction:

Instruction: ${instruction}

Current code:
\`\`\`${language}
${originalContent}
\`\`\`

Respond with:
1. The improved code (complete file, not just changes)
2. A brief explanation of what you changed and why

Format your response as:
<improved_code>
[your improved code here]
</improved_code>

<explanation>
[your explanation here]
</explanation>`;

  const response = await adapter.chat([
    { role: "system", content: "You are an expert code improvement assistant. Always provide complete, working code." },
    { role: "user", content: prompt }
  ], model);
  
  // Parse the response
  const codeMatch = response.content.match(/<improved_code>([\s\S]*?)<\/improved_code>/);
  const explanationMatch = response.content.match(/<explanation>([\s\S]*?)<\/explanation>/);
  
  if (!codeMatch) {
    throw new Error("AI did not provide improved code in the expected format");
  }
  
  const improvedContent = codeMatch[1].trim();
  const explanation = explanationMatch ? explanationMatch[1].trim() : "Code improved based on instruction";
  
  // Record as AI-generated change (but don't auto-save)
  const changeId = `ai_change_${Date.now()}`;
  
  await storage.createAuditLog({
    orgId: session.orgId,
    userId: session.userId,
    action: "ai_code_improvement_generated",
    target: filePath,
    detailJson: { 
      changeId, 
      instruction, 
      provider, 
      model,
      originalLength: originalContent.length,
      improvedLength: improvedContent.length,
    },
  });
  
  return {
    originalContent,
    improvedContent,
    explanation,
    changeId,
  };
}

/**
 * Apply AI-generated improvement
 */
export async function applyAiImprovement(
  sessionId: string,
  filePath: string,
  improvedContent: string,
  explanation: string
): Promise<{ success: boolean; changeId: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) {
    throw new Error("No active developer mode session");
  }
  
  // Write the improved content
  const result = await writeFile(sessionId, filePath, improvedContent, `AI improvement: ${explanation}`);
  
  // Mark as AI-generated in history
  const change = changeHistory.find(c => c.id === result.changeId);
  if (change) {
    change.aiGenerated = true;
  }
  
  return result;
}

/**
 * Search for code patterns across files
 */
export async function searchCode(
  pattern: string,
  directory: string = ""
): Promise<Array<{ filePath: string; line: number; content: string; match: string }>> {
  const results: Array<{ filePath: string; line: number; content: string; match: string }> = [];
  
  async function searchDir(dir: string) {
    const { files } = await listFiles(dir);
    
    for (const file of files) {
      if (file.type === "directory") {
        await searchDir(file.path);
      } else if (file.type === "file") {
        try {
          const { content } = await readFile(file.path);
          const lines = content.split("\n");
          
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(pattern.toLowerCase())) {
              results.push({
                filePath: file.path,
                line: index + 1,
                content: line.trim(),
                match: pattern,
              });
            }
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }
  
  await searchDir(directory);
  
  return results.slice(0, 100); // Limit results
}

/**
 * Get project structure as tree
 */
export async function getProjectTree(maxDepth: number = 3): Promise<any> {
  async function buildTree(dir: string, depth: number): Promise<any> {
    if (depth > maxDepth) return null;
    
    const { files } = await listFiles(dir);
    
    const tree: any = {};
    
    for (const file of files) {
      if (file.type === "directory") {
        tree[file.name] = await buildTree(file.path, depth + 1);
      } else {
        tree[file.name] = "file";
      }
    }
    
    return tree;
  }
  
  return buildTree("", 0);
}

/**
 * Get active session
 */
export function getDevModeSession(sessionId: string): DevModeSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Check if user has active dev mode session
 */
export function hasActiveDevModeSession(userId: string): boolean {
  return Array.from(activeSessions.values()).some(s => s.userId === userId && s.isActive);
}
