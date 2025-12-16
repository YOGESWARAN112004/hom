import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse DATABASE_URL and add SSL configuration
const connectionString = process.env.DATABASE_URL || '';
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// #region agent log
console.log('[DEBUG] DATABASE_URL check:', { hasConnectionString: !!connectionString, connectionStringLength: connectionString.length, isLocalhost, containsLocalhost: connectionString.includes('localhost'), contains127: connectionString.includes('127.0.0.1') });
fetch('http://127.0.0.1:7243/ingest/76c703cf-1ac0-4be5-8ef8-afd8e3be4154', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'db.ts:14', message: 'DATABASE_URL check', data: { hasConnectionString: !!connectionString, connectionStringLength: connectionString.length, isLocalhost, containsLocalhost: connectionString.includes('localhost'), contains127: connectionString.includes('127.0.0.1') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
// #endregion

// Enable SSL for remote databases (cloud providers like Railway, Render, Fly.io, RDS, etc.)
// Most cloud databases use self-signed certificates that require rejectUnauthorized: false
// You can override this by setting DB_SSL_REJECT_UNAUTHORIZED=true in environment variables
const shouldRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

// #region agent log
console.log('[DEBUG] SSL config variables:', { shouldRejectUnauthorized, dbSslRejectEnv: process.env.DB_SSL_REJECT_UNAUTHORIZED, isLocalhost, willSetSsl: !isLocalhost });
fetch('http://127.0.0.1:7243/ingest/76c703cf-1ac0-4be5-8ef8-afd8e3be4154', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'db.ts:20', message: 'SSL config variables', data: { shouldRejectUnauthorized, dbSslRejectEnv: process.env.DB_SSL_REJECT_UNAUTHORIZED, isLocalhost, willSetSsl: !isLocalhost }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
// #endregion

const connectionConfig: pg.PoolConfig = {
  connectionString,
  ssl: !isLocalhost ? {
    rejectUnauthorized: shouldRejectUnauthorized, // false by default (allows self-signed certificates for cloud DBs), true if DB_SSL_REJECT_UNAUTHORIZED=true
  } : undefined,
};

// #region agent log
console.log('[DEBUG] Final connectionConfig:', { hasSsl: !!connectionConfig.ssl, sslRejectUnauthorized: (connectionConfig.ssl as any)?.rejectUnauthorized, sslConfig: JSON.stringify(connectionConfig.ssl) });
fetch('http://127.0.0.1:7243/ingest/76c703cf-1ac0-4be5-8ef8-afd8e3be4154', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'db.ts:26', message: 'Final connectionConfig', data: { hasSsl: !!connectionConfig.ssl, sslRejectUnauthorized: (connectionConfig.ssl as any)?.rejectUnauthorized, sslConfig: connectionConfig.ssl }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
// #endregion

export const pool = new Pool(connectionConfig);

// #region agent log
console.log('[DEBUG] Pool created:', { poolCreated: !!pool });
fetch('http://127.0.0.1:7243/ingest/76c703cf-1ac0-4be5-8ef8-afd8e3be4154', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'db.ts:30', message: 'Pool created', data: { poolCreated: !!pool }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
// #endregion

export const db = drizzle(pool, { schema });
