/**
 * Session-based Authentication v2.0
 * 
 * Generic authentication system that works with any deployment platform.
 * Supports local username/password auth with optional OAuth providers.
 * 
 * Features:
 * - PostgreSQL session store (production)
 * - Memory session store (development)
 * - Configurable session TTL
 * - Secure cookie settings
 * 
 * @version 2.0.0
 * @security Session-based with secure cookies
 */

import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";

// Session TTL: 7 days (configurable via env)
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_DAYS || "7", 10) * 24 * 60 * 60 * 1000;

/**
 * Get session middleware
 * Uses PostgreSQL store in production, memory store in development
 */
export function getSession() {
  let store;
  
  if (process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    // Use PostgreSQL session store in production
    console.log("[Session] Using PostgreSQL session store");
    const PgStore = connectPg(session);
    store = new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: SESSION_TTL_MS / 1000, // TTL in seconds
      tableName: "sessions",
    });
  } else {
    // Use memory store in development
    console.log("[Session] Using memory session store (development mode)");
    const MemStore = MemoryStore(session);
    store = new MemStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });
  }
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
      sameSite: "lax",
    },
  });
}

/**
 * Setup authentication routes and middleware
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Login route - redirects to dashboard if already authenticated
  app.get("/api/login", (req, res) => {
    if (req.session.userId) {
      return res.redirect("/dashboard");
    }
    res.redirect("/login");
  });
  
  // Logout route
  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.redirect("/");
    });
  });
}

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for session-based auth
  if (req.session.userId) {
    // Attach user info to request for compatibility
    (req as any).user = {
      claims: {
        sub: req.session.userId,
      },
    };
    return next();
  }
  
  // Check for development mode bypass
  if (process.env.NODE_ENV === "development" && (req as any).user) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};

// Note: Session types are defined in auth.ts to avoid duplicate declarations
