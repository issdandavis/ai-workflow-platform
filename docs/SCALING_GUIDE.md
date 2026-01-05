# Scaling Guide: 50+ Concurrent Users

This guide covers configuration and infrastructure recommendations for handling 50+ concurrent users.

## Current Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Express   │────▶│  PostgreSQL │
│   (React)   │     │   Server    │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Session   │
                    │    Store    │
                    └─────────────┘
```

## Configuration Checklist

### 1. Environment Variables

```bash
# Required for production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<random-64-char-string>

# Optional tuning
SESSION_TTL_DAYS=7
BCRYPT_SALT_ROUNDS=10
```

### 2. Database Configuration

#### PostgreSQL Connection Pool

The default `pg` driver creates connections on demand. For 50+ users, configure pooling:

```typescript
// In server/storage.ts or db config
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect
});
```

#### Recommended Pool Sizes

| Concurrent Users | Pool Size | Notes |
|-----------------|-----------|-------|
| 10-25           | 5-10      | Default works |
| 25-50           | 10-20     | Increase pool |
| 50-100          | 20-30     | Monitor closely |
| 100+            | 30-50     | Consider read replicas |

### 3. Session Store

The app uses `connect-pg-simple` for PostgreSQL session storage in production.

```typescript
// Already configured in server/sessionAuth.ts
const PgStore = connectPg(session);
store = new PgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: SESSION_TTL_MS / 1000,
  tableName: "sessions",
});
```

#### Session Table Index

Add index for faster session lookups:

```sql
CREATE INDEX idx_sessions_expire ON sessions(expire);
CREATE INDEX idx_sessions_sid ON sessions(sid);
```

### 4. Rate Limiting

Current limits (in `server/middleware/rateLimiter.ts`):

| Limiter | Window | Max Requests | Notes |
|---------|--------|--------------|-------|
| API | 15 min | 100 | General endpoints |
| Auth | 15 min | 5 | Login/signup |
| Agent | 1 min | 10 | AI operations |
| Autonomy | 1 min | 5 | Auto-actions |
| DevMode | 1 min | 20 | File operations |

#### Adjusting for Load Testing

Temporarily increase limits:

```typescript
// Development multiplier is 10x
const isDev = process.env.NODE_ENV === "development";
const multiplier = isDev ? 10 : 1;
```

### 5. Server Configuration

#### Express Settings

```typescript
// Trust proxy for accurate IP detection behind load balancer
app.set("trust proxy", 1);

// Increase body parser limits if needed
app.use(express.json({ limit: '10mb' }));
```

#### Graceful Shutdown

Already implemented in `server/index.ts`:

```typescript
process.on("SIGTERM", async () => {
  // Stops accepting new connections
  // Waits for existing requests to complete
  // Closes database connections
});
```

## Scaling Strategies

### Vertical Scaling (Single Server)

For 50-100 users on a single server:

1. **CPU**: 2-4 cores
2. **RAM**: 4-8 GB
3. **Database**: Dedicated PostgreSQL instance
4. **SSD**: Fast disk for database

### Horizontal Scaling (Multiple Servers)

For 100+ users:

```
                    ┌─────────────┐
                    │    Load     │
                    │  Balancer   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Server 1   │ │  Server 2   │ │  Server 3   │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │   (shared)  │
                    └─────────────┘
```

Requirements:
- **Sticky sessions** OR **shared session store** (PostgreSQL already handles this)
- **Shared database** for all instances
- **Load balancer** (nginx, HAProxy, cloud LB)

## Monitoring

### Key Metrics to Track

1. **Response Time**: P95 should be <500ms
2. **Error Rate**: Should be <1%
3. **Active Sessions**: Monitor for leaks
4. **Database Connections**: Pool utilization
5. **Memory Usage**: Watch for leaks

### Health Check Endpoint

```bash
curl http://localhost:5000/api/health
```

## Load Testing Commands

```bash
# Basic load test (50 concurrent users)
npm run test:load

# Stress test (find breaking point)
npm run test:stress

# Session management test
npm run test:session

# All load tests
npm run test:all-load
```

## Troubleshooting

### High Response Times

1. Check database query performance
2. Add database indexes
3. Increase connection pool
4. Enable query caching

### Session Errors

1. Verify `SESSION_SECRET` is set
2. Check PostgreSQL session table exists
3. Monitor session table size

### Rate Limit Issues

1. Check client IP detection (proxy settings)
2. Adjust limits for legitimate traffic
3. Implement user-based limits for authenticated users

### Memory Issues

1. Monitor Node.js heap usage
2. Check for memory leaks in sessions
3. Implement session cleanup job

## Production Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong `SESSION_SECRET` (64+ chars)
- [ ] PostgreSQL database (not SQLite)
- [ ] SSL/TLS enabled
- [ ] Rate limits configured
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Monitoring in place
- [ ] Backup strategy for database
- [ ] Load testing passed
