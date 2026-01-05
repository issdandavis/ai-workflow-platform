/**
 * Queue Dashboard v1.0
 * 
 * Provides a simple UI for monitoring the AI Development Engine queue.
 * Mount at /admin/queues for real-time observability.
 * 
 * @version 1.0.0
 * @observability Real-time queue monitoring
 */

import { Router, Request, Response } from "express";
import { aiDevelopmentEngine } from "./aiDevelopmentEngine";
import { requireAuth } from "../auth";
import { storage } from "../storage";

const router = Router();

/**
 * Queue dashboard HTML page
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  // Check admin access
  const user = await storage.getUser(req.session.userId!);
  if (!user || !["owner", "admin"].includes(user.role)) {
    return res.status(403).send("Admin access required");
  }

  const status = aiDevelopmentEngine.getStatus();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Queue Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; 
      color: #e2e8f0;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      font-size: 2rem; 
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .stat-label { color: #94a3b8; font-size: 0.875rem; }
    .stat-value { font-size: 2rem; font-weight: 600; margin-top: 0.5rem; }
    .stat-value.active { color: #22c55e; }
    .stat-value.queued { color: #f59e0b; }
    .stat-value.processing { color: #3b82f6; }
    .section { margin-bottom: 2rem; }
    .section-title { 
      font-size: 1.25rem; 
      margin-bottom: 1rem;
      color: #94a3b8;
    }
    .task-list {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      overflow: hidden;
    }
    .task-item {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-item:last-child { border-bottom: none; }
    .task-id { font-family: monospace; color: #60a5fa; }
    .task-type { 
      background: #334155;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }
    .task-status {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }
    .status-queued { background: #f59e0b20; color: #f59e0b; }
    .status-processing { background: #3b82f620; color: #3b82f6; }
    .status-completed { background: #22c55e20; color: #22c55e; }
    .status-failed { background: #ef444420; color: #ef4444; }
    .status-healing { background: #a855f720; color: #a855f7; }
    .empty-state {
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }
    .refresh-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .refresh-btn:hover { background: #2563eb; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span class="status-dot"></span>
        AI Development Queue
      </h1>
      <div class="auto-refresh">
        <input type="checkbox" id="autoRefresh" checked>
        <label for="autoRefresh">Auto-refresh (5s)</label>
        <button class="refresh-btn" onclick="location.reload()">Refresh Now</button>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Queue Length</div>
        <div class="stat-value queued" id="queueLength">${status.queueLength}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Tasks</div>
        <div class="stat-value processing" id="activeCount">${status.activeCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Processing</div>
        <div class="stat-value active" id="processing">${status.processing ? "Yes" : "No"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Engine Status</div>
        <div class="stat-value active">Online</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Recent Tasks</div>
      <div class="task-list" id="taskList">
        <div class="empty-state">
          No tasks in queue. Tasks will appear here when queued.
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Event Log</div>
      <div class="task-list" id="eventLog">
        <div class="empty-state">
          Waiting for events...
        </div>
      </div>
    </div>
  </div>

  <script>
    // Auto-refresh
    const autoRefreshCheckbox = document.getElementById('autoRefresh');
    let refreshInterval;

    function startAutoRefresh() {
      refreshInterval = setInterval(() => {
        if (autoRefreshCheckbox.checked) {
          fetch('/admin/queues/api/status')
            .then(r => r.json())
            .then(data => {
              document.getElementById('queueLength').textContent = data.queueLength;
              document.getElementById('activeCount').textContent = data.activeCount;
              document.getElementById('processing').textContent = data.processing ? 'Yes' : 'No';
            })
            .catch(console.error);
        }
      }, 5000);
    }

    autoRefreshCheckbox.addEventListener('change', () => {
      if (autoRefreshCheckbox.checked) {
        startAutoRefresh();
      } else {
        clearInterval(refreshInterval);
      }
    });

    startAutoRefresh();

    // SSE for real-time events
    const eventSource = new EventSource('/admin/queues/api/events');
    const eventLog = document.getElementById('eventLog');
    let eventCount = 0;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      eventCount++;
      
      if (eventCount === 1) {
        eventLog.innerHTML = '';
      }

      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = \`
        <span class="task-id">\${data.type}</span>
        <span>\${data.message || JSON.stringify(data.data)}</span>
        <span class="task-status status-\${data.status || 'processing'}">\${new Date().toLocaleTimeString()}</span>
      \`;
      eventLog.insertBefore(item, eventLog.firstChild);

      // Keep only last 20 events
      while (eventLog.children.length > 20) {
        eventLog.removeChild(eventLog.lastChild);
      }
    };
  </script>
</body>
</html>
  `;

  res.send(html);
});

/**
 * API endpoint for queue status
 */
router.get("/api/status", requireAuth, (req: Request, res: Response) => {
  const status = aiDevelopmentEngine.getStatus();
  res.json(status);
});

/**
 * SSE endpoint for real-time events
 */
router.get("/api/events", requireAuth, (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", message: "Connected to event stream" })}\n\n`);

  // Listen to engine events
  const onTaskQueued = (task: any) => {
    res.write(`data: ${JSON.stringify({ type: "task_queued", data: task, status: "queued" })}\n\n`);
  };

  const onTaskStarted = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: "task_started", data, status: "processing" })}\n\n`);
  };

  const onTaskCompleted = (result: any) => {
    res.write(`data: ${JSON.stringify({ type: "task_completed", data: result, status: "completed" })}\n\n`);
  };

  const onTaskHealing = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: "task_healing", data, status: "healing" })}\n\n`);
  };

  const onTaskError = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: "task_error", data, status: "failed" })}\n\n`);
  };

  aiDevelopmentEngine.on("task_queued", onTaskQueued);
  aiDevelopmentEngine.on("task_started", onTaskStarted);
  aiDevelopmentEngine.on("task_completed", onTaskCompleted);
  aiDevelopmentEngine.on("task_healing", onTaskHealing);
  aiDevelopmentEngine.on("task_error", onTaskError);

  // Cleanup on disconnect
  req.on("close", () => {
    aiDevelopmentEngine.off("task_queued", onTaskQueued);
    aiDevelopmentEngine.off("task_started", onTaskStarted);
    aiDevelopmentEngine.off("task_completed", onTaskCompleted);
    aiDevelopmentEngine.off("task_healing", onTaskHealing);
    aiDevelopmentEngine.off("task_error", onTaskError);
  });
});

/**
 * API endpoint to manually enqueue a task
 */
router.post("/api/enqueue", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !["owner", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { type, description, priority } = req.body;

    aiDevelopmentEngine.enqueue({
      taskId: `manual-${Date.now()}`,
      type: type || "code_generation",
      priority: priority || 0,
      payload: {
        description: description || "Manual test task",
      },
    });

    res.json({ success: true, message: "Task enqueued" });
  } catch (error) {
    res.status(500).json({ error: "Failed to enqueue task" });
  }
});

export default router;
