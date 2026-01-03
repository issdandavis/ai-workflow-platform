# AI Workflow Platform - Testing Guide
<!-- Updated: 2026-01-03 | Supabase Integration Setup -->

## Quick Start Testing

### 1. Local Testing (Your Machine)
```bash
# Install dependencies
npm install

# Run the server
npm run dev

# In another terminal, run tests
npm test
```

### 2. GitHub Codespaces Testing
1. Push code to GitHub
2. Click "Code" → "Codespaces" → "Create codespace"
3. Wait for setup (auto-runs `npm install` and `npm run dev`)
4. Open the forwarded port 5000 in browser
5. Run `npm test` in terminal

---

## Test Types

### Automated Tests (AI-friendly)
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/api.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch
```

### Manual Testing Checklist

#### Authentication
- [ ] Sign up with new email
- [ ] Sign up with existing email (should fail)
- [ ] Login with correct password
- [ ] Login with wrong password (should fail)
- [ ] Logout

#### Projects
- [ ] Create new project
- [ ] List projects
- [ ] Edit project
- [ ] Delete project

#### AI Features
- [ ] Run AI agent with prompt
- [ ] Start roundtable session
- [ ] Fleet Engine mission (if configured)

#### Integrations
- [ ] Connect GitHub (if configured)
- [ ] Connect Google Drive (if configured)
- [ ] Test Zapier webhooks (if configured)

---

## AI-Assisted Testing

### Using Claude/ChatGPT to Test

Copy this prompt to have AI test your API:

```
I have an API running at http://localhost:5000. Please test these endpoints:

1. POST /api/auth/signup with {"email": "test@example.com", "password": "Test123!"}
2. POST /api/auth/login with the same credentials
3. GET /api/projects (should require auth)
4. POST /api/agent/run with {"prompt": "Hello"}

For each, tell me:
- HTTP status code
- Response body
- Whether it behaved correctly
```

### Using Grok for Testing
Grok can help generate test cases. Ask it:
```
Generate test cases for a REST API with these endpoints:
- POST /api/auth/signup (email, password)
- POST /api/auth/login (email, password)
- GET /api/projects (requires authentication)
- POST /api/agent/run (prompt, provider)

Include edge cases and security tests.
```

---

## Environment Setup for Testing

### Required API Keys for Full Testing

Add these to your `.env` file:

```env
# Required
SESSION_SECRET=your-random-secret-min-32-chars

# AI Providers (at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Optional - more providers
GROQ_API_KEY=gsk_...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=...

# Optional - integrations
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
```

### Testing Without API Keys
The platform works in "demo mode" without API keys:
- AI endpoints return mock responses
- All other features work normally
- Good for UI/UX testing

---

## Testing with Your Tools

### Zapier Integration Testing
1. Create a Zapier webhook trigger
2. Point it to: `POST /api/zapier/hooks/subscribe`
3. Send test events from your app
4. Check Zapier receives them

### Dropbox Integration Testing
1. Set `DROPBOX_ACCESS_TOKEN` in `.env`
2. Test file operations via API
3. Check files sync to Dropbox

### Canva/Figma Testing
Once UI is built from designs:
1. Compare rendered UI to Figma designs
2. Test all interactive elements
3. Verify responsive behavior

---

## Performance Testing

### Load Testing with curl
```bash
# Test 100 requests to health endpoint
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health
done | sort | uniq -c
```

### Rate Limit Testing
```bash
# Rapid requests to trigger rate limiting
for i in {1..50}; do
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' &
done
wait
```

---

## Continuous Integration

### GitHub Actions (Auto-test on Push)
The project includes CI configuration. Tests run automatically when you:
- Push to main branch
- Create a pull request

### Manual CI Trigger
```bash
# Trigger workflow manually
gh workflow run test.yml
```

---

## Troubleshooting Tests

### Common Issues

**Tests fail with "fetch is not defined"**
- Ensure Node.js 18+ is installed
- Tests use native fetch

**Connection refused errors**
- Make sure server is running: `npm run dev`
- Check port 5000 is available

**Authentication tests fail**
- Check SESSION_SECRET is set
- May need to clear test database

**AI provider tests skip**
- API keys not configured
- Check `.env` file

---

## Test Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Authentication | 80% | ~60% |
| API Endpoints | 70% | ~40% |
| AI Providers | 60% | ~30% |
| Integrations | 50% | ~20% |

Run `npm test -- --coverage` to see current coverage.

---

## Next Steps

1. Run `npm test` to see current test status
2. Fix any failing tests
3. Add your API keys for full testing
4. Deploy to Codespaces for cloud testing
5. Set up CI/CD for automated testing
