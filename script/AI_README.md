# Script Directory - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

Build scripts, utilities, and automation tools.

## 🗂️ Files

### build.ts
Production build script using esbuild.

**What it does:**
1. Builds server TypeScript to CommonJS
2. Builds client with Vite
3. Outputs to `dist/` directory

**Usage:**
```bash
npm run build
# or directly
npx tsx script/build.ts
```

### email-router.py
Python script for email routing/processing.

**Purpose:**
- Process incoming emails
- Route to appropriate handlers
- Integration with email services

### README.md
Documentation for scripts in this directory.

## 🔧 Adding New Scripts

### TypeScript Script
```typescript
// script/newScript.ts
import { execSync } from 'child_process';

async function main() {
  console.log('Running script...');
  
  // Your logic here
  
  console.log('Done!');
}

main().catch(console.error);
```

**Add to package.json:**
```json
{
  "scripts": {
    "new-script": "tsx script/newScript.ts"
  }
}
```

### Shell Script
```bash
#!/bin/bash
# script/newScript.sh

echo "Running script..."
# Your commands here
echo "Done!"
```

## 🌍 Environment Handling

Scripts should handle missing dependencies:
```typescript
try {
  execSync('some-command', { stdio: 'inherit' });
} catch (error) {
  console.error('Command failed. Is the dependency installed?');
  console.error('Run: npm install some-dependency');
  process.exit(1);
}
```

## ⚠️ Important Notes

- Scripts should be idempotent when possible
- Add error handling
- Log progress for long-running scripts
- Document required dependencies

---
*Last updated: v2.0.0 - January 2026*
