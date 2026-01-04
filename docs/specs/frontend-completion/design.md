# Frontend Completion - Technical Design

## Architecture Overview

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base components (Button, Input, Modal)
│   │   ├── layout/          # Layout components (Sidebar, Header)
│   │   └── features/        # Feature-specific components
│   ├── contexts/            # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and API client
│   ├── pages/               # Page components
│   ├── styles/              # Global styles and themes
│   └── types/               # TypeScript interfaces
```

## Component Design

### 1. Reusable UI Components

Create a `components/ui/` folder with base components:

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// components/ui/Modal.tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// components/ui/Toast.tsx
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
```

### 2. Navigation Enhancement

Update App.tsx to support programmatic navigation:

```typescript
// Add navigation callback to pages
interface PageProps {
  onNavigate: (page: Page, options?: { openModal?: string }) => void;
}

// Dashboard quick actions use this
<button onClick={() => onNavigate('chat')}>Start AI Chat</button>
<button onClick={() => onNavigate('fleet', { openModal: 'create' })}>Launch Mission</button>
```

### 3. Detail Views

#### Project Detail Component
```typescript
// components/features/ProjectDetail.tsx
interface ProjectDetailProps {
  projectId: string;
  onClose: () => void;
  onEdit: () => void;
}

// Features:
// - Fetch project with agent runs
// - Edit mode toggle
// - Run history list
// - Start new run button
```

#### Mission Detail Component
```typescript
// components/features/MissionDetail.tsx
interface MissionDetailProps {
  missionId: string;
  onClose: () => void;
}

// Features:
// - Real-time progress via polling/SSE
// - Agent output cards
// - Control buttons (pause/resume/cancel)
// - Final result display
```

#### Roundtable Session Component
```typescript
// components/features/RoundtableSession.tsx
interface RoundtableSessionProps {
  sessionId: string;
  onClose: () => void;
}

// Features:
// - Message list with AI avatars
// - User input form
// - Typing indicator
// - Control buttons
```

## State Management

### Toast Context
```typescript
// contexts/ToastContext.tsx
interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
  hideToast: (id: string) => void;
}

// Usage:
const { showToast } = useToast();
showToast('success', 'Project created!');
```

### Theme Context
```typescript
// contexts/ThemeContext.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}
```

## API Enhancements

### Error Handling Wrapper
```typescript
// lib/api.ts - Enhanced request function
async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  try {
    // ... existing code
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError('Network error. Please check your connection.', 0);
    }
    throw error;
  }
}

// Add retry logic
async function requestWithRetry<T>(
  endpoint: string, 
  options: ApiOptions = {},
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await request<T>(endpoint, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Responsive Design

### Breakpoints
```css
/* styles/breakpoints.css */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

### Mobile Sidebar
```typescript
// components/layout/MobileSidebar.tsx
// - Hamburger menu trigger
// - Slide-out drawer
// - Backdrop overlay
// - Close on navigation
```

## Accessibility

### Focus Management
```typescript
// hooks/useFocusTrap.ts
function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  // Trap focus within modal
  // Return focus on close
}

// hooks/useAriaAnnounce.ts
function useAriaAnnounce() {
  // Announce dynamic content changes
  return { announce: (message: string) => void };
}
```

### Skip Link
```typescript
// components/layout/SkipLink.tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

## Theme System

### CSS Variables
```css
/* styles/themes.css */
:root {
  /* Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
}
```

## Implementation Tasks

### Phase 1: Core Functionality (US-1, US-2, US-6)
1. Add navigation props to App.tsx
2. Update Dashboard quick actions
3. Create ProjectDetail component
4. Add Toast system
5. Implement error boundaries

### Phase 2: Feature Views (US-3, US-4)
1. Create MissionDetail component
2. Create RoundtableSession component
3. Add real-time updates (polling)
4. Implement control actions

### Phase 3: Mobile & Polish (US-5, US-7, US-8)
1. Create MobileSidebar component
2. Add responsive styles
3. Implement focus management
4. Add theme toggle
5. ARIA labels audit

### Phase 4: Auth & Admin (US-9, US-10)
1. Create ForgotPassword page
2. Create ResetPassword page
3. Create AdminPanel page
4. Add role-based navigation

---

*Design Version: 1.0*
*Last Updated: 2026-01-03*
