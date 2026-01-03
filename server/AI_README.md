# Server Directory - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

This is the Express.js backend server for the AI Workflow Platform v2.0. It handles:
- API endpoints and routing
- Authentication and session management
- Database operations (PostgreSQL/SQLite)
- AI provider integrations
- Real-time features (SSE, WebSocket)

## 🏗️ Architecture Overview

```
server/
├── index.ts          # Entry point - Express app initialization
├── routes.ts         # Main API routes (4500+ lines)
├── auth.ts           # Password hashing, session middleware
├── sessionAuth.ts    # OAuth/social login handling
├── storage.ts        # Database abstraction layer (IStorage interface)
├── db.ts             # PostgreSQL connection (production)
├── db-sqlite.ts      # SQLite connection (development)
├── db-mock.ts        # Mock database (testing/no-db mode)
├── mcp.ts            # Model Context Protocol router
├── static.ts         # Static file serving (production)
├── vite.ts           # Vite dev server integration
├── middleware/       # Express middleware
├── services/         # Business logic and integrations
└── shopify/          # Shopify e-commerce integration
```

## 🔑 Key Files to Understand

1. **routes.ts** - The heart of the API. Contains ALL endpoints. Very large file.
2. **storage.ts** - Database interface. All DB operations go through here.
3. **services/providerAdapters.ts** - AI provider abstraction layer
4. **services/autonomyEngine.ts** - AI autonomy mode logic
5. **services/developerMode.ts** - Self-improvement/code editing

## 🌍 Environment Handling

The server supports multiple environments:

### Ideal Environment (Production)
- PostgreSQL database via `DATABASE_URL`
- All API keys configured
- `NODE_ENV=production`

### Non-Ideal Environment (Development)
- Falls back to SQLite if no `DATABASE_URL`
- Works with zero API keys (limited features)
- Mock database available for testing

### Detection Logic (in index.ts)
```typescript
const dbModule = process.env.DATABASE_URL ? "./db" : "./db-mock";
```

## 🔧 Common Modifications

### Adding a New API Endpoint
1. Add route in `routes.ts`
2. Add storage method in `storage.ts` if DB needed
3. Add schema in `shared/schema.ts` if new table

### Adding a New AI Provider
1. Create client in `services/[provider]Client.ts`
2. Register in `services/providerAdapters.ts`
3. Add to `shared/config.ts` aiProviders array

### Adding New Middleware
1. Create in `middleware/`
2. Import and use in `routes.ts` or `index.ts`

## ⚠️ Important Notes

- **Rate Limiting**: All endpoints have rate limits. Check `middleware/rateLimiter.ts`
- **Authentication**: Most routes require `requireAuth` middleware
- **Error Handling**: Always return proper HTTP status codes
- **Logging**: Use the `log()` function from index.ts

## 🧪 Testing

```bash
# Run server in development
npm run dev:server

# Test health endpoint
curl http://localhost:5000/api/health
```

## 📝 When Making Changes

1. Always handle errors gracefully
2. Add audit logging for sensitive operations
3. Validate input with Zod schemas
4. Update types in `shared/schema.ts`
5. Test in both PostgreSQL and SQLite modes

---
*Last updated: v2.0.0 - January 2026*
