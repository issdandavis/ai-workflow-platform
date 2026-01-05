/**
 * Stress Testing Suite
 * 
 * Pushes the system beyond normal limits to find breaking points.
 * Tests gradual load increase and burst scenarios.
 * 
 * Run with: npx tsx tests/load/stress-test.ts
 */

const API_BASE = process.env.API_URL || 'http://localhost:5000';

interface StressResult {
  concurrency: number;
  successRate: number;
  avgResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: number;
}

// Make timed request
async function timedRequest(endpoint: string): Promise<{ success: boolean; duration: number; status: number }> {
  const start = performance.now();
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return {
      success: response.ok || response.status === 429,
      duration: performance.now() - start,
      status: response.status,
    };
  } catch {
    return {
      success: false,
      duration: performance.now() - start,
      status: 0,
    };
  }
}

// Run batch of concurrent requests
async function runBatch(concurrency: number, endpoint: string): Promise<StressResult> {
  const start = performance.now();
  
  const results = await Promise.all(
    Array.from({ length: concurrency }, () => timedRequest(endpoint))
  );
  
  const totalTime = performance.now() - start;
  const durations = results.map(r => r.duration);
  const successCount = results.filter(r => r.success).length;
  
  return {
    concurrency,
    successRate: (successCount / concurrency) * 100,
    avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxResponseTime: Math.max(...durations),
    requestsPerSecond: concurrency / (totalTime / 1000),
    errors: concurrency - successCount,
  };
}

// Gradual load increase test
async function gradualLoadTest(): Promise<void> {
  console.log('\n📈 GRADUAL LOAD INCREASE TEST');
  console.log('=' .repeat(70));
  console.log('Concurrency | Success Rate | Avg Time (ms) | Max Time (ms) | RPS    | Errors');
  console.log('-'.repeat(70));

  const levels = [10, 25, 50, 75, 100, 150, 200];
  const results: StressResult[] = [];

  for (const level of levels) {
    const result = await runBatch(level, '/api/health');
    results.push(result);
    
    console.log(
      `${result.concurrency.toString().padStart(11)} | ` +
      `${result.successRate.toFixed(1).padStart(11)}% | ` +
      `${result.avgResponseTime.toFixed(0).padStart(13)} | ` +
      `${result.maxResponseTime.toFixed(0).padStart(13)} | ` +
      `${result.requestsPerSecond.toFixed(1).padStart(6)} | ` +
      `${result.errors}`
    );

    // Small delay between levels
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Find breaking point
  const breakingPoint = results.find(r => r.successRate < 90);
  if (breakingPoint) {
    console.log(`\n⚠️ Performance degradation detected at ${breakingPoint.concurrency} concurrent requests`);
  } else {
    console.log('\n✅ System handled all load levels without significant degradation');
  }
}

// Burst test - sudden spike in traffic
async function burstTest(): Promise<void> {
  console.log('\n💥 BURST TEST (Sudden Traffic Spike)');
  console.log('='.repeat(50));

  // Baseline
  console.log('Establishing baseline (10 requests)...');
  const baseline = await runBatch(10, '/api/health');
  console.log(`Baseline: ${baseline.avgResponseTime.toFixed(0)}ms avg, ${baseline.successRate.toFixed(1)}% success`);

  // Wait
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Burst
  console.log('\nSending burst (100 simultaneous requests)...');
  const burst = await runBatch(100, '/api/health');
  console.log(`Burst: ${burst.avgResponseTime.toFixed(0)}ms avg, ${burst.successRate.toFixed(1)}% success`);

  // Recovery
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\nChecking recovery (10 requests)...');
  const recovery = await runBatch(10, '/api/health');
  console.log(`Recovery: ${recovery.avgResponseTime.toFixed(0)}ms avg, ${recovery.successRate.toFixed(1)}% success`);

  // Analysis
  const degradation = ((burst.avgResponseTime - baseline.avgResponseTime) / baseline.avgResponseTime) * 100;
  console.log(`\nResponse time increase during burst: ${degradation.toFixed(0)}%`);
  
  if (recovery.avgResponseTime <= baseline.avgResponseTime * 1.5) {
    console.log('✅ System recovered quickly after burst');
  } else {
    console.log('⚠️ System slow to recover after burst');
  }
}

// Sustained high load test
async function sustainedHighLoadTest(): Promise<void> {
  console.log('\n⏱️ SUSTAINED HIGH LOAD TEST (30 seconds at 50 concurrent)');
  console.log('='.repeat(50));

  const duration = 30000; // 30 seconds
  const concurrency = 50;
  const interval = 500; // New batch every 500ms
  
  const allResults: StressResult[] = [];
  const start = performance.now();
  let iteration = 0;

  while (performance.now() - start < duration) {
    const result = await runBatch(concurrency, '/api/health');
    allResults.push(result);
    iteration++;
    
    if (iteration % 10 === 0) {
      const elapsed = ((performance.now() - start) / 1000).toFixed(0);
      console.log(`  ${elapsed}s: ${result.successRate.toFixed(0)}% success, ${result.avgResponseTime.toFixed(0)}ms avg`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  // Summary
  const avgSuccess = allResults.reduce((sum, r) => sum + r.successRate, 0) / allResults.length;
  const avgTime = allResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / allResults.length;
  const totalRequests = allResults.length * concurrency;

  console.log('\nSustained Load Summary:');
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(`  Avg Success Rate: ${avgSuccess.toFixed(1)}%`);
  console.log(`  Avg Response Time: ${avgTime.toFixed(0)}ms`);

  // Check for degradation over time
  const firstHalf = allResults.slice(0, Math.floor(allResults.length / 2));
  const secondHalf = allResults.slice(Math.floor(allResults.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.avgResponseTime, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.avgResponseTime, 0) / secondHalf.length;
  
  if (secondHalfAvg > firstHalfAvg * 1.5) {
    console.log('⚠️ Performance degraded over time (possible memory leak or resource exhaustion)');
  } else {
    console.log('✅ Performance remained stable over time');
  }
}

// Main runner
async function runStressTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    STRESS TESTING SUITE                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Target: ${API_BASE.padEnd(49)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await gradualLoadTest();
    await burstTest();
    await sustainedHighLoadTest();

    console.log('\n' + '='.repeat(60));
    console.log('🏁 STRESS TESTING COMPLETE');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Stress test error:', error);
    process.exit(1);
  }
}

runStressTests();

export {};
