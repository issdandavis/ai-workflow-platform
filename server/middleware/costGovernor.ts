/**
 * Cost Governor Middleware v2.0
 * 
 * Enforces budget limits for AI operations.
 * Prevents runaway costs by checking budgets before execution.
 * 
 * @version 2.0.0
 * @security Prevents unexpected billing
 */

import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Warning threshold (warn when 80% of budget used)
const WARNING_THRESHOLD = 0.8;

export async function checkBudget(req: Request, res: Response, next: NextFunction) {
  const orgId = req.session.orgId;
  
  if (!orgId) {
    // Allow requests without org context in development
    if (process.env.NODE_ENV === "development") {
      console.warn("[Cost Governor] No org context, skipping budget check (dev mode)");
      return next();
    }
    return res.status(400).json({ error: "Organization not set" });
  }

  try {
    // Check daily budget
    const dailyBudget = await storage.getBudget(orgId, "daily");
    if (dailyBudget) {
      const spent = parseFloat(dailyBudget.spentUsd);
      const limit = parseFloat(dailyBudget.limitUsd);
      
      if (spent >= limit) {
        await storage.createAuditLog({
          orgId,
          userId: req.session.userId || null,
          action: "budget_exceeded",
          target: "daily_budget",
          detailJson: { spent, limit },
        });
        
        return res.status(402).json({
          error: "budget_exceeded",
          message: "Daily budget limit reached",
          spent,
          limit,
          resetTime: getNextResetTime("daily"),
        });
      }
      
      // Warn if approaching limit
      if (spent >= limit * WARNING_THRESHOLD) {
        res.setHeader("X-Budget-Warning", "approaching_daily_limit");
      }
    }

    // Check monthly budget
    const monthlyBudget = await storage.getBudget(orgId, "monthly");
    if (monthlyBudget) {
      const spent = parseFloat(monthlyBudget.spentUsd);
      const limit = parseFloat(monthlyBudget.limitUsd);
      
      if (spent >= limit) {
        await storage.createAuditLog({
          orgId,
          userId: req.session.userId || null,
          action: "budget_exceeded",
          target: "monthly_budget",
          detailJson: { spent, limit },
        });
        
        return res.status(402).json({
          error: "budget_exceeded",
          message: "Monthly budget limit reached",
          spent,
          limit,
          resetTime: getNextResetTime("monthly"),
        });
      }
      
      // Warn if approaching limit
      if (spent >= limit * WARNING_THRESHOLD) {
        res.setHeader("X-Budget-Warning", "approaching_monthly_limit");
      }
    }

    next();
  } catch (error) {
    console.error("[Cost Governor] Error checking budget:", error);
    // Allow request to proceed if budget check fails (fail open in dev)
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    return res.status(500).json({ error: "Budget check failed" });
  }
}

export async function trackCost(orgId: string, costEstimate: string) {
  try {
    const dailyBudget = await storage.getBudget(orgId, "daily");
    if (dailyBudget) {
      await storage.updateBudgetSpent(dailyBudget.id, costEstimate);
    }

    const monthlyBudget = await storage.getBudget(orgId, "monthly");
    if (monthlyBudget) {
      await storage.updateBudgetSpent(monthlyBudget.id, costEstimate);
    }
  } catch (error) {
    console.error("[Cost Governor] Error tracking cost:", error);
  }
}

function getNextResetTime(period: "daily" | "monthly"): string {
  const now = new Date();
  if (period === "daily") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }
}
