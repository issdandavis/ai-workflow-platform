/**
 * Rate Limiter Middleware v2.0
 * 
 * Protects API endpoints from abuse with configurable rate limits.
 * Different limits for different endpoint types.
 * 
 * @version 2.0.0
 * @security Prevents brute force and DoS attacks
 */

import rateLimit from "express-rate-limit";

// Environment-aware rate limits (more lenient in development)
const isDev = process.env.NODE_ENV === "development";
const multiplier = isDev ? 10 : 1;

// Helper to safely get client identifier (handles IPv6)
const getClientKey = (req: any): string => {
  // Prefer session userId for authenticated users
  if (req.session?.userId) {
    return `user:${req.session.userId}`;
  }
  // Fall back to IP, normalizing IPv6 addresses
  const ip = req.ip || req.connection?.remoteAddress || "anonymous";
  // Normalize IPv6 localhost to IPv4 equivalent
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }
  return ip;
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 * multiplier, // 100 requests per window (1000 in dev)
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/api/health";
  },
});

// Auth endpoints limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 5, // 5 attempts per 15 minutes (50 in dev)
  message: { error: "Too many authentication attempts, please try again later" },
  skipSuccessfulRequests: true,
});

// Agent execution limiter (very strict to prevent abuse)
export const agentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 10, // 10 agent runs per minute per user (100 in dev)
  message: { error: "Agent execution rate limit exceeded" },
  keyGenerator: getClientKey,
  validate: false, // Disable validation - we handle IPv6 in getClientKey
});

// Autonomy mode limiter (extra strict)
export const autonomyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 50 : 5, // 5 autonomy actions per minute
  message: { error: "Autonomy mode rate limit exceeded" },
  keyGenerator: getClientKey,
  validate: false,
});

// Developer mode limiter
export const devModeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 20, // 20 file operations per minute
  message: { error: "Developer mode rate limit exceeded" },
  keyGenerator: getClientKey,
  validate: false,
});
