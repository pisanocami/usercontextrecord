import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSQLite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const { Pool } = pg;

// Check if we should use SQLite as fallback
const useSQLite = !process.env.DATABASE_URL || process.env.FORCE_SQLITE === 'true';

// Database instances
let db: any;
let connection: any;

if (useSQLite) {
  console.log("Using SQLite database (fallback mode)");

  // SQLite database path
  const dbPath = process.env.SQLITE_DB_PATH || join(process.cwd(), "data", "db.sqlite");

  // Ensure the data directory exists
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  db = drizzleSQLite(sqlite, { schema });
  connection = sqlite;
} else {
  console.log("Using PostgreSQL database");

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  connection = pool;
}

export { db, connection };
