/**
 * Database Connection - Universal PostgreSQL v2.0
 * 
 * Production-ready PostgreSQL connection supporting:
 * - Supabase (PostgreSQL)
 * - AWS RDS (PostgreSQL/Aurora)
 * - Neon (Serverless PostgreSQL)
 * - PlanetScale (MySQL-compatible, needs adapter)
 * - Any standard PostgreSQL
 * 
 * Features:
 * - Connection pooling
 * - SSL support (auto-detected)
 * - Error handling & reconnection
 * - Health checks
 * 
 * @version 2.0.0
 * @database PostgreSQL via node-postgres
 * @adaptable true - Works with any PostgreSQL provider
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "@shared/schema";

let pool: pkg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Detect database provider from connection string
function detectProvider(url: string): string {
  if (url.includes('supabase.co')) return 'supabase';
  if (url.includes('rds.amazonaws.com')) return 'aws-rds';
  if (url.includes('neon.tech')) return 'neon';
  if (url.includes('cockroachlabs.cloud')) return 'cockroachdb';
  if (url.includes('railway.app')) return 'railway';
  if (url.includes('render.com')) return 'render';
  return 'postgresql';
}

// Get SSL config based on provider and environment
function getSSLConfig(provider: string): boolean | { rejectUnauthorized: boolean } {
  // Development without SSL
  if (process.env.NODE_ENV === 'development' && process.env.DB_SSL !== 'true') {
    return false;
  }
  
  // Provider-specific SSL settings
  switch (provider) {
    case 'supabase':
    case 'neon':
    case 'railway':
    case 'render':
      // These providers require SSL
      return { rejectUnauthorized: false };
    case 'aws-rds':
      // AWS RDS - use SSL in production
      return process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false;
    default:
      // Standard PostgreSQL - SSL in production
      return process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false;
  }
}

function getPool(): pkg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set. Use SQLite mode for development.");
    }
    
    const provider = detectProvider(process.env.DATABASE_URL);
    const sslConfig = getSSLConfig(provider);
    
    console.log(`[DB] Connecting to ${provider} database...`);
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: parseInt(process.env.DB_POOL_SIZE || "5", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
      // Attempt to reconnect on fatal errors
      if (err.message.includes('Connection terminated')) {
        pool = null;
        dbInstance = null;
      }
    });
    
    pool.on('connect', () => {
      console.log(`[DB] Connected to ${provider}`);
    });
  }
  return pool;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!dbInstance) {
      dbInstance = drizzle(getPool(), { schema });
    }
    return (dbInstance as any)[prop];
  }
});

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const testPool = getPool();
    const client = await testPool.connect();
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
