import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export let pool: any = null;
export let db: any = null;

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("DATABASE_URL must be set in production.");
  } else {
    console.warn("⚠️ DATABASE_URL not set. Falling back to In-Memory storage for local development.");
  }
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}
