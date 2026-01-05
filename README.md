# ✨ AI Workflow Platform

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-gold)
![License](https://img.shields.io/badge/license-Proprietary-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Node](https://img.shields.io/badge/Node-20+-green)

**The Enterprise AI Orchestration Platform**

*Harness the power of multiple AI providers with intelligent routing, automated workflows, and seamless integrations.*

[Demo](https://ai-workflow-platform.replit.app) · [Documentation](./docs) · [Get Started](#quick-start)

</div>

---

## 🌟 Overview

AI Workflow Platform is a comprehensive solution for businesses looking to leverage AI at scale. Built with a distinctive mystical aesthetic and enterprise-grade architecture, it provides:

- **Multi-AI Orchestration** - Route requests across OpenAI, Anthropic, Google, Groq, Perplexity, and xAI with automatic failover
- **Autonomous AI Development Engine** - Self-healing task queue with multi-AI roundtable consensus and sandboxed code execution
- **Fleet Engine** - Coordinate multiple AI agents working in parallel on complex tasks
- **Roundtable Discussions** - Watch AI models debate and collaborate on problems
- **Zapier Integration Hub** - Pre-built workflow templates for lead generation, content creation, and automation
- **Data Provider Ecosystem** - Connect Notion, Google Drive, Dropbox, and Supabase

## ✨ Key Features

### 🤖 Multi-Provider AI Orchestration
- **6 AI Providers**: OpenAI, Anthropic, Google, Groq, Perplexity, xAI
- **Intelligent Routing**: Automatic provider selection based on capabilities, cost, and health
- **Automatic Failover**: Seamless fallback when providers fail
- **Cost Controls**: Budget limits with 80% threshold alerts
- **AES-256-GCM Encryption**: Enterprise-grade API key security

### 🧠 Autonomous AI Development Engine
- **Self-Healing Task Queue**: Automatic retry with error context injection
- **Multi-AI Roundtable Consensus**: GPT-4, Claude, and Gemini collaborate on solutions
- **Sandboxed Execution**: E2B/Piston API for isolated code verification
- **Vector Memory**: Embedding-based architectural consistency across tasks
- **Real-time Dashboard**: Bull Board-style UI at `/admin/queues`
- **GitHub Integration**: Webhook-triggered PR reviews and code generation

### 🚀 Fleet Engine
- Launch coordinated AI missions with multiple agents
- Real-time progress tracking and result synthesis
- Pause, resume, and cancel missions on demand
- Agent specialization for different task types

### 💬 Roundtable Discussions
- Multi-AI debates on complex topics
- Distinct AI personalities with unique perspectives
- Human participation in AI discussions
- Automatic summarization and insights

### 🔗 Integration Hub
- **8 Pre-built Workflow Templates**:
  - Lead Capture to CRM
  - AI Content Pipeline
  - Customer Feedback Loop
  - Invoice Automation
  - Meeting Notes Sync
  - Social Media Amplifier
  - Support Ticket Triage
  - Weekly Digest Generator
- HMAC-SHA256 signed webhooks
- Exponential backoff retry logic
- Real-time delivery analytics

### 📊 Data Providers
- **Notion**: Pages, databases, bidirectional sync
- **Google Drive**: Files, folders, quota management
- **Dropbox**: Files with real-time webhooks
- **Supabase**: Database queries, real-time subscriptions

## 🎨 Visual Identity

The platform features a distinctive **mystical/arcane theme**:
- Deep purple and cosmic blue color palette
- Golden triskelion logo with animated loading states
- Ornate borders and subtle nebula backgrounds
- WCAG 2.1 AA compliant in both light and dark modes

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
│  Dashboard │ Projects │ Chat │ Fleet │ Roundtable │ Settings│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Server                        │
│  Auth │ AI Orchestrator │ Webhooks │ Data Providers │ Fleet │
│              AI Development Engine │ Queue Dashboard         │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌───────────────────────────┐  ┌───────────────────────────────┐
│      Data Layer           │  │     Sandbox Execution         │
│  PostgreSQL │ Supabase    │  │  E2B │ Piston │ Vector Memory │
│  Notion │ Google │ Dropbox│  └───────────────────────────────┘
└───────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (optional, uses in-memory storage for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/issdandavis/ai-workflow-platform.git
cd ai-workflow-platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

```env
# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/aiworkflow

# AI Providers (add your keys)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_KEY=...

# Session
SESSION_SECRET=your-secret-key

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# AI Development Engine (optional)
E2B_API_KEY=your-e2b-key          # For sandboxed code execution
PISTON_API_URL=https://emkc.org/api/v2/piston  # Alternative sandbox
GITHUB_WEBHOOK_SECRET=your-webhook-secret      # For PR review triggers
```

## 📦 Deployment

### Docker

```bash
docker build -t ai-workflow-platform .
docker run -p 5000:5000 ai-workflow-platform
```

### Replit
Click the "Run on Replit" button or import from GitHub.

### Railway / Render
Configuration files included for one-click deployment.

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (requires Playwright)
npm run test:e2e

# Property-based tests
npm run test:properties
```

## 📈 Enterprise Features

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| AI Providers | 2 | 4 | 6 |
| Fleet Missions | 10/mo | 100/mo | Unlimited |
| Roundtable Sessions | 5/mo | 50/mo | Unlimited |
| Workflow Templates | 3 | 8 | Custom |
| Data Providers | 1 | 3 | All |
| SSO/SAML | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| SLA | ❌ | 99.5% | 99.9% |

## 🔒 Security

- **Encryption**: AES-256-GCM for API keys at rest
- **Transport**: TLS 1.3 for all connections
- **Authentication**: Session-based with CSRF protection
- **Rate Limiting**: Progressive delays on auth endpoints
- **Audit Logging**: All credential operations logged

## 📄 License

Proprietary - All Rights Reserved

---

<div align="center">

**Built with ❤️ for the AI-powered future**

[Website](https://ai-workflow-platform.com) · [Twitter](https://twitter.com/aiworkflow) · [Contact](mailto:sales@ai-workflow-platform.com)

</div>
