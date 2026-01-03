# Tests Directory - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

Test files for the application. Currently minimal - expansion recommended.

## 🗂️ Current Files

| File | Purpose |
|------|---------|
| `sanity.test.ts` | Basic sanity checks |
| `sum.test.ts` | Example test |
| `vite.config.test.ts` | Vite test configuration |

## 🧪 Testing Stack

- **Vitest** - Test runner (Vite-native)
- **Testing Library** - React component testing (if added)

## 🔧 Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run specific test
npm test -- sanity
```

## 📝 Writing Tests

### Basic Test
```typescript
// tests/feature.test.ts
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should do something', () => {
    const result = someFunction();
    expect(result).toBe(expected);
  });
});
```

### API Test
```typescript
import { describe, it, expect } from 'vitest';

describe('API Endpoint', () => {
  it('should return data', async () => {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });
});
```

### Component Test (if React Testing Library added)
```typescript
import { render, screen } from '@testing-library/react';
import { Component } from '@/components/Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 🎯 Test Categories to Add

1. **Unit Tests** - Individual functions
2. **Integration Tests** - API endpoints
3. **Component Tests** - React components
4. **E2E Tests** - Full user flows (Playwright recommended)

## 🌍 Environment Handling

Tests should work without external dependencies:
```typescript
describe('Feature', () => {
  beforeAll(() => {
    // Mock external services
    vi.mock('./externalService', () => ({
      callApi: vi.fn().mockResolvedValue({ data: 'mocked' }),
    }));
  });
});
```

## ⚠️ Important Notes

- Tests should be deterministic
- Mock external services
- Clean up after tests
- Use descriptive test names

---
*Last updated: v2.0.0 - January 2026*
