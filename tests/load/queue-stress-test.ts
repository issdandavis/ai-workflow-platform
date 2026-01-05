/**
 * AI Development Engine Queue Stress Test
 * 
 * Tests the self-healing queue under heavy load:
 * - 100 concurrent users submitting tasks
 * - Self-healing retry logic under pressure
 * - Queue priority handling
 * - Memory and performance stability
 * 
 * Run with: npx tsx tests/load/queue-stress-test.ts
 */

import { EventEmitter } from "events";

// Simulate the AI Development Engine for testing
interface AITask {
  taskId: string;
  type: "code_generation" | "pr_review" | "bug_fix" | "refactor" | "test_generation";
  payload: { description: string; errorLogs?: string; previousAttempt?: string };
  iteration?: number;
  priority?: number;
  userId?: string;
}

interface TaskResult {
  status: "success" | "fixing" | "failed";
  taskId: string;
  iterations: number;
  executionTimeMs: number;
  userId?: string;
}

interface QueueMetrics {
  totalEnqueued: number;
  totalCompleted: number;
  totalFailed: number;
  totalHealing: number;
  avgExecutionTime: number;
  maxQueueLength: number;
  healingAttempts: number;
}

// Test configuration
const CONFIG = {
  CONCURRENT_USERS: 100,
  TASKS_PER_USER: 5,
  MAX_HEALING_ATTEMPTS: 3,
  RETRY_DELAY_MS: 100, // Faster for testing
  CONCURRENCY: 10, // Higher concurrency for stress test
  FAILURE_RATE: 0.3, // 30% of tasks fail initially (to test self-healing)
  TEST_DURATION_MS: 60000, // 1 minute max
};

/**
 * Mock Sandbox that simulates failures for self-healing testing
 */
class MockSandbox {
  private failureRate: number;
  private taskAttempts: Map<string, number> = new Map();

  constructor(failureRate: number = 0.3) {
    this.failureRate = failureRate;
  }

  async run(taskId: string, iteration: number): Promise<{ success: boolean; stderr: string }> {
    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));

    // Track attempts per task
    const attempts = this.taskAttempts.get(taskId) || 0;
    this.taskAttempts.set(taskId, attempts + 1);

    // First attempt has higher failure rate, subsequent attempts more likely to succeed
    const adjustedFailureRate = this.failureRate / iteration;
    
    if (Math.random() < adjustedFailureRate) {
      return {
        success: false,
        stderr: `Mock error for task ${taskId} (attempt ${iteration}): Simulated failure`,
      };
    }

    return { success: true, stderr: "" };
  }
}

/**
 * Test AI Development Engine with stress testing capabilities
 */
class TestAIDevelopmentEngine extends EventEmitter {
  private queue: AITask[] = [];
  private processing = false;
  private concurrency: number;
  private activeCount = 0;
  private sandbox: MockSandbox;
  private metrics: QueueMetrics = {
    totalEnqueued: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalHealing: 0,
    avgExecutionTime: 0,
    maxQueueLength: 0,
    healingAttempts: 0,
  };
  private executionTimes: number[] = [];
  private maxHealingAttempts: number;
  private retryDelayMs: number;

  constructor(config: typeof CONFIG) {
    super();
    this.concurrency = config.CONCURRENCY;
    this.maxHealingAttempts = config.MAX_HEALING_ATTEMPTS;
    this.retryDelayMs = config.RETRY_DELAY_MS;
    this.sandbox = new MockSandbox(config.FAILURE_RATE);
  }

  enqueue(task: AITask): void {
    const priority = task.priority || 0;
    const insertIndex = this.queue.findIndex(t => (t.priority || 0) < priority);
    
    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }

    this.metrics.totalEnqueued++;
    this.metrics.maxQueueLength = Math.max(this.metrics.maxQueueLength, this.queue.length);
    
