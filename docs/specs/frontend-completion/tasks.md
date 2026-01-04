# Frontend Completion - Implementation Tasks

## Phase 1: Core Functionality

### Task 1.1: Navigation System Enhancement
- [ ] Add `onNavigate` prop to all page components
- [ ] Update App.tsx to pass navigation callback
- [ ] Add `openModal` state to handle modal triggers from navigation
- [ ] Update Dashboard quick actions to use navigation

**Files to modify:**
- `client/src/App.tsx`
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/ProjectsPage.tsx`
- `client/src/pages/FleetPage.tsx`
- `client/src/pages/RoundtablePage.tsx`

### Task 1.2: Toast Notification System
- [ ] Create ToastContext provider
- [ ] Create Toast component with animations
- [ ] Create useToast hook
- [ ] Integrate toast into App.tsx
- [ ] Add toast calls to API success/error handlers

**Files to create:**
- `client/src/contexts/ToastContext.tsx`
- `client/src/components/ui/Toast.tsx`

### Task 1.3: Project Detail View
- [ ] Create ProjectDetail component
- [ ] Add project detail API call
- [ ] Implement edit mode
- [ ] Add agent run history list
- [ ] Add "Start New Run" functionality
- [ ] Integrate into ProjectsPage

**Files to create:**
- `client/src/components/features/ProjectDetail.tsx`

**Files to modify:**
- `client/src/pages/ProjectsPage.tsx`
- `client/src/lib/api.ts` (if needed)

### Task 1.4: Error Handling Enhancement
- [ ] Create ErrorBoundary component
- [ ] Add retry logic to API client
- [ ] Create error display component
- [ ] Add offline detection
- [ ] Wrap pages in error boundaries

**Files to create:**
- `client/src/components/ErrorBoundary.tsx`
- `client/src/components/ui/ErrorDisplay.tsx`

**Files to modify:**
- `client/src/lib/api.ts`
- `client/src/App.tsx`

---

## Phase 2: Feature Detail Views

### Task 2.1: Fleet Mission Detail
- [ ] Create MissionDetail component
- [ ] Add mission detail API endpoint usage
- [ ] Implement agent progress cards
- [ ] Add polling for real-time updates
- [ ] Implement pause/resume/cancel controls
- [ ] Show final synthesized result

**Files to create:**
- `client/src/components/features/MissionDetail.tsx`

**Files to modify:**
- `client/src/pages/FleetPage.tsx`
- `client/src/lib/api.ts` (add mission control endpoints)

### Task 2.2: Roundtable Session View
- [ ] Create RoundtableSession component
- [ ] Implement message list with AI avatars
- [ ] Add distinct colors per AI
- [ ] Create user input form
- [ ] Add typing indicator
- [ ] Implement pause/resume controls
- [ ] Add polling for new messages

**Files to create:**
- `client/src/components/features/RoundtableSession.tsx`

**Files to modify:**
- `client/src/pages/RoundtablePage.tsx`
- `client/src/lib/api.ts` (add session message endpoints)

---

## Phase 3: Mobile & Accessibility

### Task 3.1: Responsive Mobile Layout
- [ ] Create MobileSidebar component (hamburger menu)
- [ ] Add responsive breakpoint styles
- [ ] Make modals full-screen on mobile
- [ ] Fix chat input position on mobile
- [ ] Ensure touch targets are 44px minimum
- [ ] Test all pages on mobile viewport

**Files to create:**
- `client/src/components/layout/MobileSidebar.tsx`

**Files to modify:**
- `client/src/App.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/index.css`
- All page components (responsive styles)

### Task 3.2: Accessibility Improvements
- [ ] Add skip-to-content link
- [ ] Implement focus trap for modals
- [ ] Add ARIA labels to all icon buttons
- [ ] Ensure logical tab order
- [ ] Add keyboard shortcuts (Escape to close modals)
- [ ] Audit color contrast

**Files to create:**
- `client/src/components/ui/SkipLink.tsx`
- `client/src/hooks/useFocusTrap.ts`

**Files to modify:**
- `client/src/App.tsx`
- All components with icon buttons

### Task 3.3: Theme System
- [ ] Create ThemeContext provider
- [ ] Define light theme CSS variables
- [ ] Define dark theme CSS variables
- [ ] Create theme toggle component
- [ ] Persist theme to localStorage
- [ ] Respect system preference

**Files to create:**
- `client/src/contexts/ThemeContext.tsx`
- `client/src/components/ui/ThemeToggle.tsx`
- `client/src/styles/themes.css`

**Files to modify:**
- `client/src/App.tsx`
- `client/src/index.css`
- `client/src/components/Header.tsx`

---

## Phase 4: Auth & Admin

### Task 4.1: Forgot Password Flow
- [ ] Add "Forgot password?" link to LoginPage
- [ ] Create ForgotPasswordPage component
- [ ] Create ResetPasswordPage component
- [ ] Add forgot password API calls
- [ ] Handle email sent confirmation
- [ ] Handle reset token validation

**Files to create:**
- `client/src/pages/ForgotPasswordPage.tsx`
- `client/src/pages/ResetPasswordPage.tsx`

**Files to modify:**
- `client/src/pages/LoginPage.tsx`
- `client/src/App.tsx` (add routes)
- `client/src/lib/api.ts` (add auth endpoints)

### Task 4.2: Admin Panel
- [ ] Create AdminPage component
- [ ] Add admin-only navigation item
- [ ] Create user list with search
- [ ] Add user enable/disable functionality
- [ ] Create organization overview
- [ ] Add audit log viewer

**Files to create:**
- `client/src/pages/AdminPage.tsx`
- `client/src/components/features/UserList.tsx`
- `client/src/components/features/AuditLogViewer.tsx`

**Files to modify:**
- `client/src/App.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/lib/api.ts` (add admin endpoints)

---

## Estimated Timeline

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1 | 1.1 - 1.4 | 12-16 hours |
| Phase 2 | 2.1 - 2.2 | 10-14 hours |
| Phase 3 | 3.1 - 3.3 | 12-16 hours |
| Phase 4 | 4.1 - 4.2 | 8-12 hours |
| **Total** | | **42-58 hours** |

---

## Definition of Done

Each task is complete when:
- [ ] Code is written and compiles without errors
- [ ] Component renders correctly
- [ ] Functionality works as specified
- [ ] Responsive on mobile
- [ ] Basic accessibility (keyboard nav, ARIA)
- [ ] No console errors

---

*Tasks Version: 1.0*
*Last Updated: 2026-01-03*
