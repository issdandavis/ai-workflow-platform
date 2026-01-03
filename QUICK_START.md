# Quick Start - Get Running in 5 Minutes
<!-- Updated: 2026-01-03 | Supabase Integration Setup -->

## Option 1: GitHub Codespaces (Easiest)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Open Codespaces**
   - Go to your GitHub repo
   - Click green "Code" button
   - Select "Codespaces" tab
   - Click "Create codespace on main"

3. **Wait for setup** (2-3 minutes)
   - Auto-installs dependencies
   - Auto-starts the server

4. **Test it**
   - Click the "Ports" tab at bottom
   - Click the globe icon next to port 5000
   - Your app opens in browser!

---

## Option 2: Local Machine

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Add your API keys to .env (optional for demo mode)
# Edit .env and add:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the server
npm run dev

# 5. Open browser to http://localhost:5000
```

---

## Option 3: Google Cloud Run

### Prerequisites
- Google Cloud account
- `gcloud` CLI installed
- Project created in GCP

### Deploy
```bash
# 1. Login to Google Cloud
gcloud auth login

# 2. Set your project
gcloud config set project YOUR_PROJECT_ID

# 3. Enable required APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# 4. Build and deploy
gcloud builds submit --config cloudbuild.yaml

# 5. Get your URL
gcloud run services describe ai-workflow-platform --region us-central1 --format 'value(status.url)'
```

---

## Your API Keys

Add these to get full functionality:

| Provider | Get Key From | Cost |
|----------|--------------|------|
| OpenAI | https://platform.openai.com/api-keys | Pay per use |
| Anthropic | https://console.anthropic.com | Pay per use |
| Google | https://aistudio.google.com/apikey | Free tier |
| Groq | https://console.groq.com | Free tier |
| Perplexity | https://www.perplexity.ai/settings/api | Pay per use |

**Tip**: Start with just Google or Groq (free) to test everything works.

---

## Test the AI Features

Once running, test with curl:

```bash
# 1. Create an account
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPassword123!"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPassword123!"}' \
  -c cookies.txt

# 3. Run AI agent (requires login cookies)
curl -X POST http://localhost:5000/api/agent/run \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"prompt":"Hello, what can you do?","provider":"openai"}'
```

---

## What Works Right Now

| Feature | Status | Notes |
|---------|--------|-------|
| User Auth | Working | Signup, login, sessions |
| API Endpoints | Working | 176+ endpoints |
| AI Chat | Working | Needs API key |
| Fleet Engine | Working | Multi-AI orchestration |
| Roundtable | Working | Multi-AI discussions |
| Demo Mode | Working | Works without API keys |
| UI | Basic | Placeholder - connect Figma |

---

## Next Steps

1. **Test locally** - `npm run dev`
2. **Push to GitHub** - Enable Codespaces
3. **Add Figma UI** - Convert designs to React
4. **Deploy to GCP** - Use provided workflow
5. **Go live!**

---

## Need Help?

- Run `npm test` to check if everything works
- Check [TESTING.md](TESTING.md) for detailed test guide
- Check [ROADMAP.md](ROADMAP.md) for full project plan