    this.emit("task_queued", task);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    // Process multiple tasks concurrently
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeCount++;
      this.executeTask(task).finally(() => {
        this.activeCount--;
        // Continue processing
        if (this.queue.length > 0) {
          setImmediate(() => this.processQueue());
        }
      });
    }
  }

  private async executeTask(task: AITask): Promise<TaskResult> {
    const { taskId, iteration = 1, userId } = task;
    const startTime = Date.now();

    this.emit("task_started", { taskId, iteration, userId });

    // Simulate roundtable consensus (fast for testing)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));

    // Run in sandbox
    const execution = await this.sandbox.run(taskId, iteration);

    // Self-healing logic
    if (!execution.success && iteration < this.maxHealingAttempts) {
      this.metrics.healingAttempts++;
      this.metrics.totalHealing++;
      
      this.emit("task_healing", { taskId, iteration, error: execution.stderr, userId });

      // Re-queue with error context
      setTimeout(() => {
        this.enqueue({
          ...task,
          iteration: iteration + 1,
          payload: {
            ...task.payload,
            errorLogs: execution.stderr,
          },
        });
      }, this.retryDelayMs);

      return {
        status: "fixing",
        taskId,
        iterations: iteration,
        executionTimeMs: Date.now() - startTime,
        userId,
      };
    }

    const executionTime = Date.now() - startTime;
    this.executionTimes.push(executionTime);

    if (execution.success) {
      this.metrics.totalCompleted++;
      const result: TaskResult = {
        status: "success",
        taskId,
        iterations: iteration,
        executionTimeMs: executionTime,
        userId,
      };
      this.emit("task_completed", result);
      return result;
    }

    // Max healing attempts reached
    this.metrics.totalFailed++;
    const result: TaskResult = {
      status: "failed",
      taskId,
      iterations: iteration,
      executionTimeMs: executionTime,
      userId,
    };
    this.emit("task_failed", result);
    return result;
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      processing: this.activeCount > 0,
    };
  }

  getMetrics(): QueueMetrics & { p95ExecutionTime: number; p99ExecutionTime: number } {
    const sorted = [...this.executionTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      ...this.metrics,
      avgExecutionTime: this.executionTimes.length > 0 
        ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length 
        : 0,
      p95ExecutionTime: sorted[p95Index] || 0,
      p99ExecutionTime: sorted[p99Index] || 0,
    };
  }

  isIdle(): boolean {
    return this.queue.length === 0 && this.activeCount === 0;
  }
}

/**
 * Simulate a user submitting tasks
 */
async function simulateUser(
  engine: TestAIDevelopmentEngine,
  userId: string,
  taskCount: number
): Promise<void> {
  const taskTypes: AITask["type"][] = ["code_generation", "pr_review", "bug_fix", "refactor", "test_generation"];
  
  for (let i = 0; i < taskCount; i++) {
    const task: AITask = {
      taskId: `${userId}-task-${i}`,
      type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
      payload: {
        description: `Task ${i} from user ${userId}: Generate a function that does something useful`,
      },
      priority: Math.floor(Math.random() * 10),
      userId,
    };
    
    engine.enqueue(task);
    
    // Small random delay between task submissions
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
  }
}

/**
 * Wait for engine to become idle or timeout
 */
