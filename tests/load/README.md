# Load Testing Suite

This directory contains load testing scripts for validating the application's ability to handle 50+ concurrent users.

## Prerequisites

1. **Server Running**: Ensure the server is running on `http://localhost:5000` (or set `API_URL` env var)
2. **Database**: PostgreSQL recommended for production load testing (SQLite may bottleneck)
3. **Node.js**: Version 18+ with native fetch support

## Test Scripts

### 1. Load Test (`load-test.ts`)
Tests basic concurrent operations:
- 50 concurrent sign-ups
- 50 concurrent logins
- Health check under load
- Mixed API operations
- Sustained load over time

```bash
npx tsx tests/load/load-test.ts
```

### 2. Stress Test (`stress-test.ts`)
Pushes system beyond normal limits:
- Gradual load increase (10 → 200 concurrent)
- Burst test (sudden traffic spike)
- Sustained high load (30 seconds)

```bash
npx tsx tests/load/stress-test.ts
```

### 3. Session Test (`session-test.ts`)
Tests session management:
- 50 concurrent session lifecycles
- Session isolation verification
- Authenticated request handling

```bash
npx tsx tests/load/session-test.ts
```

## Running All Tests

```bash
npm run test:load
```

## Configuration

Set environment variables to customize:

```bash
# Target different server
API_URL=https://staging.example.com npx tsx tests/load/load-test.ts

# Adjust concurrent users (modify in script)
CONCURRENT_USERS=100
```

## Interpreting Results

### Success Criteria
- **Pass**: 95%+ success rate, <500ms avg response time
- **Warning**: 80-95% success rate, or >500ms avg response time
- **Fail**: <80% success rate, or >2000ms avg response time

### Common Issues

1. **High 429 (Rate Limited) responses**
   - Expected behavior under load
   - Adjust rate limits in `server/middleware/rateLimiter.ts` for testing

2. **Connection refused errors**
   - Server not running or crashed
   - Check server logs

3. **Slow response times**
   - Database bottleneck (use PostgreSQL)
   - Increase connection pool size
   - Check for N+1 queries

4. **Session failures**
   - Memory store overflow (use PostgreSQL session store)
   - Session secret not set

## Production Recommendations

Based on load testing results, consider:

1. **Database**: Use PostgreSQL with connection pooling
2. **Sessions**: Use `connect-pg-simple` for session storage
3. **Rate Limiting**: Tune limits based on expected traffic
4. **Caching**: Add Redis for session/data caching
5. **Horizontal Scaling**: Deploy multiple instances behind load balancer
