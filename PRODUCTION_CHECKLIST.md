# Production Readiness Checklist

## Current Status: ~70% Backend Complete, 0% Frontend

---

## 🔴 CRITICAL - Must Fix Before Production

### 1. TypeScript Errors (~20 errors)
| File | Issue | Fix |
|------|-------|-----|
| `server/services/autonomyEngine.ts` | Missing `getProjects()` method | Add to storage.ts |
| `server/services/autonomyEngine.ts` | Missing `deleteProject()` method | Add to storage.ts |
| `server/services/autonomyEngine.ts` | Missing `chat()` on ProviderAdapter | Add to provider interface |
| `server/services/developerMode.ts` | Missing `chat()` on ProviderAdapter | Same fix |
| `server/services/cost-calculator.ts` | Schema mismatch with budgets table | Update insert schema |
| `server/services/roundtableService.ts` | Schema mismatch with sessions/messages | Update insert schema |
| `server/routes.ts` | Optional vs required type issues | Add type assertions |
| `server/mcp.ts` | Type narrowing issue | Add type guard |

### 2. Missing Storage Methods
```typescript
// Add to server/storage.ts IStorage interface and DbStorage class:
getProjects(orgId: string): Promise<Project[]>;
deleteProject(id: string): Promise<void>;
updateProject(id: string, data: Partial<InsertProject>): Promise<Project>;
```

### 3. Missing Provider Method
```typescript
// Add to ProviderAdapter interface:
chat(messages: {role: string, content: string}[]): Promise<string>;
```

---

## 🟡 REQUIRED - For Web Application

### 4. Build React Frontend
**Estimated: 40-80 hours of development**

Required pages:
- [ ] Login / Register / Forgot Password
- [ ] Dashboard (overview, recent activity)
- [ ] Projects list and detail view
- [ ] AI Chat interface
- [ ] Fleet Engine mission control
- [ ] Roundtable (multi-AI discussion)
- [ ] Settings (profile, API keys, integrations)
- [ ] Admin panel (if multi-tenant)

Tech stack recommendation:
- React 18 + TypeScript
- TailwindCSS or Shadcn/ui
- React Query for API calls
- React Router for navigation

### 5. Environment Configuration
```bash
# Required in .env for production:
DATABASE_URL=postgresql://...      # Supabase, Neon, or self-hosted
SESSION_SECRET=random-32-chars     # For cookie signing
NODE_ENV=production

# At least ONE AI provider:
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### 6. Database Setup
- [ ] Create PostgreSQL database (Supabase/Neon recommended)
- [ ] Run `npm run db:push` to create tables
- [ ] Set up database backups

### 7. Deployment
- [ ] Dockerfile (not created yet)
- [ ] docker-compose.yml (not created yet)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] SSL certificate (handled by hosting platform)

---

## 🟡 REQUIRED - For Mobile Application

### 8. Mobile Frontend (React Native)
**Estimated: 60-100 hours of development**

- [ ] Set up React Native project
- [ ] Implement same screens as web
- [ ] Handle mobile-specific auth (biometrics, secure storage)
- [ ] Push notifications
- [ ] Offline support (optional)

### 9. API Adjustments for Mobile
- [ ] Add refresh token support
- [ ] Rate limiting per device
- [ ] Mobile-specific endpoints if needed

### 10. App Store Requirements
**PlayStore:**
- [ ] Privacy policy URL
- [ ] App icons (512x512, 192x192, etc.)
- [ ] Screenshots (phone + tablet)
- [ ] App description
- [ ] Content rating questionnaire
- [ ] $25 one-time developer fee

**Kindle/Amazon:**
- [ ] Similar to PlayStore
- [ ] Test on Fire tablets
- [ ] $0 developer fee

---

## 🟢 NICE TO HAVE - Polish

### 11. Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide
- [ ] Developer guide

### 12. Testing
- [ ] Unit tests (currently 9 basic tests)
- [ ] Integration tests
- [ ] E2E tests (Playwright/Cypress)

### 13. Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Mixpanel, PostHog)
- [ ] Uptime monitoring

### 14. Security Hardening
- [ ] Rate limiting (partially done)
- [ ] Input validation (partially done)
- [ ] CORS configuration
- [ ] Security headers (helmet - added)

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Check TypeScript errors
npm run check

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build

# Push database schema
npm run db:push
```

---

## Cost Estimates

| Task | DIY with AI | Hire Developer |
|------|-------------|----------------|
| Fix TypeScript errors | 4-8 hours | $200-400 |
| Build web frontend | 40-80 hours | $3,000-8,000 |
| Build mobile app | 60-100 hours | $5,000-15,000 |
| Docker + deployment | 4-8 hours | $200-400 |
| **Total (web only)** | 50-100 hours | $3,500-9,000 |
| **Total (web + mobile)** | 110-200 hours | $8,500-24,000 |

---

## Recommended Order of Work

1. **Fix TypeScript errors** (4-8 hours) - Makes everything else easier
2. **Set up database** (1 hour) - Supabase free tier
3. **Build minimal web frontend** (20-40 hours) - Login + Dashboard + Chat
4. **Deploy to Render** (1-2 hours) - Get it live
5. **Iterate on frontend** (20-40 hours) - Add remaining features
6. **Build mobile app** (60-100 hours) - After web is stable
7. **Submit to app stores** (2-4 hours) - PlayStore, Kindle

---

*Last updated: 2026-01-03 by Kiro*
