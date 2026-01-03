# Shared Directory - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

Code shared between client and server. Contains:
- Database schema definitions
- Application configuration
- Shared TypeScript types

## 🗂️ Files

### schema.ts
Drizzle ORM database schema definitions.

**Tables Defined:**
- `users` - User accounts with RBAC
- `orgs` - Organizations/tenants
- `projects` - User projects
- `integrations` - Connected services
- `agentRuns` - AI task executions
- `messages` - Chat messages
- `memoryItems` - AI memory/context
- `auditLog` - Security audit trail
- `budgets` - Spending limits
- `userCredentials` - Encrypted API keys
- `usageRecords` - Token usage tracking
- `decisionTraces` - AI decision logging
- `roundtableSessions` - Multi-AI sessions
- `roundtableMessages` - AI conversation logs
- `workflows` - Automation workflows
- `workflowRuns` - Workflow executions
- `subscriptions` - Stripe subscriptions
- `promoCodes` - Discount codes
- `zapierWebhooks` - Zapier integrations
- And more...

**Usage:**
```typescript
import { users, type User, type InsertUser } from "@shared/schema";
```

### config.ts
Application configuration with environment overrides.

**Sections:**
- Branding (name, description, tagline)
- Company info
- Feature flags
- Pricing plans
- API limits
- AI providers list
- Integrations list
- Deployment modes

**Usage:**
```typescript
import { APP_CONFIG, FEATURES, AI_PROVIDERS } from "@shared/config";

if (FEATURES.enableAutonomyMode) {
  // Show autonomy features
}
```

## 🔧 Modifying Schema

### Adding a New Table
```typescript
// In schema.ts
export const newTable = pgTable("new_table", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewTableSchema = createInsertSchema(newTable).omit({
  id: true,
  createdAt: true,
});

export type InsertNewTable = z.infer<typeof insertNewTableSchema>;
export type NewTable = typeof newTable.$inferSelect;
```

### After Schema Changes
```bash
# Generate migration
npm run db:generate

# Push to database
npm run db:push
```

## 🌍 Environment Handling

Config supports environment variable overrides:
```typescript
const getEnvOrDefault = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

name: getEnvOrDefault("APP_NAME", "AI Workflow Platform"),
```

## ⚠️ Important Notes

- Schema changes require database migration
- Config is loaded at startup (restart required for changes)
- Types are shared - changes affect both client and server
- Keep schema.ts organized by feature area

---
*Last updated: v2.0.0 - January 2026*
