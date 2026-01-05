/**
 * Endpoint Coverage Tracker
 * 
 * Tracks which API endpoints have been tested during E2E runs.
 * Generates coverage reports comparing tested vs total endpoints.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Endpoint {
  method: string;
  path: string;
  category: string;
  tested: boolean;
}

interface CoverageHit {
  method: string;
  path: string;
  testId: string;
  timestamp: string;
}

interface CoverageReport {
  totalEndpoints: number;
  testedEndpoints: number;
  coveragePercent: number;
  byCategory: Record<string, { tested: number; total: number; percent: number }>;
  untestedEndpoints: Endpoint[];
  hits: CoverageHit[];
}

const ENDPOINTS_PATH = path.join(process.cwd(), 'generated/endpoints.json');
const COVERAGE_PATH = path.join(process.cwd(), 'test-results/coverage.json');

let coverageHits: CoverageHit[] = [];

export function markEndpointHit(method: string, pathPattern: string, testId: string): void {
  coverageHits.push({
    method: method.toUpperCase(),
    path: pathPattern,
    testId,
    timestamp: new Date().toISOString(),
  });
}

export function resetCoverage(): void {
  coverageHits = [];
}

export function generateCoverageReport(): CoverageReport {
  // Load endpoints
  let endpoints: Endpoint[] = [];
  try {
    const content = fs.readFileSync(ENDPOINTS_PATH, 'utf-8');
    endpoints = JSON.parse(content);
  } catch (e) {
    console.warn('Could not load endpoints.json, run generate-endpoints.ts first');
    return {
      totalEndpoints: 0,
      testedEndpoints: 0,
      coveragePercent: 0,
      byCategory: {},
      untestedEndpoints: [],
      hits: coverageHits,
    };
  }

  // Mark tested endpoints
  const testedPaths = new Set(coverageHits.map(h => `${h.method}:${h.path}`));
  
  for (const endpoint of endpoints) {
    // Check exact match or pattern match
    const key = `${endpoint.method}:${endpoint.path}`;
    if (testedPaths.has(key)) {
      endpoint.tested = true;
    } else {
      // Check if any hit matches this endpoint pattern (for parameterized routes)
      for (const hit of coverageHits) {
        if (hit.method === endpoint.method && matchesPattern(hit.path, endpoint.path)) {
          endpoint.tested = true;
          break;
        }
      }
    }
  }

  // Calculate stats
  const testedCount = endpoints.filter(e => e.tested).length;
  const totalCount = endpoints.length;

  // By category
  const byCategory: Record<string, { tested: number; total: number; percent: number }> = {};
  for (const endpoint of endpoints) {
    if (!byCategory[endpoint.category]) {
      byCategory[endpoint.category] = { tested: 0, total: 0, percent: 0 };
    }
    byCategory[endpoint.category].total++;
    if (endpoint.tested) {
      byCategory[endpoint.category].tested++;
    }
  }
  
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].percent = Math.round((byCategory[cat].tested / byCategory[cat].total) * 100);
  }

  const report: CoverageReport = {
    totalEndpoints: totalCount,
    testedEndpoints: testedCount,
    coveragePercent: totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0,
    byCategory,
    untestedEndpoints: endpoints.filter(e => !e.tested),
    hits: coverageHits,
  };

  // Save report
  const outputDir = path.dirname(COVERAGE_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(COVERAGE_PATH, JSON.stringify(report, null, 2));

  return report;
}

function matchesPattern(actualPath: string, pattern: string): boolean {
  // Convert Express route pattern to regex
  // e.g., /api/projects/:id -> /api/projects/[^/]+
  const regexPattern = pattern
    .replace(/:[^/]+/g, '[^/]+')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(actualPath);
}

export function printCoverageReport(report: CoverageReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENDPOINT COVERAGE REPORT');
  console.log('='.repeat(60));
  console.log(`Total Endpoints:  ${report.totalEndpoints}`);
  console.log(`Tested:           ${report.testedEndpoints}`);
  console.log(`Coverage:         ${report.coveragePercent}%`);
  console.log('');
  console.log('By Category:');
  
  Object.entries(report.byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, stats]) => {
      const bar = '█'.repeat(Math.floor(stats.percent / 5)) + '░'.repeat(20 - Math.floor(stats.percent / 5));
      console.log(`  ${cat.padEnd(15)} ${bar} ${stats.tested}/${stats.total} (${stats.percent}%)`);
    });

  if (report.untestedEndpoints.length > 0 && report.untestedEndpoints.length <= 20) {
    console.log('\nUntested Endpoints:');
    report.untestedEndpoints.forEach(ep => {
      console.log(`  ${ep.method.padEnd(7)} ${ep.path}`);
    });
  } else if (report.untestedEndpoints.length > 20) {
    console.log(`\n${report.untestedEndpoints.length} untested endpoints (see coverage.json for full list)`);
  }

  console.log('='.repeat(60));
}
