/**
 * Authentication Module v2.0
 * 
 * Universal authentication with support for:
 * - Password-based auth with bcrypt
 * - Session management
 * - Role-based access control (RBAC)
 * - API key validation
 * - Guest access
 * 
 * @version 2.0.0
 * @security bcrypt with configurable salt rounds
 */

import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { type User, type UserRole } from "@shared/schema";

// Configurable salt rounds (higher = more secure but slower)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session type extension for TypeScript
declare module "express-session" {
  interface SessionData {
    userId: string;
    orgId?: string;
    isGuest?: boolean;
    autonomyLevel?: "off" | "supervised" | "autonomous";
    developerModeActive?: boolean;
  }
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware to check role
export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

// Attach user to request
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}

// Middleware to validate API key
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "API key required. Use x-api-key header." });
  }

  const keyRecord = await storage.getApiKeyByKey(apiKey);
  if (!keyRecord) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  (req as any).orgId = keyRecord.orgId;
  next();
}
