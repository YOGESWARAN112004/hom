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
const connectionString = (process.env.DATABASE_URL || '').replace(/\?sslmode=require/, '');
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Enable SSL for remote databases (cloud providers like Railway, Render, Fly.io, RDS, etc.)
// Most cloud databases use self-signed certificates that require rejectUnauthorized: false
// You can override this by setting DB_SSL_REJECT_UNAUTHORIZED=true in environment variables
const shouldRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

const connectionConfig: pg.PoolConfig = {
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
};

export const pool = new Pool(connectionConfig);

export const db = drizzle(pool, { schema });
