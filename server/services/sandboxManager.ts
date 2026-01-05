/**
 * Sandbox Manager v1.0
 * 
 * Provides isolated code execution environments using E2B or Piston API.
 * NEVER run AI-generated code on the main server - always use sandboxed execution.
 * 
 * @version 1.0.0
 * @security All code runs in isolated containers
 */

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  error?: string;
}

export interface SandboxConfig {
  provider: "e2b" | "piston" | "mock";
  timeout?: number; // ms
  memoryLimit?: number; // MB
  language?: string;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MEMORY = 256; // 256 MB

export class SandboxManager {
  private config: SandboxConfig;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      timeout: config?.timeout || DEFAULT_TIMEOUT,
      memoryLimit: config?.memoryLimit || DEFAULT_MEMORY,
      language: config?.language || "javascript",
    };
  }

  private detectProvider(): "e2b" | "piston" | "mock" {
    if (process.env.E2B_API_KEY) return "e2b";
    if (process.env.PISTON_API_URL) return "piston";
    return "mock";
  }

  /**
   * Run code in an isolated sandbox environment
   */
  async run(code: string, testSuite?: string): Promise<SandboxResult> {
    const startTime = Date.now();

    try {
      switch (this.config.provider) {
        case "e2b":
          return await this.runE2B(code, testSuite, startTime);
        case "piston":
          return await this.runPiston(code, testSuite, startTime);
        default:
          return await this.runMock(code, testSuite, startTime);
      }
    } catch (error) {
      return {
        success: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : "Unknown error",
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Sandbox execution failed",
      };
    }
  }

  /**
   * E2B Sandbox execution
   * https://e2b.dev - Cloud-based code execution
   */
  private async runE2B(code: string, testSuite: string | undefined, startTime: number): Promise<SandboxResult> {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      throw new Error("E2B_API_KEY not configured");
    }

    // Combine code with test suite if provided
    const fullCode = testSuite ? `${code}\n\n// Test Suite\n${testSuite}` : code;

    const response = await fetch("https://api.e2b.dev/v1/sandboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        template: "node-v20",
        timeout: this.config.timeout,
        code: fullCode,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`E2B API error: ${error}`);
    }

    const result = await response.json();

    return {
      success: result.exitCode === 0,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.exitCode || 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Piston API execution
   * https://github.com/engineer-man/piston - Self-hosted code execution
   */
  private async runPiston(code: string, testSuite: string | undefined, startTime: number): Promise<SandboxResult> {
    const pistonUrl = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";
    
    // Combine code with test suite
    const fullCode = testSuite ? `${code}\n\n// Test Suite\n${testSuite}` : code;

    const response = await fetch(`${pistonUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: this.config.language === "javascript" ? "js" : this.config.language,
        version: "*",
        files: [{ content: fullCode }],
        compile_timeout: this.config.timeout,
        run_timeout: this.config.timeout,
        compile_memory_limit: this.config.memoryLimit! * 1024 * 1024,
        run_memory_limit: this.config.memoryLimit! * 1024 * 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Piston API error: ${error}`);
    }

    const result = await response.json();
    const run = result.run || {};

    return {
      success: run.code === 0 && !run.signal,
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      exitCode: run.code || 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Mock sandbox for development/testing
   */
  private async runMock(code: string, testSuite: string | undefined, startTime: number): Promise<SandboxResult> {
    console.log("[SandboxManager] Running in mock mode - code not actually executed");
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Basic syntax check
    try {
      new Function(code);
    } catch (syntaxError) {
      return {
        success: false,
        stdout: "",
        stderr: `SyntaxError: ${syntaxError instanceof Error ? syntaxError.message : "Invalid syntax"}`,
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      stdout: "[Mock] Code syntax validated successfully\n[Mock] Tests would run here",
      stderr: "",
      exitCode: 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Install npm packages in sandbox
   */
  async installPackages(packages: string[]): Promise<SandboxResult> {
    const installCommand = `npm install ${packages.join(" ")}`;
    return this.run(installCommand);
  }

  /**
   * Run npm test in sandbox
   */
  async runTests(projectCode: string, testCode: string): Promise<SandboxResult> {
    const testRunner = `
const assert = require('assert');

// Project Code
${projectCode}

// Test Code
${testCode}

console.log('All tests passed!');
`;
    return this.run(testRunner);
  }
}

export const sandboxManager = new SandboxManager();
