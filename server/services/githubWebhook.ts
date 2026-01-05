/**
 * GitHub Webhook Handler v1.0
 * 
 * Handles GitHub webhooks to trigger AI development tasks:
 * - PR opened/synchronized → AI code review
 * - Issue created → AI task analysis
 * - Push events → AI code quality check
 * 
 * @version 1.0.0
 * @integration GitHub App / Webhooks
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { aiDevelopmentEngine } from "./aiDevelopmentEngine";
import { storage } from "../storage";

const router = Router();

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Verify GitHub webhook signature
 */
function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET || !signature) {
    console.warn("[GitHub Webhook] No secret configured or signature missing");
    return process.env.NODE_ENV === "development"; // Allow in dev
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * GitHub webhook endpoint
 */
router.post("/github", async (req: Request, res: Response) => {
  try {
    // Verify signature
    const signature = req.headers["x-hub-signature-256"] as string;
    const payload = JSON.stringify(req.body);

    if (!verifySignature(payload, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.headers["x-github-event"] as string;
    const { action, pull_request, repository, issue, commits, ref } = req.body;

    console.log(`[GitHub Webhook] Event: ${event}, Action: ${action}`);

    // Handle different event types
    switch (event) {
      case "pull_request":
        await handlePullRequest(action, pull_request, repository);
        break;

      case "issues":
        await handleIssue(action, issue, repository);
        break;

      case "push":
        await handlePush(ref, commits, repository);
        break;

      case "ping":
        console.log("[GitHub Webhook] Ping received - webhook configured correctly");
        break;

      default:
        console.log(`[GitHub Webhook] Unhandled event: ${event}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("[GitHub Webhook] Error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle Pull Request events
 */
async function handlePullRequest(
  action: string,
  pullRequest: any,
  repository: any
): Promise<void> {
  if (action !== "opened" && action !== "synchronize") {
    return;
  }

  console.log(`[GitHub] PR ${action}: ${pullRequest.title}`);

  // Queue AI code review task
  aiDevelopmentEngine.enqueue({
    taskId: `gh-pr-${pullRequest.id}`,
    type: "pr_review",
    priority: 1, // High priority for PR reviews
    payload: {
      description: `Review PR #${pullRequest.number}: ${pullRequest.title}\n\n${pullRequest.body || "No description provided."}`,
      repo: repository.full_name,
      branch: pullRequest.head.ref,
      diff: pullRequest.diff_url,
      context: {
        prNumber: pullRequest.number,
        prUrl: pullRequest.html_url,
        author: pullRequest.user.login,
        baseBranch: pullRequest.base.ref,
        headBranch: pullRequest.head.ref,
        additions: pullRequest.additions,
        deletions: pullRequest.deletions,
        changedFiles: pullRequest.changed_files,
      },
    },
  });

  // Log the event
  await storage.createAuditLog?.({
    orgId: "github",
    userId: null,
    action: "github_pr_review_queued",
    target: `${repository.full_name}#${pullRequest.number}`,
    detailJson: {
      prId: pullRequest.id,
      action,
      title: pullRequest.title,
    },
  });
}

/**
 * Handle Issue events
 */
async function handleIssue(
  action: string,
  issue: any,
  repository: any
): Promise<void> {
  if (action !== "opened") {
    return;
  }

  console.log(`[GitHub] Issue opened: ${issue.title}`);

  // Check if issue has specific labels that trigger AI
  const labels = issue.labels?.map((l: any) => l.name) || [];
  const shouldProcess = labels.some((l: string) => 
    ["ai-task", "auto-fix", "needs-analysis"].includes(l.toLowerCase())
  );

  if (!shouldProcess) {
    console.log("[GitHub] Issue doesn't have AI trigger labels, skipping");
    return;
  }

  // Queue AI task analysis
  aiDevelopmentEngine.enqueue({
    taskId: `gh-issue-${issue.id}`,
    type: "bug_fix",
    priority: 0,
    payload: {
      description: `Analyze and potentially fix issue #${issue.number}: ${issue.title}\n\n${issue.body || "No description provided."}`,
      repo: repository.full_name,
      context: {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        author: issue.user.login,
        labels,
      },
    },
  });
}

/**
 * Handle Push events
 */
async function handlePush(
  ref: string,
  commits: any[],
  repository: any
): Promise<void> {
  // Only process pushes to main/master
  if (!ref.endsWith("/main") && !ref.endsWith("/master")) {
    return;
  }

  console.log(`[GitHub] Push to ${ref}: ${commits?.length || 0} commits`);

  // Queue code quality check for significant pushes
  if (commits && commits.length > 0) {
    const commitMessages = commits.map((c: any) => c.message).join("\n");
    
    aiDevelopmentEngine.enqueue({
      taskId: `gh-push-${Date.now()}`,
      type: "code_generation",
      priority: -1, // Lower priority
      payload: {
        description: `Review recent commits to ${ref}:\n${commitMessages}`,
        repo: repository.full_name,
        branch: ref.split("/").pop(),
        context: {
          commitCount: commits.length,
          authors: [...new Set(commits.map((c: any) => c.author?.name))],
        },
      },
    });
  }
}

export default router;
