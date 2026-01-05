/**
 * Session Management Load Test
 * 
 * Tests session handling under concurrent user load:
 * - Session creation
 * - Session persistence
 * - Session isolation
 * - Concurrent authenticated requests
 * 
 * Run with: npx tsx tests/load/session-test.ts
 */

const API_BASE = process.env.API_URL || 'http://localhost:5000';
const CONCURRENT_SESSIONS = 50;

interface SessionTestResult {
  userId: number;
  signupSuccess: boolean;
  loginSuccess: boolean;
  sessionValid: boolean;
  authenticatedRequestSuccess: boolean;
  logoutSuccess: boolean;
  sessionCookie?: string;
  errors: string[];
}

// Generate unique test user
function generateUser(index: number): { email: string; password: string } {
  return {
    email: `session-test-${Date.now()}-${index}@test.local`,
    password: `SessionTest123!${index}`,
  };
}

// Test complete session lifecycle for one user
async function testUserSession(userId: number): Promise<SessionTestResult> {
  const result: SessionTestResult = {
    userId,
    signupSuccess: false,
    loginSuccess: false,
    sessionValid: false,
    authenticatedRequestSuccess: false,
    logoutSuccess: false,
    errors: [],
  };

  const user = generateUser(userId);
  let sessionCookie = '';

  try {
    // 1. Sign up
    const signupResponse = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    result.signupSuccess = signupResponse.ok || signupResponse.status === 409;
    if (!result.signupSuccess && signupResponse.status !== 429) {
      result.errors.push(`Signup failed: ${signupResponse.status}`);
    }

    // 2. Login
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      credentials: 'include',
    });
    
    result.loginSuccess = loginResponse.ok;
    
    // Extract session cookie
    const setCookie = loginResponse.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
      result.sessionCookie = sessionCookie;
    }

    if (!result.loginSuccess && loginResponse.status !== 429) {
      result.errors.push(`Login failed: ${loginResponse.status}`);
    }

    // 3. Verify session with authenticated request
    if (sessionCookie) {
      const meResponse = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 
          'Cookie': sessionCookie,
        },
      });
      result.sessionValid = meResponse.ok;
      
      // 4. Make authenticated API request
      const projectsResponse = await fetch(`${API_BASE}/api/projects`, {
        headers: { 
          'Cookie': sessionCookie,
        },
      });
      result.authenticatedRequestSuccess = projectsResponse.ok;
    }

    // 5. Logout
    if (sessionCookie) {
      const logoutResponse = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 
          'Cookie': sessionCookie,
        },
      });
      result.logoutSuccess = logoutResponse.ok || logoutResponse.status === 302;
    }

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

// Test session isolation (ensure users can't access each other's data)
async function testSessionIsolation(): Promise<void> {
  console.log('\n🔒 SESSION ISOLATION TEST');
  console.log('='.repeat(50));

  const user1 = generateUser(9001);
  const user2 = generateUser(9002);

  // Create both users
  await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user1),
  });
  await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user2),
  });

  // Login user1
  const login1 = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user1),
  });
  const cookie1 = login1.headers.get('set-cookie')?.split(';')[0] || '';

  // Login user2
  const login2 = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user2),
  });
  const cookie2 = login2.headers.get('set-cookie')?.split(';')[0] || '';

  // Verify each user gets their own session
  if (cookie1 && cookie2 && cookie1 !== cookie2) {
    console.log('✅ Sessions are unique per user');
  } else {
    console.log('⚠️ Session isolation issue detected');
  }

  // Verify user1's cookie doesn't give access to user2's data
  // (This would require user-specific data endpoints to fully test)
  console.log('✅ Session isolation test complete');
}

// Check if server is using mock database
async function checkMockDatabase(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    return data?.database?.includes('Mock') || data?.database?.includes('SQLite');
  } catch {
    return false;
  }
}

// Main test runner
async function runSessionTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              SESSION MANAGEMENT LOAD TEST                  ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Target: ${API_BASE.padEnd(49)}║`);
  console.log(`║ Concurrent Sessions: ${CONCURRENT_SESSIONS.toString().padEnd(36)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check for mock database
  const isMockDb = await checkMockDatabase();
  if (isMockDb) {
    console.log('\n⚠️  WARNING: Server is using Mock/SQLite database');
    console.log('   Session tests require PostgreSQL for accurate results.');
    console.log('   Set DATABASE_URL environment variable for production testing.\n');
  }

  console.log('\n🔄 Testing concurrent session lifecycle...');
  console.log('  (signup → login → verify → request → logout)');

  const start = performance.now();
  
  // Run concurrent session tests
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_SESSIONS }, (_, i) => testUserSession(i))
  );

  const duration = performance.now() - start;

  // Analyze results
  const signupSuccess = results.filter(r => r.signupSuccess).length;
  const loginSuccess = results.filter(r => r.loginSuccess).length;
  const sessionValid = results.filter(r => r.sessionValid).length;
  const authRequestSuccess = results.filter(r => r.authenticatedRequestSuccess).length;
  const logoutSuccess = results.filter(r => r.logoutSuccess).length;
  const withErrors = results.filter(r => r.errors.length > 0);

  console.log('\n' + '='.repeat(60));
  console.log('📊 SESSION TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Users Tested:        ${CONCURRENT_SESSIONS}`);
  console.log(`Test Duration:             ${(duration / 1000).toFixed(2)}s`);
  console.log('');
  console.log('Lifecycle Stage Results:');
  console.log(`  Signup Success:          ${signupSuccess}/${CONCURRENT_SESSIONS} (${((signupSuccess/CONCURRENT_SESSIONS)*100).toFixed(0)}%)`);
  console.log(`  Login Success:           ${loginSuccess}/${CONCURRENT_SESSIONS} (${((loginSuccess/CONCURRENT_SESSIONS)*100).toFixed(0)}%)`);
  console.log(`  Session Valid:           ${sessionValid}/${CONCURRENT_SESSIONS} (${((sessionValid/CONCURRENT_SESSIONS)*100).toFixed(0)}%)`);
  console.log(`  Auth Request Success:    ${authRequestSuccess}/${CONCURRENT_SESSIONS} (${((authRequestSuccess/CONCURRENT_SESSIONS)*100).toFixed(0)}%)`);
  console.log(`  Logout Success:          ${logoutSuccess}/${CONCURRENT_SESSIONS} (${((logoutSuccess/CONCURRENT_SESSIONS)*100).toFixed(0)}%)`);

  if (withErrors.length > 0) {
    console.log('\n⚠️ Errors encountered:');
    const errorCounts: Record<string, number> = {};
    withErrors.forEach(r => {
      r.errors.forEach(e => {
        errorCounts[e] = (errorCounts[e] || 0) + 1;
      });
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`  ${error}: ${count} occurrences`);
    });
  }

  // Run isolation test
  await testSessionIsolation();

  // Overall assessment
  console.log('\n' + '='.repeat(60));
  const overallSuccess = (signupSuccess + loginSuccess + sessionValid + authRequestSuccess + logoutSuccess) / (CONCURRENT_SESSIONS * 5) * 100;
  
  if (overallSuccess >= 90) {
    console.log('✅ SESSION MANAGEMENT TEST PASSED');
    console.log('   System handles 50 concurrent sessions well');
  } else if (overallSuccess >= 70) {
    console.log('⚠️ SESSION MANAGEMENT TEST WARNING');
    console.log('   Some session handling issues under load');
  } else {
    console.log('❌ SESSION MANAGEMENT TEST FAILED');
    console.log('   Significant session handling issues detected');
  }
}

runSessionTests();

export {};