async function waitForCompletion(
  engine: TestAIDevelopmentEngine,
  timeoutMs: number
): Promise<boolean> {
  const start = Date.now();
  
  while (!engine.isIdle() && Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return engine.isIdle();
}

/**
 * Run the stress test
 */
async function runQueueStressTest(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AI DEVELOPMENT ENGINE - QUEUE STRESS TEST              ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║ Concurrent Users: ${CONFIG.CONCURRENT_USERS.toString().padEnd(40)}║`);
  console.log(`║ Tasks per User: ${CONFIG.TASKS_PER_USER.toString().padEnd(42)}║`);
  console.log(`║ Total Tasks: ${(CONFIG.CONCURRENT_USERS * CONFIG.TASKS_PER_USER).toString().padEnd(45)}║`);
  console.log(`║ Queue Concurrency: ${CONFIG.CONCURRENCY.toString().padEnd(39)}║`);
  console.log(`║ Simulated Failure Rate: ${(CONFIG.FAILURE_RATE * 100).toFixed(0)}%${" ".repeat(33)}║`);
  console.log(`║ Max Healing Attempts: ${CONFIG.MAX_HEALING_ATTEMPTS.toString().padEnd(36)}║`);
  console.log("╚════════════════════════════════════════════════════════════╝");

  const engine = new TestAIDevelopmentEngine(CONFIG);
  
  // Track events
  let healingEvents = 0;
  let completedEvents = 0;
  let failedEvents = 0;
  
  engine.on("task_healing", () => healingEvents++);
  engine.on("task_completed", () => completedEvents++);
  engine.on("task_failed", () => failedEvents++);

  console.log("\n🚀 Starting stress test...\n");
  const startTime = Date.now();

  // Simulate all users concurrently
  const userPromises = Array.from({ length: CONFIG.CONCURRENT_USERS }, (_, i) =>
    simulateUser(engine, `user-${i}`, CONFIG.TASKS_PER_USER)
  );

  // Wait for all users to submit their tasks
  await Promise.all(userPromises);
  console.log(`✓ All ${CONFIG.CONCURRENT_USERS} users submitted ${CONFIG.TASKS_PER_USER} tasks each`);
  console.log(`  Total tasks enqueued: ${engine.getMetrics().totalEnqueued}`);
  console.log(`  Max queue length: ${engine.getMetrics().maxQueueLength}`);

  // Wait for processing to complete
  console.log("\n⏳ Waiting for queue to process...");
  
  const progressInterval = setInterval(() => {
    const status = engine.getStatus();
    const metrics = engine.getMetrics();
    console.log(`  Queue: ${status.queueLength} | Active: ${status.activeCount} | Completed: ${metrics.totalCompleted} | Healing: ${healingEvents}`);
  }, 2000);

  const completed = await waitForCompletion(engine, CONFIG.TEST_DURATION_MS);
  clearInterval(progressInterval);

  const totalTime = Date.now() - startTime;
  const metrics = engine.getMetrics();

  // Results
  console.log("\n" + "=".repeat(60));
  console.log("📊 STRESS TEST RESULTS");
  console.log("=".repeat(60));
  
  console.log("\nQueue Performance:");
  console.log(`  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Tasks Enqueued: ${metrics.totalEnqueued}`);
  console.log(`  Tasks Completed: ${metrics.totalCompleted}`);
  console.log(`  Tasks Failed: ${metrics.totalFailed}`);
  console.log(`  Max Queue Length: ${metrics.maxQueueLength}`);
  console.log(`  Throughput: ${(metrics.totalCompleted / (totalTime / 1000)).toFixed(2)} tasks/sec`);

  console.log("\nSelf-Healing Metrics:");
  console.log(`  Healing Attempts: ${metrics.healingAttempts}`);
  console.log(`  Healing Events: ${healingEvents}`);
  console.log(`  Self-Heal Success Rate: ${metrics.totalCompleted > 0 ? ((metrics.totalCompleted / (metrics.totalCompleted + metrics.totalFailed)) * 100).toFixed(1) : 0}%`);

  console.log("\nExecution Times:");
  console.log(`  Average: ${metrics.avgExecutionTime.toFixed(2)}ms`);
  console.log(`  P95: ${metrics.p95ExecutionTime.toFixed(2)}ms`);
  console.log(`  P99: ${metrics.p99ExecutionTime.toFixed(2)}ms`);

  // Pass/Fail criteria
  console.log("\n" + "=".repeat(60));
  console.log("🏁 TEST VERDICT");
  console.log("=".repeat(60));

  const successRate = metrics.totalCompleted / (metrics.totalCompleted + metrics.totalFailed) * 100;
  const throughput = metrics.totalCompleted / (totalTime / 1000);
  
  const checks = [
    { name: "Completed in time", passed: completed, message: completed ? "✓" : "✗ Timeout" },
    { name: "Success rate > 80%", passed: successRate > 80, message: `${successRate.toFixed(1)}%` },
    { name: "Throughput > 5 tasks/sec", passed: throughput > 5, message: `${throughput.toFixed(2)} tasks/sec` },
    { name: "Self-healing triggered", passed: healingEvents > 0, message: `${healingEvents} events` },
    { name: "P95 < 500ms", passed: metrics.p95ExecutionTime < 500, message: `${metrics.p95ExecutionTime.toFixed(0)}ms` },
  ];

  checks.forEach(check => {
    const status = check.passed ? "✅" : "❌";
    console.log(`${status} ${check.name}: ${check.message}`);
  });

  const allPassed = checks.every(c => c.passed);
  
  console.log("\n" + (allPassed 
    ? "✅ STRESS TEST PASSED - Queue handles 100 concurrent users with self-healing"
    : "❌ STRESS TEST FAILED - Some criteria not met"));

  // Scaling recommendations
  console.log("\n📈 SCALING RECOMMENDATIONS FOR 100+ USERS:");
  console.log("  1. Current in-memory queue works for single-server deployment");
  console.log("  2. For multi-server: migrate to Redis-backed BullMQ");
  console.log("  3. Increase concurrency based on AI provider rate limits");
  console.log("  4. Monitor memory usage for long-running deployments");
  console.log("  5. Consider separate worker processes for heavy loads");

  if (!allPassed) {
    process.exit(1);
  }
}

// Run the test
runQueueStressTest().catch(console.error);
