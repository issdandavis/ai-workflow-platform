# Middleware Directory - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

Express middleware for cross-cutting concerns like rate limiting, cost governance, and request validation.

## 🗂️ Files

### rateLimiter.ts
Rate limiting middleware using `express-rate-limit`.

**Limiters Available:**
- `authLimiter` - Login/signup (strict: 5 req/15min)
- `apiLimiter` - General API (moderate: 100 req/min)
- `agentLimiter` - AI operations (careful: 20 req/min)

**Usage:**
```typescript
app.post('/api/auth/login', authLimiter, handler);
app.get('/api/data', apiLimiter, handler);
app.post('/api/agents/run', agentLimiter, handler);
```

### costGovernor.ts
Budget enforcement middleware.

**Features:**
- Checks org budget before AI operations
- Blocks requests if budget exceeded
- Tracks spending per operation

**Usage:**
```typescript
app.post('/api/agents/run', requireAuth, checkBudget, handler);
```

## 🔧 Adding New Middleware

```typescript
// middleware/newMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export function newMiddleware(req: Request, res: Response, next: NextFunction) {
  // Your logic here
  
  // Continue to next middleware
  next();
  
  // Or reject request
  // return res.status(400).json({ error: 'Bad request' });
}
```

## 🌍 Environment Handling

Middleware should be environment-aware:
```typescript
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: { error: 'Too many requests' }
});
```

## ⚠️ Important Notes

- Middleware order matters in Express
- Always call `next()` or send response
- Handle errors gracefully
- Log suspicious activity

---
*Last updated: v2.0.0 - January 2026*
