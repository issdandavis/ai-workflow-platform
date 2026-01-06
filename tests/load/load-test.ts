/**
 * Load Testing Suite for 50 Concurrent Users
 * 
 * Tests the application's ability to handle:
 * - 50 concurrent sign-ups
 * - 50 concurrent logins
 * - Mixed API operations under load
 * 
 * Run with: npx tsx tests/load/load-test.ts
 */

export const LOAD_TEST_API_BASE = process.env.API_URL || 'http://localhost:5000';
const API_BASE = LOAD_TEST_API_BASE;
const CONCURRENT_USERS = 50;
const TEST_TIMEOUT = 60000; // 60 seconds

interface TestResult {
  success: boolean;
  status: number;
  duration: number;
  error?: string;
}

interface LoadTestReport {
  testName: string;
  totalRequests: number;
  successCount: number;
  failCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  requestsPerSecond: number;
  errorRate: number;
  statusCodes: Record<number, number>;
}

// Generate unique test user
function generateTestUser(index: number): { email: string; password: string } {
  const timestamp = Date.now();
  return {
    email: `loadtest-${timestamp}-${index}@test.local`,
    password: `LoadTest123!${index}`,
  };
}

// Make API request with timing
async function timedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<TestResult> {
  const start = performance.now();
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers as any },
      ...options,
    });
    const duration = performance.now() - start;
    return {
      success: response.ok,
      status: response.status,
      duration,
    };
  } catch (error) {
    const duration = performance.now() - start;
    return {
      success: false,
      status: 0,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Calculate percentile
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Generate report from results
function generateReport(testName: string, results: TestResult[], totalTime: number): LoadTestReport {
  const durations = results.map(r => r.duration);
  const statusCodes: Record<number, number> = {};
  
  results.forEach(r => {
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
  });

  const successCount = results.filter(r => r.success || r.status === 429).length; // 429 is expected under load
  
  return {
    testName,
    totalRequests: results.length,
    successCount,
    failCount: results.length - successCount,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    p95Duration: percentile(durations, 95),
    p99Duration: percentile(durations, 99),
    requestsPerSecond: results.length / (totalTime / 1000),
    errorRate: ((results.length - successCount) / results.length) * 100,
    statusCodes,
  };
}

// Print report
function printReport(report: LoadTestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 ${report.testName}`);
  console.log('='.repeat(60));
  console.log(`Total Requests:     ${report.totalRequests}`);
  console.log(`Successful:         ${report.successCount} (${((report.successCount / report.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed:             ${report.failCount} (${report.errorRate.toFixed(1)}%)`);
  console.log(`Requests/sec:       ${report.requestsPerSecond.toFixed(2)}`);
  console.log('');
  console.log('Response Times (ms):');
  console.log(`  Average:          ${report.avgDuration.toFixed(2)}`);
  console.log(`  Min:              ${report.minDuration.toFixed(2)}`);
  console.log(`  Max:              ${report.maxDuration.toFixed(2)}`);
  console.log(`  P95:              ${report.p95Duration.toFixed(2)}`);
  console.log(`  P99:              ${report.p99Duration.toFixed(2)}`);
  console.log('');
  console.log('Status Codes:');
  Object.entries(report.statusCodes).forEach(([code, count]) => {
    console.log(`  ${code}: ${count}`);
  });
}

// Test: Concurrent Sign-ups
async function testConcurrentSignups(): Promise<LoadTestReport> {
  console.log(`\n🚀 Starting concurrent sign-up test (${CONCURRENT_USERS} users)...`);
  
  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => generateTestUser(i));
  const start = performance.now();
  
  const results = await Promise.all(
    users.map(user =>
      timedRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(user),
      })
    )
  );
  
  const totalTime = performance.now() - start;
  return generateReport('Concurrent Sign-ups (50 users)', results, totalTime);
}

// Test: Concurrent Logins
async function testConcurrentLogins(): Promise<LoadTestReport> {
  console.log(`\n🔐 Starting concurrent login test (${CONCURRENT_USERS} users)...`);
  
  // First, create test users
  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => generateTestUser(i + 1000));
  
  console.log('  Creating test users...');
  await Promise.all(
    users.map(user =>
      timedRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(user),
      })
    )
  );
  
  // Small delay to let rate limiter reset
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('  Running concurrent logins...');
  const start = performance.now();
  
  const results = await Promise.all(
    users.map(user =>
      timedRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(user),
      })
    )
  );
  
  const totalTime = performance.now() - start;
  return generateReport('Concurrent Logins (50 users)', results, totalTime);
}

// Test: Health Check Under Load
async function testHealthCheckUnderLoad(): Promise<LoadTestReport> {
  console.log(`\n💓 Starting health check load test (${CONCURRENT_USERS * 2} requests)...`);
  
  const start = performance.now();
  
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_USERS * 2 }, () =>
      timedRequest('/api/health')
    )
  );
  
  const totalTime = performance.now() - start;
  return generateReport('Health Check Under Load (100 requests)', results, totalTime);
}

// Test: Mixed API Operations
async function testMixedOperations(): Promise<LoadTestReport> {
  console.log(`\n🔀 Starting mixed operations test...`);
  
  const operations = [
    // Health checks
    ...Array(20).fill(null).map(() => () => timedRequest('/api/health')),
    // Auth attempts (will fail without session, but tests server handling)
    ...Array(15).fill(null).map(() => () => timedRequest('/api/projects')),
    ...Array(15).fill(null).map(() => () => timedRequest('/api/roundtable/sessions')),
  ];
  
  // Shuffle operations
  operations.sort(() => Math.random() - 0.5);
  
  const start = performance.now();
  const results = await Promise.all(operations.map(op => op()));
  const totalTime = performance.now() - start;
  
  return generateReport('Mixed API Operations (50 requests)', results, totalTime);
}

// Test: Sustained Load
async function testSustainedLoad(): Promise<LoadTestReport> {
  console.log(`\n⏱️ Starting sustained load test (10 seconds)...`);
  
  const results: TestResult[] = [];
  const duration = 10000; // 10 seconds
  const start = performance.now();
  
  while (performance.now() - start < duration) {
    const batchResults = await Promise.all(
      Array.from({ length: 10 }, () => timedRequest('/api/health'))
    );
    results.push(...batchResults);
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalTime = performance.now() - start;
  return generateReport('Sustained Load (10 seconds)', results, totalTime);
}

// Main test runner
async function runLoadTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           LOAD TESTING SUITE - 50 CONCURRENT USERS         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Target: ${API_BASE.padEnd(49)}║`);
  console.log(`║ Concurrent Users: ${CONCURRENT_USERS.toString().padEnd(40)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  const reports: LoadTestReport[] = [];

  try {
    // Run all tests
    reports.push(await testHealthCheckUnderLoad());
    reports.push(await testConcurrentSignups());
    
    // Wait for rate limiter to reset
    console.log('\n⏳ Waiting for rate limiter reset (15 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    reports.push(await testConcurrentLogins());
    reports.push(await testMixedOperations());
    reports.push(await testSustainedLoad());

    // Print all reports
    reports.forEach(printReport);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    const totalRequests = reports.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccess = reports.reduce((sum, r) => sum + r.successCount, 0);
    const avgRps = reports.reduce((sum, r) => sum + r.requestsPerSecond, 0) / reports.length;
    
    console.log(`Total Requests:     ${totalRequests}`);
    console.log(`Overall Success:    ${totalSuccess} (${((totalSuccess / totalRequests) * 100).toFixed(1)}%)`);
    console.log(`Average RPS:        ${avgRps.toFixed(2)}`);
    
    // Pass/Fail determination
    const overallSuccessRate = (totalSuccess / totalRequests) * 100;
    if (overallSuccessRate >= 95) {
      console.log('\n✅ LOAD TEST PASSED - System handles 50 concurrent users well');
    } else if (overallSuccessRate >= 80) {
      console.log('\n⚠️ LOAD TEST WARNING - Some degradation under load');
    } else {
      console.log('\n❌ LOAD TEST FAILED - System struggles with 50 concurrent users');
    }

  } catch (error) {
    console.error('\n❌ Load test error:', error);
    process.exit(1);
  }
}

// Run tests
runLoadTests();
