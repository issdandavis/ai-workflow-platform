/**
 * Endpoint Registry Generator
 * 
 * Introspects Express routes and outputs generated/endpoints.json
 * Used for E2E test coverage tracking
 */

import * as fs from 'fs';
import * as path from 'path';

interface Endpoint {
  method: string;
  path: string;
  category: string;
  tested: boolean;
}

// Parse routes from server/routes.ts
async function extractEndpoints(): Promise<Endpoint[]> {
  const routesPath = path.join(process.cwd(), 'server/routes.ts');
  const content = fs.readFileSync(routesPath, 'utf-8');
  
  const endpoints: Endpoint[] = [];
  
  // Match Express route patterns: app.get/post/put/patch/delete("/path", ...)
  const routeRegex = /app\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    
    // Determine category from path
    const category = categorizeEndpoint(routePath);
    
    endpoints.push({
      method,
      path: routePath,
      category,
      tested: false,
    });
  }
  
  // Also check for router.use patterns
  const useRegex = /app\.use\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  while ((match = useRegex.exec(content)) !== null) {
    const basePath = match[1];
    // These are mounted routers, we'll mark them as router mounts
    if (basePath.startsWith('/api')) {
      endpoints.push({
        method: 'ROUTER',
        path: basePath,
        category: 'router',
        tested: false,
      });
    }
  }
  
  return endpoints;
}

function categorizeEndpoint(path: string): string {
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/project')) return 'projects';
  if (path.includes('/agent')) return 'agents';
  if (path.includes('/roundtable')) return 'roundtable';
  if (path.includes('/integration') || path.includes('/webhook')) return 'integrations';
  if (path.includes('/vault') || path.includes('/credential')) return 'vault';
  if (path.includes('/notion')) return 'notion';
  if (path.includes('/google-drive')) return 'google-drive';
  if (path.includes('/dropbox')) return 'dropbox';
  if (path.includes('/supabase')) return 'supabase';
  if (path.includes('/shopify')) return 'shopify';
  if (path.includes('/fleet')) return 'fleet';
  if (path.includes('/autonomy')) return 'autonomy';
  if (path.includes('/health') || path.includes('/status')) return 'system';
  if (path.includes('/dashboard')) return 'dashboard';
  if (path.includes('/ai')) return 'ai';
  if (path.includes('/approval')) return 'approvals';
  if (path.includes('/audit')) return 'audit';
  if (path.includes('/assistant')) return 'assistant';
  if (path.includes('/zapier')) return 'zapier';
  if (path.includes('/figma')) return 'figma';
  if (path.includes('/mcp')) return 'mcp';
  return 'other';
}

async function main() {
  console.log('🔍 Extracting endpoints from server/routes.ts...');
  
  const endpoints = await extractEndpoints();
  
  // Create generated directory
  const outputDir = path.join(process.cwd(), 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write endpoints.json
  const outputPath = path.join(outputDir, 'endpoints.json');
  fs.writeFileSync(outputPath, JSON.stringify(endpoints, null, 2));
  
  // Generate summary
  const byCategory: Record<string, number> = {};
  for (const ep of endpoints) {
    byCategory[ep.category] = (byCategory[ep.category] || 0) + 1;
  }
  
  console.log(`\n✅ Generated ${endpoints.length} endpoints to ${outputPath}`);
  console.log('\n📊 Endpoints by category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });
}

main().catch(console.error);
