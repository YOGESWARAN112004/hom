import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// For RDS, we need to handle SSL certificates
// Add sslmode=require to the connection string if it's RDS
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl.includes('rds.amazonaws.com') && !databaseUrl.includes('sslmode')) {
  // Add sslmode parameter
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=require';
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: databaseUrl.includes('rds.amazonaws.com') ? {
      rejectUnauthorized: false, // Required for RDS self-signed certificates
    } : undefined,
  },
});
