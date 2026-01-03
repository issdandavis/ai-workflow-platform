# Services Directory - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

This directory contains all business logic, AI provider integrations, and external service clients. It's the "brain" of the platform.

## 🗂️ File Categories

### AI Provider Clients
| File | Provider | Purpose |
|------|----------|---------|
| `providerAdapters.ts` | All | Unified interface for all AI providers |
| `geminiClient.ts` | Google | Gemini Pro integration |
| `groqClient.ts` | Groq | Llama/Mixtral (FREE tier!) |
| `huggingfaceClient.ts` | HuggingFace | Open source models |
| `ollamaClient.ts` | Ollama | Local model support |

### Core Services
| File | Purpose |
|------|---------|
| `orchestrator.ts` | Agent task queue and execution |
| `aiPriorityManager.ts` | Provider selection and fallback |
| `retryService.ts` | Automatic retry with exponential backoff |
| `cost-calculator.ts` | Token counting and cost estimation |
| `vault.ts` | Encrypted credential storage |

### Special Features
| File | Purpose |
|------|---------|
| `autonomyEngine.ts` | AI autonomy mode - lets AI control the app |
| `autonomyRoutes.ts` | API routes for autonomy features |
| `developerMode.ts` | Self-improvement - edit code from within app |
| `codeImprovement.ts` | AI-powered code enhancement |
| `roundtableService.ts` | Multi-AI discussion sessions |
| `roundtableCoordinator.ts` | Orchestrates AI conversations |
| `guideAgent.ts` | In-app AI assistant |

### External Integrations
| File | Service |
|------|---------|
| `githubClient.ts` | GitHub API |
| `notionClient.ts` | Notion API |
| `googleDriveClient.ts` | Google Drive |
| `dropboxClient.ts` | Dropbox |
| `oneDriveClient.ts` | Microsoft OneDrive |
| `stripeClient.ts` | Stripe payments |
| `zapierService.ts` | Zapier webhooks |
| `figmaMcpClient.ts` | Figma MCP |
| `worldAnvilClient.ts` | World Anvil (worldbuilding) |

## 🔑 Key Patterns

### Provider Adapter Pattern
All AI providers implement a common interface:
```typescript
interface AIProvider {
  chat(messages: Message[], options?: Options): Promise<Response>;
  stream(messages: Message[], options?: Options): AsyncGenerator<Chunk>;
}
```

### Graceful Degradation
Services should work even when dependencies are missing:
```typescript
export function getClient() {
  if (!process.env.API_KEY) {
    console.warn('API_KEY not set, feature disabled');
    return null;
  }
  return new Client(process.env.API_KEY);
}
```

### Error Handling
Always wrap external calls:
```typescript
try {
  const result = await externalApi.call();
  return { success: true, data: result };
} catch (error) {
  console.error('[ServiceName] Error:', error);
  return { success: false, error: error.message };
}
```

## 🌍 Environment Handling

### Required vs Optional Keys
- **Required for feature**: Check and disable gracefully
- **Required for app**: Throw clear error message

### Free Tier Providers
These work without paid API keys:
- Groq (generous free tier)
- Ollama (local, free)
- HuggingFace (limited free)

## 🔧 Adding a New Service

1. Create `services/newServiceClient.ts`
2. Export initialization function
3. Handle missing credentials gracefully
4. Add to relevant routes in `routes.ts`
5. Document in this README

## ⚠️ Important Notes

- **API Keys**: Never log or expose API keys
- **Rate Limits**: Respect provider rate limits
- **Costs**: Track token usage for billing
- **Fallbacks**: Always have fallback behavior

## 🧪 Testing Services

```typescript
// Test pattern for services
const client = getServiceClient();
if (!client) {
  console.log('Service not configured, skipping test');
  return;
}
const result = await client.testConnection();
console.log('Connection test:', result);
```

---
*Last updated: v2.0.0 - January 2026*
