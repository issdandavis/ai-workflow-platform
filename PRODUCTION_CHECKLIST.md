# Production Readiness Checklist

## Current Status: ~70% Backend Complete, ~85% Frontend Complete

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
**Status: ~85% Complete** ✅

Required pages:
- [x] Login / Register (Guest login available)
- [ ] Forgot Password (not implemented)
- [x] Dashboard (overview, recent activity, quick actions)
- [x] Projects list and create
- [ ] Project detail view (not implemented)
- [x] AI Chat interface (with suggestions)
- [x] Fleet Engine mission control (create missions)
- [ ] Fleet mission detail view (not implemented)
- [x] Roundtable (multi-AI discussion, create sessions)
- [ ] Roundtable session view (not implemented)
- [x] Settings (profile, API keys, usage tabs)
- [x] Integrations page (connect services)
- [ ] Admin panel (not implemented)

Tech stack (implemented):
- React 18 + TypeScript ✅
- Custom CSS (inline styles) - consider extracting
- Fetch API with custom client ✅
- Custom routing via state (no React Router)

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
- [x] Dockerfile (created)
- [x] docker-compose.yml (created)
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

## Cost Estimates (Updated)

| Task | DIY with AI | Status |
|------|-------------|--------|
| Fix TypeScript errors | 4-8 hours | 🔴 Pending |
| Build web frontend | 40-80 hours | ✅ ~85% Done |
| Remaining frontend polish | 10-20 hours | 🟡 Pending |
| Build mobile app | 60-100 hours | ⬜ Not started |
| Docker + deployment | 4-8 hours | ✅ Done |
| **Total (web only)** | 15-30 hours remaining | |
| **Total (web + mobile)** | 75-130 hours remaining | |

---

## Recommended Order of Work (Updated)

1. **Fix TypeScript errors** (4-8 hours) - Makes everything else easier
2. **Set up database** (1 hour) - Supabase free tier
3. ~~Build minimal web frontend~~ ✅ Already done!
4. **Add detail views** (8-12 hours) - Project, Mission, Roundtable details
5. **Deploy to Render** (1-2 hours) - Get it live
6. **Polish frontend** (8-12 hours) - Mobile responsive, accessibility, themes
7. **Build mobile app** (60-100 hours) - After web is stable
8. **Submit to app stores** (2-4 hours) - PlayStore, Kindle

---

## Frontend Implementation Status

### Completed Components
| Component | File | Status |
|-----------|------|--------|
| App Shell | `client/src/App.tsx` | ✅ Complete |
| Auth Context | `client/src/contexts/AuthContext.tsx` | ✅ Complete |
| API Client | `client/src/lib/api.ts` | ✅ Complete |
| Sidebar | `client/src/components/Sidebar.tsx` | ✅ Complete |
| Header | `client/src/components/Header.tsx` | ✅ Complete |
| Login Page | `client/src/pages/LoginPage.tsx` | ✅ Complete |
| Dashboard | `client/src/pages/Dashboard.tsx` | ✅ Complete |
| Projects Page | `client/src/pages/ProjectsPage.tsx` | ✅ Complete |
| Chat Page | `client/src/pages/ChatPage.tsx` | ✅ Complete |
| Fleet Page | `client/src/pages/FleetPage.tsx` | ✅ Complete |
| Roundtable Page | `client/src/pages/RoundtablePage.tsx` | ✅ Complete |
| Settings Page | `client/src/pages/SettingsPage.tsx` | ✅ Complete |
| Integrations Page | `client/src/pages/IntegrationsPage.tsx` | ✅ Complete |

### Remaining Frontend Work
| Feature | Priority | Est. Hours |
|---------|----------|------------|
| Project detail view | High | 3-4 |
| Mission detail view | High | 3-4 |
| Roundtable session view | High | 4-6 |
| Dashboard quick action navigation | Medium | 1-2 |
| Toast notifications | Medium | 2-3 |
| Error boundaries | Medium | 1-2 |
| Mobile responsive | Medium | 4-6 |
| Dark/Light theme | Low | 2-3 |
| Forgot password | Low | 2-3 |
| Admin panel | Low | 6-8 |

See `docs/specs/frontend-completion/` for detailed spec.

---

*Last updated: 2026-01-03 by Kiro*
